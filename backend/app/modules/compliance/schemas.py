from pydantic import BaseModel
from typing import List, Optional

class PrivacyConsentRequest(BaseModel):
    patient_id: str
    consent_given: bool
    policy_version: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class DataSubjectAccessRequest(BaseModel):
    patient_id: str
    request_type: str # "export", "delete", "rectify"
    reason: Optional[str] = None
