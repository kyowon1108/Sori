from pydantic import BaseModel
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
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
