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

db_is_postgres = not DATABASE_URL.startswith("sqlite")
db_status_detail = "SQLite (Local File)"
db_error_message = None

if db_is_postgres:
    db_host_display = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "cloud"
    print(f"[DB INIT] Attempting Cloud PostgreSQL connection to: {db_host_display}")
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_recycle=300,
            echo=False
        )
        # Test connection actively
        with engine.connect() as conn:
            pass
        db_status_detail = "PostgreSQL (Permanent Cloud Storage)"
        print("[DB INIT] Successfully connected to Cloud PostgreSQL!")
    except Exception as e:
        db_error_message = f"{type(e).__name__}: {str(e)}"
        print(f"[DB INIT ERROR] Cloud PostgreSQL failed ({db_error_message}). Falling back to SQLite to prevent downtime.")
        db_status_detail = f"SQLite Fallback (Postgres Error: {type(e).__name__})"
        DATABASE_URL = f"sqlite:///{DEFAULT_DB_FILE}"
        engine = create_engine(
            DATABASE_URL,
            connect_args={"check_same_thread": False},
            echo=False
        )
else:
    print("[DB INIT] Using Local SQLite Database:", DATABASE_URL)
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )
    db_status_detail = "SQLite (Temporary Container Storage)"

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
