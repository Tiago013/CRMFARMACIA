from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

class WhatsAppMessageRequest(BaseModel):
    patient_id: str
    phone_number: str
    template_name: Optional[str] = None
    message_text: Optional[str] = None
    variables: Optional[Dict[str, Any]] = Field(default_factory=dict)

class WhatsAppMessageResponse(BaseModel):
    success: bool
    message_id: str
    status: str
    timestamp: str

class WebhookPayload(BaseModel):
    object: str
    entry: list
