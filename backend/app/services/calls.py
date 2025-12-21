from sqlalchemy.orm import Session
from datetime import datetime
from app.models.call import Call
from app.models.message import Message
from app.models.call_analysis import CallAnalysis
from app.models.elderly import Elderly
from app.schemas.call import CallCreateRequest
from app.core.exceptions import NotFoundError, ForbiddenError


class CallService:
    @staticmethod
    def start_call(db: Session, call_data: CallCreateRequest, caregiver_id: int):
        # 어르신이 해당 caregiver의 것인지 확인
        elderly = db.query(Elderly).filter(Elderly.id == call_data.elderly_id).first()
        if not elderly or elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()

        # 새 통화 레코드 생성
        new_call = Call(
            elderly_id=call_data.elderly_id,
            call_type=call_data.call_type,
            started_at=datetime.utcnow(),
            status="in_progress"
        )
        db.add(new_call)
        db.commit()
        db.refresh(new_call)

        return new_call

    @staticmethod
    def get_list(db: Session, caregiver_id: int, elderly_id: int = None, skip: int = 0, limit: int = 10):
        query = db.query(Call).join(Elderly).filter(Elderly.caregiver_id == caregiver_id)

        if elderly_id:
            query = query.filter(Call.elderly_id == elderly_id)

        return query.order_by(Call.created_at.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, call_id: int, caregiver_id: int):
        call = db.query(Call).join(Elderly).filter(Call.id == call_id).first()
        if not call:
            raise NotFoundError("통화")
        if call.elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()
        return call

    @staticmethod
    def end_call(db: Session, call_id: int, caregiver_id: int):
        call = CallService.get_by_id(db, call_id, caregiver_id)

        call.ended_at = datetime.utcnow()
        call.duration = int((call.ended_at - call.started_at).total_seconds())
        call.status = "completed"

        db.add(call)
        db.commit()
        db.refresh(call)

        return call

    @staticmethod
    def save_message(db: Session, call_id: int, role: str, content: str):
        message = Message(
            call_id=call_id,
            role=role,
            content=content
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def save_analysis(db: Session, call_id: int, analysis_data: dict):
        analysis = CallAnalysis(
            call_id=call_id,
            risk_level=analysis_data.get("risk_level", "low"),
            sentiment_score=analysis_data.get("sentiment_score", 0.0),
            summary=analysis_data.get("summary"),
            recommendations=analysis_data.get("recommendations")
        )
        db.add(analysis)
        db.commit()
        db.refresh(analysis)
        return analysis
