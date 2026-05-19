from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.models.billing import Subscription, SubscriptionPlan
# We will assume these models exist or will be imported correctly.
# In a real scenario we'd import them, but we might have circular dependencies or missing models.
# For usage, we can do raw queries or import models locally if needed.

class UsageService:
    @staticmethod
    def get_tenant_plan(db: Session, tenant_id: int) -> SubscriptionPlan:
        subscription = db.query(Subscription).filter(Subscription.tenant_id == tenant_id, Subscription.status == 'active').first()
        if not subscription:
            # Fallback to STARTER if no active subscription (or return Free plan)
            return db.query(SubscriptionPlan).filter(SubscriptionPlan.slug == 'starter').first()
        return subscription.plan

    @staticmethod
    def get_usage(db: Session, tenant_id: int):
        plan = UsageService.get_tenant_plan(db, tenant_id)
        limits = plan.limits if plan else {}
        
        # We would dynamically count these from the database tables.
        # Since we might not have all tables defined yet, we'll mock the counts for the purpose of the structure.
        # Example implementation:
        # patients_count = db.query(func.count(Patient.id)).filter(Patient.tenant_id == tenant_id).scalar()
        
        patients_used = 1847 # Mock
        wa_messages_used = 312 # Mock
        pos_transactions_used = 4500 # Mock
        branches_used = 1 # Mock
        users_used = 4 # Mock
        storage_mb_used = 2100 # Mock

        return {
            "patients": {"used": patients_used, "limit": limits.get("patients", 2000), "percent": round((patients_used/limits.get("patients", 2000))*100) if limits.get("patients") else 0},
            "wa_messages": {"used": wa_messages_used, "limit": limits.get("wa_messages", 500), "percent": round((wa_messages_used/limits.get("wa_messages", 500))*100) if limits.get("wa_messages") else 0},
            "pos_transactions": {"used": pos_transactions_used, "limit": limits.get("pos_transactions", 2000), "percent": round((pos_transactions_used/limits.get("pos_transactions", 2000))*100) if limits.get("pos_transactions") else 0},
            "branches": {"used": branches_used, "limit": limits.get("branches", 1), "percent": round((branches_used/limits.get("branches", 1))*100) if limits.get("branches") else 0},
            "users": {"used": users_used, "limit": limits.get("users", 3), "percent": round((users_used/limits.get("users", 3))*100) if limits.get("users") else 0},
            "storage_mb": {"used": storage_mb_used, "limit": limits.get("storage_mb", 5000), "percent": round((storage_mb_used/limits.get("storage_mb", 5000))*100) if limits.get("storage_mb") else 0}
        }

    @staticmethod
    def check_limit(db: Session, tenant_id: int, resource_type: str):
        usage = UsageService.get_usage(db, tenant_id)
        if resource_type in usage:
            resource = usage[resource_type]
            if resource["percent"] >= 100:
                raise HTTPException(status_code=403, detail=f"Has alcanzado el límite de {resource_type} para tu plan actual. Por favor actualiza tu suscripción.")
            if resource["percent"] >= 80:
                # In a real app we might trigger an event/notification here if not already sent
                pass
        return True

    @staticmethod
    def has_feature(db: Session, tenant_id: int, feature_name: str) -> bool:
        plan = UsageService.get_tenant_plan(db, tenant_id)
        if not plan or not plan.features:
            return False
        return plan.features.get(feature_name, False)
