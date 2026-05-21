"""AI Notice Analysis Router"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum

router = APIRouter()

class NoticeSeverity(str, Enum):
    info = "info"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"

class NoticeAnalysisRequest(BaseModel):
    notice_id: Optional[str] = None
    notice_text: Optional[str] = None
    notice_type: Optional[str] = None

class ActionItem(BaseModel):
    action: str
    due_date: Optional[str] = None
    priority: str
    description: str

class NoticeAnalysis(BaseModel):
    summary: str
    severity: NoticeSeverity
    risk_amount: float = 0.0
    due_date: Optional[str] = None
    response_deadline_days: int
    action_items: List[ActionItem]
    legal_references: List[str]
    confidence: float
    draft_response: Optional[str] = None

@router.post("/analyze-notice", response_model=NoticeAnalysis)
async def analyze_notice(request: NoticeAnalysisRequest):
    """Analyze a GST/ Tax notice and provide actionable insights."""
    from services.notice_analyzer import analyze_notice
    
    if not request.notice_id and not request.notice_text:
        raise HTTPException(400, "Either notice_id or notice_text required")
    
    analysis = await analyze_notice(
       Notice_id=request.notice_id,
notice_text=request.notice_text,
notice_type=request.notice_type,
    )
    return analysis

@router.get("/notice-types")
async def get_notice_types():
    """Get supported notice types."""
    return {
        "types": [
            {"id": "gstr1_not_filed", "name": "GSTR-1 Not Filed"},
            {"id": "gstr3b_not_filed", "name": "GSTR-3B Not Filed"},
            {"id": "tax_demand", "name": "Tax Demand"},
            {"id": "ITC_mismatch", "name": "ITC Mismatch"},
            {"id": "scrutiny", "name": "Scrutiny"},
            {"id": "audit", "name": "Audit"},
        ]
    }

@router.post("/generate-response")
async def generate_response(
    notice_id: str,
    tone: str = "formal",
):
    """Generate draft response to a notice."""
    from services.notice_analyzer import generate_notice_response
    
    response = await generate_notice_response(notice_id, tone)
    return {"response": response}