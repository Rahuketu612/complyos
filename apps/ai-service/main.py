"""
COMPLYOS AI Intelligence Service

Enterprise-grade AI assistant for compliance queries.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
import os

from routers import chat, compliance, notice
from services.llm import LLMService
from services.rag import RAGService
from middleware.logging import LoggingMiddleware

app = FastAPI(
    title="COMPLYOS AI API",
    description="AI-Powered Compliance Intelligence",
    version="1.0.0",
)

# CORS
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(LoggingMiddleware)

# Initialize services
_llm_service = None
_rag_service = None

@app.on_event("startup")
async def startup():
    global _llm_service, _rag_service
    _llm_service = LLMService()
    _rag_service = RAGService()

def get_llm_service():
    return _llm_service

def get_rag_service():
    return _rag_service

# Routers
app.include_router(chat.router, prefix="/api/ai", tags=["Chat"])
app.include_router(compliance.router, prefix="/api/ai", tags=["Compliance"])
app.include_router(notice.router, prefix="/api/ai", tags=["Notice"])

# Models
class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/health")
async def health() -> HealthResponse:
    return HealthResponse(status="healthy", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "COMPLYOS AI Service", "docs": "/docs"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3005)