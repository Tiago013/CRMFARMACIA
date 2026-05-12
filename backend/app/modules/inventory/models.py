from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, ForeignKey, Uuid, Boolean, Numeric, Date, Integer
from app.models.base import Base, TenantAwareMixin
import uuid
from datetime import date

class Category(Base, TenantAwareMixin):
    __tablename__ = "categories"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=True)

    products = relationship("Product", back_populates="category")

class Product(Base, TenantAwareMixin):
    __tablename__ = "products"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    category_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("categories.id"), nullable=True)
    
    sku: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
    barcode: Mapped[str] = mapped_column(String(50), index=True, nullable=True)
    brand_name: Mapped[str] = mapped_column(String(200), nullable=False)
    active_ingredient: Mapped[str] = mapped_column(String(200), nullable=True)
    presentation: Mapped[str] = mapped_column(String(100), nullable=True)
    
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    cost_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=True)
    min_stock: Mapped[int] = mapped_column(Integer, default=5)

    category = relationship("Category", back_populates="products")
    batches = relationship("Batch", back_populates="product")
    movements = relationship("StockMovement", back_populates="product")

class Batch(Base, TenantAwareMixin):
    __tablename__ = "batches"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("products.id"), index=True, nullable=False)
    
    batch_number: Mapped[str] = mapped_column(String(100), nullable=False)
    expiration_date: Mapped[date] = mapped_column(Date, index=True, nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    product = relationship("Product", back_populates="batches")
    movements = relationship("StockMovement", back_populates="batch")

class StockMovement(Base, TenantAwareMixin):
    __tablename__ = "stock_movements"

    tenant_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("pharmacies.id"), index=True, nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("products.id"), index=True, nullable=False)
    batch_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("batches.id"), index=True, nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid, ForeignKey("users.id"), nullable=False)
    
    movement_type: Mapped[str] = mapped_column(String(50), nullable=False) # PURCHASE_IN, SALE_OUT, EXPIRED_ADJUST, MANUAL_ADJUST
    quantity: Mapped[int] = mapped_column(Integer, nullable=False) # Can be positive or negative
    reference_id: Mapped[str] = mapped_column(String(100), nullable=True) # E.g., Sale ID or PO ID

    product = relationship("Product", back_populates="movements")
    batch = relationship("Batch", back_populates="movements")
