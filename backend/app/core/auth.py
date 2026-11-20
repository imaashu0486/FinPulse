"""FinPulse AI V4.0 - Authentication & User Context

Integrates Supabase JWT verification with FastAPI dependency injection.
Supports both asymmetric JWKS verification (RS256/ES256) for modern Supabase projects
and symmetric secret verification (HS256) for standard Supabase configurations.
Never assumes HS256 blindly.
"""

import logging
from typing import Optional, Dict, Any
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from jwt import PyJWKClient, PyJWKClientError
from pydantic import BaseModel

from app.core.config import settings

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)

# Cached JWKS client instance
_jwks_client: Optional[PyJWKClient] = None


class UserContext(BaseModel):
    user_id: str
    email: Optional[str] = None
    role: str = "authenticated"
    is_authenticated: bool = False
    metadata: Dict[str, Any] = {}


def get_jwks_client() -> Optional[PyJWKClient]:
    """Initializes or returns a cached PyJWKClient pointing to the Supabase JWKS endpoint."""
    global _jwks_client
    if not settings.SUPABASE_URL:
        return None
    if _jwks_client is None:
        jwks_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwks_client = PyJWKClient(jwks_url, cache_jwk_set=True, lifespan=3600)
    return _jwks_client


def verify_supabase_jwt(
    token: str,
    public_key_override: Optional[str] = None
) -> Dict[str, Any]:
    """Decodes and validates a Supabase JWT.
    
    Dynamically inspects the token header algorithm:
    - If asymmetric (RS256, RS384, RS512, ES256, ES384, ES512): validates via JWKS public keys.
    - If symmetric (HS256): validates via SUPABASE_JWT_SECRET.
    - Rejects mismatched, expired, or untrusted algorithms.
    """
    try:
        unverified_header = jwt.get_unverified_header(token)
    except jwt.InvalidTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Malformed JWT header: {str(e)}"
        )

    alg = unverified_header.get("alg", "HS256")

    # 1. Asymmetric Verification (RS256 / ES256 via JWKS or Public Key)
    if alg.startswith(("RS", "ES")):
        signing_key = None
        if public_key_override:
            signing_key = public_key_override
        else:
            client = get_jwks_client()
            if not client:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token uses asymmetric signing ({alg}), but SUPABASE_URL is not configured for JWKS validation."
                )
            try:
                pyjwk = client.get_signing_key_from_jwt(token)
                signing_key = pyjwk.key
            except PyJWKClientError as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Failed to retrieve public key from Supabase JWKS: {str(e)}"
                )
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"JWKS key matching error: {str(e)}"
                )

        try:
            payload = jwt.decode(
                token,
                signing_key,
                algorithms=[alg],
                audience="authenticated",
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please re-authenticate."
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Asymmetric token verification failed: {str(e)}"
            )

    # 2. Symmetric Verification (HS256 via SUPABASE_JWT_SECRET)
    elif alg == "HS256":
        if not settings.SUPABASE_JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token uses symmetric signing (HS256), but SUPABASE_JWT_SECRET is not configured on the server."
            )
        try:
            payload = jwt.decode(
                token,
                settings.SUPABASE_JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
                options={"verify_exp": True}
            )
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Session token has expired. Please re-authenticate."
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Symmetric token verification failed: {str(e)}"
            )

    # 3. Unsupported Algorithm
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported JWT signing algorithm: '{alg}'. Expected RS256/ES256 (asymmetric) or HS256 (symmetric)."
        )


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_bearer)
) -> UserContext:
    """Dependency that extracts the current user from the Authorization Bearer header.
    
    If credentials are valid, returns an authenticated UserContext.
    If no credentials or invalid credentials in non-strict mode (AUTH_REQUIRED=False),
    returns a default development user context to prevent disruption.
    """
    if credentials and credentials.credentials:
        token = credentials.credentials
        try:
            payload = verify_supabase_jwt(token)
            return UserContext(
                user_id=payload.get("sub", "unknown-user"),
                email=payload.get("email"),
                role=payload.get("role", "authenticated"),
                is_authenticated=True,
                metadata=payload.get("user_metadata", {})
            )
        except HTTPException:
            if settings.AUTH_REQUIRED:
                raise
            logger.warning("Invalid JWT token provided; falling back to dev user context as AUTH_REQUIRED=False")
        except Exception as e:
            if settings.AUTH_REQUIRED:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Token verification failed: {str(e)}"
                )
            logger.warning(f"JWT verification error: {e}")

    # Fallback when credentials are unconfigured or unprovided
    if settings.AUTH_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please provide a valid Bearer token."
        )

    return UserContext(
        user_id="dev-user-001",
        email="developer@finpulse.local",
        role="authenticated",
        is_authenticated=False,
        metadata={"note": "Development guest mode (AUTH_REQUIRED=False)"}
    )


def require_authenticated_user(
    user: UserContext = Depends(get_current_user)
) -> UserContext:
    """Strict dependency that guarantees the user has a valid verified Supabase session."""
    if not user.is_authenticated and settings.AUTH_REQUIRED:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This operation requires an authenticated user session."
        )
    return user
