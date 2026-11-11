import os
from urllib.parse import quote_plus, unquote
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Compute absolute path to ensure DB file is always found regardless of working directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEFAULT_DB_FILE = os.path.join(BASE_DIR, "shoes_wise.db").replace("\\", "/")

def clean_database_url(url: str) -> str:
    """
    Cleans and encodes special characters in DB URL (e.g. '@' in passwords).
    Normalizes 'postgres://' to 'postgresql://'.
    """
    if not url:
        return url
    url = url.strip()
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    
    try:
        scheme_sep = "://"
        if scheme_sep in url:
            scheme, rest = url.split(scheme_sep, 1)
            if "@" in rest:
                auth_part, host_part = rest.rsplit("@", 1)
                if ":" in auth_part:
                    user, password = auth_part.split(":", 1)
                    clean_pw = quote_plus(unquote(password))
                    url = f"{scheme}://{user}:{clean_pw}@{host_part}"
    except Exception as parse_err:
        print(f"[DB INIT WARNING] URL cleanup failed ({parse_err}), using raw URL.")
    return url

raw_db_url = os.getenv("DATABASE_URL", "").strip()
DATABASE_URL = clean_database_url(raw_db_url) if raw_db_url else f"sqlite:///{DEFAULT_DB_FILE}"

db_is_postgres = not DATABASE_URL.startswith("sqlite")
db_status_detail = "SQLite (Local File)"
db_error_message = None

if db_is_postgres:
    db_host_display = DATABASE_URL.split("@")[-1] if "@" in DATABASE_URL else "cloud"
    print(f"[DB INIT] Attempting Cloud PostgreSQL connection to: {db_host_display}")
    
    # Try with psycopg2 first (reliable), default, and psycopg (v3)
    urls_to_try = []
    if DATABASE_URL.startswith("postgresql://"):
        urls_to_try.append(DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1))
        urls_to_try.append(DATABASE_URL)
        urls_to_try.append(DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1))
    else:
        urls_to_try.append(DATABASE_URL)

    connected = False
    last_err = None
    for url in urls_to_try:
        driver_tag = url.split("://")[0]
        try:
            print(f"[DB INIT] Probing driver '{driver_tag}'...")
            test_engine = create_engine(
                url,
                pool_pre_ping=True,
                pool_recycle=300,
                echo=False
            )
            with test_engine.connect() as conn:
                pass
            engine = test_engine
            db_status_detail = "PostgreSQL (Permanent Cloud Storage - Supabase)"
            connected = True
            print(f"[DB INIT] Successfully established active Cloud PostgreSQL connection via '{driver_tag}'!")
            break
        except Exception as e:
            last_err = e
            print(f"[DB INIT] Driver '{driver_tag}' connection test failed: {e}")

    if not connected:
        db_error_message = f"{type(last_err).__name__}: {str(last_err)}"
        print(f"[DB INIT ERROR] All PostgreSQL connection attempts failed ({db_error_message}). Falling back to SQLite.")
        db_status_detail = f"SQLite Fallback (Postgres Error: {type(last_err).__name__})"
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
