from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import event
from app.core.config import settings
from app.core.events import event_bus

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    future=True,
    pool_pre_ping=True,
    # pool_size=20, # Uncomment for production tuning
    # max_overflow=10,
)

# Create session maker
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

from sqlalchemy.orm import Session

@event.listens_for(Session, "after_commit")
def receive_after_commit(session):
    event_bus.dispatch_pending_events(session)

@event.listens_for(Session, "after_rollback")
def receive_after_rollback(session):
    event_bus.clear_pending_events(session)

# Dependency for FastAPI to get DB session
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
