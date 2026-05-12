from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Uuid, Numeric, DateTime
from sqlalchemy.sql import func
from app.models.base import Base, TenantAwareMixin
import uuid

class Sale(Base, TenantAwareMixin):
    __tablename__ = "sales"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    branch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), nullable=True) # Assuming pharmacy ID is branch ID for MVP
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False) # Cashier
    patient_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("patients.id"), nullable=True, index=True)
    
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax_total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    discount_total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    grand_total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    status: Mapped[str] = mapped_column(String(20), default="completed") # completed, voided, refunded
    idempotency_key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=True)

    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="sale", cascade="all, delete-orphan")

class SaleItem(Base, TenantAwareMixin):
    __tablename__ = "sale_items"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    sale_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("sales.id"), index=True, nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("products.id"), nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("batches.id"), nullable=False)
    
    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price_at_sale: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False) # Frozen price
    
    sale = relationship("Sale", back_populates="items")

class Payment(Base, TenantAwareMixin):
    __tablename__ = "payments"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    sale_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("sales.id"), index=True, nullable=False)
    
    payment_method: Mapped[str] = mapped_column(String(50), nullable=False) # cash, credit_card, transfer
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    
    sale = relationship("Sale", back_populates="payments")
