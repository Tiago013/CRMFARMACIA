import logging
import json
from datetime import datetime
from typing import Any, Dict

# Configurar un logger específico para auditoría que, en prod, 
# puede enviar logs a CloudWatch, Datadog o Splunk (JSON format).
audit_logger = logging.getLogger("farmaai.audit")
audit_logger.setLevel(logging.INFO)

def log_security_event(action: str, user_id: str, resource: str, details: Dict[str, Any] = None):
    """
    Rastrea un evento crítico de seguridad para trazabilidad y compliance (Habeas Data / GDPR).
    """
    event = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action": action,
        "user_id": user_id,
        "resource": resource,
        "details": details or {}
    }
    # Escribir como JSON estructurado para fácil ingestión en SIEMs
    audit_logger.info(json.dumps(event))
