from sqlalchemy import Column, Integer, String, Float, Boolean, JSON, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.models.base import Base

class SubscriptionPlan(Base):
    __tablename__ = "subscription_plans"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True) # STARTER, PRO, ENTERPRISE
    slug = Column(String, unique=True, index=True)
    price_monthly = Column(Float)
    price_yearly = Column(Float)
    limits = Column(JSON) # e.g. {"patients": 2000, "wa_messages": 500, "pos_transactions": 2000, "branches": 1, "users": 3, "storage_mb": 5000}
    features = Column(JSON) # e.g. {"ai_predictive": False, "api_b2b": False, "multi_branch": False}
    is_active = Column(Boolean, default=True)

class Subscription(Base):
    __tablename__ = "subscriptions"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id")) # Assuming tenant is an admin user for now
    plan_id = Column(Integer, ForeignKey("subscription_plans.id"))
    status = Column(String) # trialing, active, past_due, cancelled
    current_period_start = Column(DateTime)
    current_period_end = Column(DateTime)
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)
    billing_cycle = Column(String) # monthly, yearly
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    plan = relationship("SubscriptionPlan")
    tenant = relationship("User", foreign_keys=[tenant_id])

class Addon(Base):
    __tablename__ = "addons"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    slug = Column(String, unique=True)
    price = Column(Float)
    billing_cycle = Column(String) # monthly, yearly
    is_active = Column(Boolean, default=True)

class TenantAddon(Base):
    __tablename__ = "tenant_addons"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"))
    addon_id = Column(Integer, ForeignKey("addons.id"))
    status = Column(String) # active, cancelled
    stripe_subscription_item_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class ConsultingProject(Base):
    __tablename__ = "consulting_projects"
    
    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("users.id"))
    service_type = Column(String)
    description = Column(String)
    urgency = Column(String)
    status = Column(String, default="pending") # pending, in_progress, completed
    price = Column(Float)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
