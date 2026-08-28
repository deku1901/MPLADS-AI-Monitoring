"""
Database session factory.
Uses SQLAlchemy 2.0 with SQLite.  WAL mode enabled to allow concurrent reads
during background scheduler writes.
"""
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from config import settings
from models import Base

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def _enable_wal(dbapi_conn, _):
    """Enable WAL journal mode for SQLite to allow concurrent reads."""
    dbapi_conn.execute("PRAGMA journal_mode=WAL;")
    dbapi_conn.execute("PRAGMA foreign_keys=ON;")


SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)


def create_tables():
    Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency: yields a DB session, always closes."""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
