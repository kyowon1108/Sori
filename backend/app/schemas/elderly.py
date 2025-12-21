from pydantic import BaseModel, computed_field
from typing import Optional, List, Dict, Any
from datetime import datetime


class CallSchedule(BaseModel):
    enabled: bool = True
    times: List[str] = []  # ["09:00", "14:00"]


class ElderlyCreateRequest(BaseModel):
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Optional[CallSchedule] = None
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None


class ElderlyUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Optional[CallSchedule] = None
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    notes: Optional[str] = None


class ElderlyDeviceResponse(BaseModel):
    id: int
    elderly_id: int
    platform: str
    device_name: Optional[str] = None
    is_active: bool
    last_used_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ElderlyResponse(BaseModel):
    id: int
    caregiver_id: int
    name: str
    age: Optional[int] = None
    phone: Optional[str] = None
    call_schedule: Dict[str, Any]
    health_condition: Optional[str] = None
    medications: Optional[List[Dict[str, Any]]] = None
    emergency_contact: Optional[str] = None
    risk_level: str
    notes: Optional[str] = None
    device: Optional[ElderlyDeviceResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_orm_with_device(cls, elderly) -> "ElderlyResponse":
        """Create response from ORM model, including the first active device."""
        # Get first active device if any
        active_device = None
        if hasattr(elderly, 'devices') and elderly.devices:
            for d in elderly.devices:
                if d.is_active:
                    active_device = ElderlyDeviceResponse.model_validate(d)
                    break

        return cls(
            id=elderly.id,
            caregiver_id=elderly.caregiver_id,
            name=elderly.name,
            age=elderly.age,
            phone=elderly.phone,
            call_schedule=elderly.call_schedule or {"enabled": True, "times": []},
            health_condition=elderly.health_condition,
            medications=elderly.medications,
            emergency_contact=elderly.emergency_contact,
            risk_level=elderly.risk_level,
            notes=elderly.notes,
            device=active_device,
            created_at=elderly.created_at,
            updated_at=elderly.updated_at,
        )
