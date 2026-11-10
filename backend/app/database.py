import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Compute absolute path to ensure DB file is always found regardless of working directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_FILE = os.path.join(BASE_DIR, "shoes_wise.db").replace("\\", "/")

raw_db_url = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL = raw_db_url if raw_db_url else f"sqlite:///{DEFAULT_DB_FILE}"

# SQLAlchemy requires postgresql:// instead of legacy postgres:// (common in Render/Supabase)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Configure engine for SQLite or Cloud PostgreSQL (Supabase/Neon/Render)
if DATABASE_URL.startswith("sqlite"):
    print("[DB INIT] Using Local SQLite Database:", DATABASE_URL)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
else:
    print("[DB INIT] Using Cloud PostgreSQL Database at:", DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "cloud")
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
