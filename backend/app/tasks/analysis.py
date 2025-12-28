"""
Analysis Celery tasks for post-call processing.
"""
import logging
from typing import Optional

from app.celery_app import celery_app
from app.tasks.base import get_task_db
from app.models.call import Call
from app.models.message import Message
from app.models.call_analysis import CallAnalysis
from app.models.elderly import Elderly
from app.services.ai_service import AIService

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.analysis.analyze_call")
def analyze_call(call_id: int):
    """
    Analyze a completed call using Claude AI.
    Creates a CallAnalysis record with summary, risk score, and concerns.
    """
    with get_task_db() as db:
        call = db.query(Call).filter(Call.id == call_id).first()
        if not call:
            logger.error(f"Call {call_id} not found for analysis")
            return {"status": "error", "message": "Call not found"}

        # Check if analysis already exists
        existing = db.query(CallAnalysis).filter(CallAnalysis.call_id == call_id).first()
        if existing:
            logger.info(f"Analysis already exists for call {call_id}")
            return {"status": "exists", "analysis_id": existing.id}

        # Get all messages for this call
        messages = db.query(Message).filter(
            Message.call_id == call_id
        ).order_by(Message.created_at).all()

        if not messages:
            logger.warning(f"No messages found for call {call_id}")
            return {"status": "no_messages"}

        # Format conversation for analysis
        conversation_text = "\n".join([
            f"{'어르신' if m.role == 'user' else 'AI'}: {m.content}"
            for m in messages
        ])

        # Get elderly info for context
        elderly = db.query(Elderly).filter(Elderly.id == call.elderly_id).first()
        elderly_context = ""
        if elderly:
            elderly_context = f"어르신 정보: {elderly.name}"
            if elderly.age:
                elderly_context += f", {elderly.age}세"
            if elderly.health_condition:
                elderly_context += f", 건강상태: {elderly.health_condition}"

        # Run analysis
        try:
            ai_service = AIService()
            analysis_result = ai_service.analyze_conversation(
                conversation=conversation_text,
                elderly_context=elderly_context,
            )
        except Exception as e:
            logger.error(f"AI analysis failed for call {call_id}: {e}")
            return {"status": "error", "message": str(e)}

        # Create analysis record
        analysis = CallAnalysis(
            call_id=call_id,
            summary=analysis_result.get("summary", ""),
            risk_score=analysis_result.get("risk_score", 0),
            concerns=analysis_result.get("concerns", ""),
            recommendations=analysis_result.get("recommendations", ""),
        )
        db.add(analysis)

        # Update elderly risk level based on score
        if elderly:
            risk_score = analysis_result.get("risk_score", 0)
            if risk_score >= 80:
                elderly.risk_level = "critical"
            elif risk_score >= 60:
                elderly.risk_level = "high"
            elif risk_score >= 40:
                elderly.risk_level = "medium"
            else:
                elderly.risk_level = "low"

        db.commit()
        logger.info(f"Analysis completed for call {call_id}: risk_score={analysis.risk_score}")

        # Send high-risk alert if needed
        if analysis.risk_score >= 60:
            from app.tasks.push import send_high_risk_alert
            send_high_risk_alert.delay(
                elderly_id=call.elderly_id,
                call_id=call_id,
                risk_score=analysis.risk_score,
                concerns=analysis.concerns,
            )

        return {
            "status": "completed",
            "analysis_id": analysis.id,
            "risk_score": analysis.risk_score,
        }


@celery_app.task(name="app.tasks.analysis.batch_analyze_pending")
def batch_analyze_pending():
    """
    Find and analyze all completed calls that don't have analysis yet.
    Useful for catch-up processing.
    """
    with get_task_db() as db:
        # Find completed calls without analysis
        calls_without_analysis = db.query(Call).filter(
            Call.status == "completed",
            ~Call.id.in_(
                db.query(CallAnalysis.call_id)
            )
        ).limit(10).all()  # Process 10 at a time

        queued = 0
        for call in calls_without_analysis:
            analyze_call.delay(call.id)
            queued += 1

        logger.info(f"Queued {queued} calls for analysis")
        return {"queued": queued}
