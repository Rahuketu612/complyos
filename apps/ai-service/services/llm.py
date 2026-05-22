"""LLM Service - Core AI Generation"""

import os
import json
from typing import Dict, List, Any, Optional
import openai
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate

class LLMService:
    """Main LLM service for compliance queries."""
    
    def __init__(self):
        self.client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("OPENAI_MODEL", "gpt-4-turbo-preview")
        self._system_prompts = {
            "business_owner": self._get_business_owner_prompt(),
            "accountant": self._get_accountant_prompt(),
            "ca": self._get_ca_prompt(),
            "auditor": self._get_auditor_prompt(),
            "cfo": self._get_cfo_prompt(),
        }
    
    async def generate(
        self,
        message: str,
        context: List[Dict],
        mode: str = "business_owner",
        language: str = "en",
        conversation_history: List[Dict] = [],
    ) -> Dict[str, Any]:
        """Generate a response to a compliance query."""
        
        # Build system prompt
        system_prompt = self._system_prompts.get(mode, self._system_prompts["business_owner"])
        
        # Add language instruction
        if language != "en":
            system_prompt += f"\nRespond in {language}."
        
        # Build context from retrieved documents
        context_text = ""
        sources = []
        if context:
            context_text = "\n\n".join([
                f"[Source {i+1}]: {doc.get('content', '')[:500]}"
                for i, doc in enumerate(context)
            ])
            sources = [{"source_id": i+1, "title": doc.get("title", "")} for i, doc in enumerate(context)]
        
        # Build conversation for context window
        messages = [
            {"role": "system", "content": system_prompt + f"\n\nRelevant Information:\n{context_text}"},
        ]
        
        # Add history
        for msg in conversation_history[-5:]:
            messages.append(msg)
        
        # Add current message
        messages.append({"role": "user", "content": message})
        
        # Generate
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=0.3,
                max_tokens=1500,
                stop=["<|end|>"],
            )
            
            output = response.choices[0].message.content
            
            # Check for action requirements
            requires_action = self._check_requires_action(output)
            suggested_actions = self._extract_suggested_actions(output)
            
            return {
                "message": output,
                "sources": sources,
                "confidence": self._estimate_confidence(context, output),
                "requires_action": requires_action,
                "suggested_actions": suggested_actions,
            }
        except Exception as e:
            return {
                "message": f"I apologize, but I encountered an issue: {str(e)}. Please try again.",
                "sources": [],
                "confidence": 0.0,
                "requires_action": False,
                "suggested_actions": [],
            }
    
    async def generate_insights(self, business_id: str) -> Dict[str, Any]:
        """Generate compliance insights for a business."""
        prompt = f"""Analyze the compliance status of business {business_id} and provide:
1. Current compliance health summary
2. Key risks identified
3. Recommended actions
4. Upcoming compliance requirements

Be specific and actionable."""
        
        # Would fetch from DB in production
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "system", "content": "You are a compliance expert. Provide actionable insights."},
                     {"role": "user", "content": prompt}],
            temperature=0.3,
        )
        
        return {
            "insights": response.choices[0].message.content,
            "generated_at": self._now_iso(),
        }
    
    async def get_suggestions(self, business_id: str, category: str) -> List[str]:
        """Get AI suggestions for improvements."""
        prompt = f"Provide 3-5 specific suggestions to improve compliance for category: {category}"
        
        response = await self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a compliance advisor. Provide concise suggestions."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.5,
        )
        
        suggestions = response.choices[0].message.content
        return [s.strip() for s in suggestions.split("\n") if s.strip()]
    
    # Prompts
    def _get_business_owner_prompt(self) -> str:
        return """You are a compliance expert helping a business owner in India.
Your role:
- Explain compliance requirements in simple terms
- Answer questions about GST, EPF, ESIC, TDS accurately
- Never fabricate compliance status - cite sources when available
- Always provide disclaimers for important decisions
- Suggest consulting a CA for complex matters

Be helpful, accurate, and transparent about limitations."""

    def _get_accountant_prompt(self) -> str:
        return """You are a compliance expert helping an accountant.
Your role:
- Provide detailed technical guidance
- Explain GST filing requirements, due dates
- Help with reconciliation issues
- Address ITC concerns
- Cite relevant sections of CGST Act, Rules

Be accurate and detailed."""

    def _get_ca_prompt(self) -> str:
        return """You are a senior CA advisor.
Your role:
- Provide expert-level guidance
- Address complex tax matters
- Help with notices, assessments
- Suggest strategic approaches
- Reference relevant legal provisions

Be thorough and technically accurate."""

    def _get_auditor_prompt(self) -> str:
        return """You are a compliance auditor.
Your role:
- Help audit preparation
- Identify compliance gaps
- Suggest evidence requirements
- Highlight risks

Be objective and thorough."""

    def _get_cfo_prompt(self) -> str:
        return """You are a CFO advisor.
Your role:
- Focus on financial impact
- Analyze cost of non-compliance
- Prioritize compliance investments
- Risk-opportunity balance

Be strategic and financially focused."""
    
    # Helpers
    def _check_requires_action(self, message: str) -> bool:
        action_keywords = ["must file", "file immediately", "due date", "deadline", "submit", "pay"]
        message_lower = message.lower()
        return any(kw in message_lower for kw in action_keywords)
    
    def _extract_suggested_actions(self, message: str) -> List[str]:
        # Would parse action items from message
        return []
    
    def _estimate_confidence(self, context: List, response: str) -> float:
        if not context:
            return 0.5
        if len(response) < 50:
            return 0.3
        return min(0.95, 0.5 + (len(context) * 0.1))
    
    def _now_iso(self) -> str:
        from datetime import datetime
        return datetime.utcnow().isoformat()


# Fallback functions for routers
async def generate_compliance_advice(question: str, business_id: str) -> Dict:
    """Fallback for compliance router."""
    prompt = f"Question: {question}"
    
    try:
        client = openai.AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = await client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[
                {"role": "system", "content": "Expert compliance advice."},
                {"role": "user", "content": prompt}
            ],
        )
        
        return {
            "advice": response.choices[0].message.content,
            "confidence": 0.8,
        }
    except:
        return {"advice": "Unable to generate advice at this time.", "confidence": 0.0}