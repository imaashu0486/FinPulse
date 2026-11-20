import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.services.report.report_service import report_service, REPORTS_DIR

router = APIRouter()

class ReportRequest(BaseModel):
    symbol: str

@router.post("/generate")
def generate_research_report(req: ReportRequest):
    """Generates an institutional 11-section equity research dossier with download link."""
    try:
        return report_service.generate_report(symbol=req.symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate research dossier: {str(e)}")

@router.get("/download/{filename}")
def download_research_report(filename: str):
    """Downloads a generated .docx research dossier."""
    safe_filename = os.path.basename(filename)
    path = os.path.join(REPORTS_DIR, safe_filename)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Requested report file not found on server.")
    return FileResponse(
        path=path,
        filename=safe_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )
