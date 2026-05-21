"""AI Compliance Router"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

class ComplianceQuestion(BaseModel):
    question: str
    business_id: Optional[str] = None

class ComplianceAdvice(BaseModel):
    applicable_compliances: list
    due_dates: list
    risk_level: str
    advice: str

@router.post("/advice")
async def get_compliance_advice(request: ComplianceQuestion):
    """Get applicable compliance advice."""
    from services.llm import generate_compliance_advice
    
    advice = await generate_compliance_advice(request.question, request.business_id)
    return advice

@router.get("/applicability")
async def check_applicability(
    employee_count: int,
    annual_turnover: float,
    state: str,
):
    """Check which compliances apply to a business."""
    from services.rules import check_compliance_applicability
    
    applicability = check_compliance_applicability(employee_count, annual_turnover, state)
    return applicability

@router.get("/deadlines")
async def get_deadlines(
    business_id: str,
    year: Optional[int] = None,
):
    """Get compliance deadlines."""
    from services.rules import get_upcoming_deadlines
    
    deadlines = await get_upcoming_deadlines(business_id, year)
    return deadlines