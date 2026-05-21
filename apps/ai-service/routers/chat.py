"""AI Chat Router"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List

router = APIRouter()

class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    business_id: Optional[str] = None
    mode: str = Field(default="business_owner", description="'business_owner' | 'accountant' | 'ca' | 'auditor' | 'cfo'")
    language: str = Field(default="en", description="'en' | 'hi' | 'te'")
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    message: str
    sources: List[dict] = []
    confidence: float = 0.0
    conversation_id: str
    requires_action: bool = False
    suggested_actions: List[str] = []

class FeedbackRequest(BaseModel):
    conversation_id: str
    rating: int = Field(..., ge=1, le=5)
    feedback: Optional[str] = None

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Chat with AI compliance assistant.
    Uses RAG to provide source-backed answers.
    """
    from main import get_llm_service, get_rag_service
    
    llm = get_llm_service()
    rag = get_rag_service()
    
    if not llm:
        raise HTTPException(503, "AI service not initialized")
    
    # Get conversation history (would come from DB in production)
    conversation_history = []
    
    # Retrieve relevant context
    context = await rag.retrieve(request.message, limit=3) if rag else []
    
    # Generate response
    try:
        response = await llm.generate(
            message=request.message,
            context=context,
            mode=request.mode,
            language=request.language,
            conversation_history=conversation_history,
        )
        
        return ChatResponse(
            message=response["message"],
            sources=response.get("sources", []),
            confidence=response.get("confidence", 0.8),
            conversation_id=request.conversation_id or gen_uuid(),
            requires_action=response.get("requires_action", False),
            suggested_actions=response.get("suggested_actions", []),
        )
    except Exception as e:
        raise HTTPException(500, f"Failed to generate response: {str(e)}")

@router.post("/feedback")
async def give_feedback(request: FeedbackRequest):
    """Submit feedback on AI response."""
    return {"success": True}

@router.get("/insights")
async def get_insights(business_id: str):
    """Get AI-generated compliance insights."""
    from main import get_llm_service
    
    llm = get_llm_service()
    if not llm:
        raise HTTPException(503, "AI service not initialized")
    
    insights = await llm.generate_insights(business_id)
    return insights

@router.get("/suggestions")
async def get_suggestions(business_id: str, category: str = "general"):
    """Get AI suggestions."""
    from main import get_llm_service
    
    llm = get_llm_service()
    if not llm:
        raise HTTPException(503, "AI service not initialized")
    
    suggestions = await llm.get_suggestions(business_id, category)
    return {"suggestions": suggestions}

def gen_uuid() -> str:
    import uuid
    return str(uuid.uuid4())
