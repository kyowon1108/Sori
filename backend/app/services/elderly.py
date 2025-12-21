from sqlalchemy.orm import Session
from app.models.elderly import Elderly
from app.schemas.elderly import ElderlyCreateRequest, ElderlyUpdateRequest
from app.core.exceptions import NotFoundError, ForbiddenError


class ElderlyService:
    @staticmethod
    def create(db: Session, elderly_data: ElderlyCreateRequest, caregiver_id: int):
        new_elderly = Elderly(
            caregiver_id=caregiver_id,
            name=elderly_data.name,
            age=elderly_data.age,
            phone=elderly_data.phone,
            call_schedule=elderly_data.call_schedule.model_dump() if elderly_data.call_schedule else {"enabled": True, "times": ["09:00", "14:00", "19:00"]},
            health_condition=elderly_data.health_condition,
            medications=elderly_data.medications,
            emergency_contact=elderly_data.emergency_contact,
            notes=elderly_data.notes
        )
        db.add(new_elderly)
        db.commit()
        db.refresh(new_elderly)
        return new_elderly

    @staticmethod
    def get_list(db: Session, caregiver_id: int, skip: int = 0, limit: int = 10):
        return db.query(Elderly)\
            .filter(Elderly.caregiver_id == caregiver_id)\
            .offset(skip)\
            .limit(limit)\
            .all()

    @staticmethod
    def get_by_id(db: Session, elderly_id: int, caregiver_id: int):
        elderly = db.query(Elderly).filter(Elderly.id == elderly_id).first()
        if not elderly:
            raise NotFoundError("어르신")
        if elderly.caregiver_id != caregiver_id:
            raise ForbiddenError()
        return elderly

    @staticmethod
    def update(db: Session, elderly_id: int, caregiver_id: int, elderly_data: ElderlyUpdateRequest):
        elderly = ElderlyService.get_by_id(db, elderly_id, caregiver_id)

        update_data = elderly_data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            if key == "call_schedule" and value:
                setattr(elderly, key, value.model_dump() if hasattr(value, 'model_dump') else value)
            elif value is not None:
                setattr(elderly, key, value)

        db.add(elderly)
        db.commit()
        db.refresh(elderly)
        return elderly

    @staticmethod
    def delete(db: Session, elderly_id: int, caregiver_id: int):
        elderly = ElderlyService.get_by_id(db, elderly_id, caregiver_id)
        db.delete(elderly)
        db.commit()
        return True
