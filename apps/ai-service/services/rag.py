"""RAG Service - Retrieval-Augmented Generation"""

import os
import json
from typing import Dict, List, Any
import psycopg2
from datetime import datetime

class RAGService:
    """Retrieval-Augmented Generation service."""
    
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.embedding_model = "text-embedding-ada-002"
    
    async def retrieve(
        self,
        query: str,
        limit: int = 3,
        filters: Dict = None,
    ) -> List[Dict[str, Any]]:
        """
        Retrieve relevant documents for a query.
        """
        # Would use vector similarity search in production
        # Using semantic search via openai embeddings
        
        # For now, simulate retrieval with keyword matching
        # In production: connect to database with pgvector
        
        try:
            documents = self._simulate_search(query, limit)
            return documents
        except Exception as e:
            print(f"RAG retrieval error: {e}")
            return []
    
    def _simulate_search(self, query: str, limit: int) -> List[Dict]:
        """Simulate document search."""
        
        # Sample base knowledge - in production, database
        KNOWLEDGE = [
            {
                "title": "GST Filing Due Dates",
                "content": "GSTR-1 is due by 11th of the next month. "
                          "GSTR-3B is due by 20th (22nd for QRMP). "
                          "Late filing attracts penalty of Rs. 200 per day.",
                "category": "gst",
            },
            {
                "title": "ITC Rules",
                "content": "Input Tax Credit can be claimed on inward supplies. "
                          "Must match GSTR-2A/2B. Revisions allowed till October 31. "
                          "Blocked ITC cannot be claimed.",
                "category": "gst:itc",
            },
            {
                "title": "EPF Applicability",
                "content": "EPF applies if 20+ employees. "
                          "Employer contributes 12% of wages above Rs. 15,000. "
                          "Mandatory UAN for all employees.",
                "category": "epf",
            },
            {
                "title": "Notice Response Time",
                "content": "GST notices should be responded within 15 days. "
                          "Extend by 15 more days with proper application. "
                          "Appeals within 30 days to appellate authority.",
                "category": "gst:notice",
            },
        ]
        
        # Simple keyword matching
        query_lower = query.lower()
        scored = []
        
        for i, doc in enumerate(KNOWLEDGE):
            score = 0
            combined = (doc.get("title", "") + " " + doc.get("content", "")).lower()
            
            # Count keyword matches
            keywords = ["gst", "return", "filing", "itc", "notice", "penalty",
                      "epf", "due", "date", "compliance", "refund", "demand"]
            
            for kw in keywords:
                if kw in query_lower:
                    score += combined.count(kw)
            
            if score > 0:
                scored.append((doc, score))
        
        # Sort by relevance
        scored.sort(key=lambda x: x[1], reverse=True)
        
        return [doc for doc, score in scored[:limit]]
    
    async def index_document(self, doc: Dict) -> bool:
        """Index a document for search."""
        # Would generate embedding and store in vector DB
        return True
    
    async def get_knowledge_base(self, category: str = None) -> List[Dict]:
        """Get knowledge base articles."""
        # Would query database
        return []


async def generate_rag_context(query: str, db) -> List[Dict]:
    """Helper to generate context for RAG."""
    # Would integrate with database
    return []


class NoticeAnalyzer:
    """Analyze and classify notices."""
    
    def __init__(self):
        self.client = None
    
    async def analyze(
        self,
        notice_id: str = None,
        notice_text: str = None,
        notice_type: str = None,
    ) -> Dict:
        """Analyze a notice and extract key information."""
        
        if not notice_text and notice_id:
            # Would fetch from database
            pass
        
        # Simple analysis rules
        analysis = {
            "summary": "Notice analysis placeholder",
            "severity": "medium",
            "risk_amount": 0,
            "due_date": None,
            "response_deadline_days": 15,
            "action_items": [],
            "legal_references": [],
            "confidence": 0.8,
        }
        
        # Keywords for severity
        if notice_text:
            text_lower = notice_text.lower()
            
            if "demand" in text_lower or "tax" in text_lower:
                # Extract amounts
                import re
                amounts = re.findall(r"₹?[\d,]+(?:\.\d{2})?", notice_text)
                if amounts:
                    analysis["risk_amount"] = float(amounts[0].replace(",", ""))
                
                if "urgent" in text_lower or "immediate" in text_lower:
                    analysis["severity"] = "high"
                analysis["summary"] = "Tax demand notice received"
            
            elif "not filed" in text_lower or "non-filing" in text_lower:
                analysis["summary"] = "Non-filing notice"
                analysis["severity"] = "medium"
                analysis["action_items"] = [{
                    "action": "File the pending return immediately",
                    "priority": "high",
                    "description": "GSTR filing overdue",
                }]
            
            elif "Mismatch" in text_lower or "mismatch" in text_lower:
                analysis["summary"] = "ITC mismatch notice"
                analysis["severity"] = "medium"
                analysis["response_deadline_days"] = 30
        
        return analysis
    
    async def generate_response(
        self,
        notice_id: str,
        tone: str = "formal",
    ) -> str:
        """Generate draft response to notice."""
        # Would generate based on notice analysis
        
        templates = {
            "formal": (
                "To,\nThe Proper Officer\nDepartment of GST\n\n"
                "Subject: Response to Notice dated [DATE]\n\n"
                "Sir/Madam,\n\n"
                "With reference to the above notice, I hereby submit my response..."
            ),
            "detailed": (
                "To,\nThe Proper Officer\n\n"
                "Subject: Detailed Response - Notice Reference [REF]\n\n"
                "1. Background\n\n"
                "2. Facts of the matter\n\n"
                "3. Legal provisions applicable\n\n"
                "4. Our submission\n\n"
                "Request your kind consideration.\n\n"
                "Thanking you,\n[NAME]"
            ),
        }
        
        return templates.get(tone, templates["formal"])