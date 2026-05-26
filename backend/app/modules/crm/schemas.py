from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime

class PatientBase(BaseModel):
    first_name: str
    last_name: str
    phone: Optional[str] = None
    document_id: Optional[str] = None
    preferences: Dict[str, Any] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)

class PatientCreate(PatientBase):
    pass

class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    document_id: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    status: Optional[str] = None

class PatientResponse(PatientBase):
    id: UUID
    status: str
    last_purchase_date: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TimelineEventBase(BaseModel):
    patient_id: UUID
    event_type: str
    event_data: Dict[str, Any]

class TimelineEventCreate(TimelineEventBase):
    user_id: Optional[UUID] = None

class TimelineEventResponse(TimelineEventBase):
    id: UUID
    created_at: datetime
    user_id: Optional[UUID] = None

    class Config:
        from_attributes = True
