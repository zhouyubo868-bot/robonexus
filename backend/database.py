"""
Database configuration and session management
"""
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from config import settings

DATABASE_URL = settings.DATABASE_URL

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db():
    """Database session dependency"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
