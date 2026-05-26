from typing import Dict, Any, List, Optional
import uuid
from loguru import logger
from .service import OdooIntegrationService

class OdooWhatsAppService(OdooIntegrationService):
    """
    Extends OdooIntegrationService to handle WhatsApp messaging via Odoo ERP.
    """
    
    async def get_templates(self) -> List[Dict[str, Any]]:
        """Fetch approved WhatsApp templates from Odoo."""
        if not self.transport:
            return []
            
        try:
            # We want to fetch active, approved templates for supported models
            domain = [("status", "=", "approved"), ("model", "in", ["res.partner", "sale.order", "account.move"])]
            
            try:
                templates = await self.transport.execute_kw(
                    model="whatsapp.template",
                    method="search_read",
                    args=[domain],
                    kwargs={"fields": ["id", "name", "model_id", "model", "body", "status"]}
                )
            except Exception as e:
                logger.error(f"Error fetching WA templates with status: {e}")
                # Fallback to 'state' field for older Odoo versions
                domain = [("state", "=", "approved"), ("model", "in", ["res.partner", "sale.order", "account.move"])]
                templates = await self.transport.execute_kw(
                    model="whatsapp.template",
                    method="search_read",
                    args=[domain],
                    kwargs={"fields": ["id", "name", "model_id", "model", "body", "state"]}
                )
            
            # Map model names for the frontend
            for t in templates:
                model_name = t.get("model", "")
                if model_name == "res.partner":
                    t["target_type"] = "contact"
                elif model_name == "sale.order":
                    t["target_type"] = "sale"
                elif model_name == "account.move":
                    t["target_type"] = "invoice"
                else:
                    t["target_type"] = "other"
                    
            return templates
        except Exception as e:
            logger.exception(f"Failed to get WhatsApp templates from Odoo: {e}")
            return []

    async def get_messages(self, odoo_partner_id: int) -> List[Dict[str, Any]]:
        """Fetch WhatsApp messages history for a specific partner."""
        if not self.transport:
            return []
            
        try:
            # Find messages where the partner is a recipient, OR it's attached directly to the partner
            domain = [
                "&",
                ("message_type", "=", "whatsapp_message"),
                "|",
                ("partner_ids", "in", [odoo_partner_id]),
                "&",
                ("res_id", "=", odoo_partner_id),
                ("model", "=", "res.partner")
            ]
            
            messages = await self.transport.execute_kw(
                model="mail.message",
                method="search_read",
                args=[domain],
                kwargs={"fields": ["id", "body", "date", "author_id", "message_type"], "order": "date desc", "limit": 50}
            )
            
            # Format for frontend
            formatted = []
            for m in messages:
                author = m.get("author_id")
                is_outgoing = True
                if author and isinstance(author, list) and author[0] == odoo_partner_id:
                    is_outgoing = False
                    
                formatted.append({
                    "id": m.get("id"),
                    "text": m.get("body", "").replace("<p>", "").replace("</p>", ""),
                    "timestamp": m.get("date"),
                    "isOutgoing": is_outgoing,
                    "sender": author[1] if author and isinstance(author, list) else "Sistema"
                })
                
            return formatted
        except Exception as e:
            logger.exception(f"Failed to get WhatsApp messages from Odoo: {e}")
            return []

    async def send_template(self, odoo_partner_id: int, template_id: int, res_model: str, res_id: int) -> bool:
        """Send a WhatsApp template via Odoo composer."""
        if not self.transport:
            return False
            
        try:
            # 1. Create whatsapp.composer record
            try:
                composer_id = await self.transport.execute_kw(
                    model="whatsapp.composer",
                    method="create",
                    args=[{
                        "wa_template_id": template_id,
                        "res_model": res_model,
                        "res_ids": f"[{res_id}]" # Try string format
                    }]
                )
            except Exception:
                # Try passing res_ids as list
                composer_id = await self.transport.execute_kw(
                    model="whatsapp.composer",
                    method="create",
                    args=[{
                        "wa_template_id": template_id,
                        "res_model": res_model,
                        "res_ids": [res_id]
                    }]
                )
                
            if not composer_id:
                logger.error("Failed to create whatsapp.composer")
                return False
                
            # 2. Call action_send_whatsapp_template
            await self.transport.execute_kw(
                model="whatsapp.composer",
                method="action_send_whatsapp_template",
                args=[[composer_id]]
            )
            
            return True
        except Exception as e:
            logger.exception(f"Failed to send WhatsApp template via Odoo: {e}")
            return False
