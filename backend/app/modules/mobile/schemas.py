from pydantic import BaseModel
from typing import Optional

class PushTokenRegistration(BaseModel):
    patient_id: str
    device_token: str
    platform: str # "ios" or "android"

class MobileSyncRequest(BaseModel):
    last_sync_timestamp: float
