from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class MessageResponse(BaseModel):
    id: int
    call_id: int
    role: str  # 'user', 'assistant'
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class CallAnalysisResponse(BaseModel):
    id: int
    call_id: int
    summary: Optional[str] = None
    risk_score: int = 0  # 0-100
    concerns: Optional[str] = None
    recommendations: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CallCreateRequest(BaseModel):
    elderly_id: int
    call_type: str = "voice"


class CallStartResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    status: str
    ws_url: str


class CallDetailResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    status: str
    is_successful: bool
    messages: List[MessageResponse] = []
    analysis: Optional[CallAnalysisResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CallListResponse(BaseModel):
    id: int
    elderly_id: int
    call_type: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    duration: Optional[int] = None
    status: str
    is_successful: bool
    created_at: datetime

    class Config:
        from_attributes = True
