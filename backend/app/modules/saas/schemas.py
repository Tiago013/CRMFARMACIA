from pydantic import BaseModel
from typing import Dict

class TenantSettings(BaseModel):
    theme_color: str
    logo_url: str
    feature_flags: Dict[str, bool]
