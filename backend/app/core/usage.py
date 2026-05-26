from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.core.local_db import query_one

class UsageService:
    @staticmethod
    def get_tenant_plan_limits(tenant_id: str):
        # Fallback dictionary for limits if not defined dynamically
        LIMITS = {
            "STARTER": {"patients": 500, "wa_messages": 100, "pos_transactions": 1000, "branches": 1, "users": 3, "storage_mb": 1000},
            "PRO": {"patients": 2000, "wa_messages": 500, "pos_transactions": 5000, "branches": 3, "users": 10, "storage_mb": 5000},
            "ENTERPRISE": {"patients": 10000, "wa_messages": 2000, "pos_transactions": 20000, "branches": 10, "users": 50, "storage_mb": 20000}
        }
        
        row = query_one("SELECT plan FROM pharmacies WHERE id = ?", (tenant_id,))
        plan_name = row["plan"] if row else "STARTER"
        return LIMITS.get(plan_name, LIMITS["STARTER"]), plan_name

    @staticmethod
    def get_usage(tenant_id: str):
        limits, plan_name = UsageService.get_tenant_plan_limits(tenant_id)
        
        # Real counts from sqlite
        patients_row = query_one("SELECT COUNT(*) as count FROM patients WHERE tenant_id = ?", (tenant_id,))
        patients_used = patients_row["count"] if patients_row else 0
        
        wa_messages_row = query_one("SELECT COUNT(*) as count FROM event_log WHERE tenant_id = ? AND event_type = 'whatsapp.sent'", (tenant_id,))
        wa_messages_used = wa_messages_row["count"] if wa_messages_row else 0
        
        pos_tx_row = query_one("SELECT COUNT(*) as count FROM sales WHERE tenant_id = ?", (tenant_id,))
        pos_transactions_used = pos_tx_row["count"] if pos_tx_row else 0
        
        branches_row = query_one("SELECT COUNT(*) as count FROM branches WHERE tenant_id = ?", (tenant_id,))
        branches_used = branches_row["count"] if branches_row else 0
        
        users_row = query_one("SELECT COUNT(*) as count FROM users WHERE tenant_id = ?", (tenant_id,))
        users_used = users_row["count"] if users_row else 0
        
        storage_mb_used = 150 # Simulated size for SQLite since we don't store actual files yet

        return {
            "patients": {"used": patients_used, "limit": limits["patients"], "percent": min(100, round((patients_used/limits["patients"])*100))},
            "wa_messages": {"used": wa_messages_used, "limit": limits["wa_messages"], "percent": min(100, round((wa_messages_used/limits["wa_messages"])*100))},
            "pos_transactions": {"used": pos_transactions_used, "limit": limits["pos_transactions"], "percent": min(100, round((pos_transactions_used/limits["pos_transactions"])*100))},
            "branches": {"used": branches_used, "limit": limits["branches"], "percent": min(100, round((branches_used/limits["branches"])*100))},
            "users": {"used": users_used, "limit": limits["users"], "percent": min(100, round((users_used/limits["users"])*100))},
            "storage_mb": {"used": storage_mb_used, "limit": limits["storage_mb"], "percent": min(100, round((storage_mb_used/limits["storage_mb"])*100))}
        }

    @staticmethod
    def check_limit(tenant_id: str, resource_type: str):
        usage = UsageService.get_usage(tenant_id)
        if resource_type in usage:
            resource = usage[resource_type]
            if resource["percent"] >= 100:
                raise HTTPException(
                    status_code=402, 
                    detail={
                        "error": "limit_exceeded", 
                        "resource": resource_type,
                        "used": resource["used"],
                        "limit": resource["limit"],
                        "upgrade_url": "/billing"
                    }
                )
        return True
