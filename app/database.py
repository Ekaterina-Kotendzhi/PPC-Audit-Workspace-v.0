from sqlalchemy import create_engine, event, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import NullPool
from app.config import settings
import os
import shutil
import sqlite3
from pathlib import Path

# Создаем папку data, если её нет
os.makedirs("data", exist_ok=True)

_sqlite = settings.DATABASE_URL.startswith("sqlite")
connect_args = {"check_same_thread": False, "timeout": 30} if _sqlite else {}
engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
    poolclass=NullPool if _sqlite else None,
)


# Включаем поддержку внешних ключей только для SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA busy_timeout=30000")
    cursor.execute("PRAGMA foreign_keys=ON")
    try:
        cursor.execute("PRAGMA journal_mode=WAL")
    except sqlite3.OperationalError:
        pass
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _ensure_audit_findings_feedback_columns() -> None:
    """Lightweight MVP migration for feedback-loop columns.

    Alembic is still the recommended production solution, but this keeps older
    SQLite/PostgreSQL demo databases compatible after updating the project.
    """
    inspector = inspect(engine)
    if "audit_findings" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_findings")}
    dialect = engine.dialect.name

    if dialect == "sqlite":
        columns_sql = {
            "status": "ALTER TABLE audit_findings ADD COLUMN status VARCHAR(50) DEFAULT 'ai_generated'",
            "original_ai_output": "ALTER TABLE audit_findings ADD COLUMN original_ai_output JSON",
            "edited_output": "ALTER TABLE audit_findings ADD COLUMN edited_output JSON",
            "human_comment": "ALTER TABLE audit_findings ADD COLUMN human_comment TEXT",
            "edited_by": "ALTER TABLE audit_findings ADD COLUMN edited_by VARCHAR(255)",
            "edited_at": "ALTER TABLE audit_findings ADD COLUMN edited_at DATETIME",
        }
    else:
        columns_sql = {
            "status": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ai_generated'",
            "original_ai_output": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS original_ai_output JSON",
            "edited_output": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS edited_output JSON",
            "human_comment": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS human_comment TEXT",
            "edited_by": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS edited_by VARCHAR(255)",
            "edited_at": "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP",
        }

    with engine.begin() as connection:
        for name, statement in columns_sql.items():
            if name not in existing:
                connection.execute(text(statement))


def _ensure_material_and_finding_columns() -> None:
    """Lightweight migration for material status and finding classification columns."""
    inspector = inspect(engine)
    dialect = engine.dialect.name

    def add_sqlite_columns(table: str, columns: dict[str, str]) -> None:
        if table not in inspector.get_table_names():
            return
        existing_cols = {column["name"] for column in inspector.get_columns(table)}
        with engine.begin() as connection:
            for name, statement in columns.items():
                if name not in existing_cols:
                    connection.execute(text(statement))

    if dialect == "sqlite":
        add_sqlite_columns("audit_materials", {
            "status": "ALTER TABLE audit_materials ADD COLUMN status VARCHAR(50) DEFAULT 'ready'",
            "excluded_from_analysis": "ALTER TABLE audit_materials ADD COLUMN excluded_from_analysis BOOLEAN DEFAULT 0",
            "excluded_from_report": "ALTER TABLE audit_materials ADD COLUMN excluded_from_report BOOLEAN DEFAULT 0",
            "exclusion_reason": "ALTER TABLE audit_materials ADD COLUMN exclusion_reason TEXT",
            "updated_at": "ALTER TABLE audit_materials ADD COLUMN updated_at DATETIME",
        })
        add_sqlite_columns("audit_findings", {
            "finding_kind": "ALTER TABLE audit_findings ADD COLUMN finding_kind VARCHAR(50) DEFAULT 'hypothesis'",
            "title": "ALTER TABLE audit_findings ADD COLUMN title VARCHAR(500)",
            "evidence_level": "ALTER TABLE audit_findings ADD COLUMN evidence_level VARCHAR(50)",
            "based_on": "ALTER TABLE audit_findings ADD COLUMN based_on TEXT",
            "missing_data": "ALTER TABLE audit_findings ADD COLUMN missing_data TEXT",
            "approved_for_kb": "ALTER TABLE audit_findings ADD COLUMN approved_for_kb BOOLEAN DEFAULT 0",
        })
    else:
        with engine.begin() as connection:
            for stmt in [
                "ALTER TABLE audit_materials ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ready'",
                "ALTER TABLE audit_materials ADD COLUMN IF NOT EXISTS excluded_from_analysis BOOLEAN DEFAULT FALSE",
                "ALTER TABLE audit_materials ADD COLUMN IF NOT EXISTS excluded_from_report BOOLEAN DEFAULT FALSE",
                "ALTER TABLE audit_materials ADD COLUMN IF NOT EXISTS exclusion_reason TEXT",
                "ALTER TABLE audit_materials ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS finding_kind VARCHAR(50) DEFAULT 'hypothesis'",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS title VARCHAR(500)",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS evidence_level VARCHAR(50)",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS based_on TEXT",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS missing_data TEXT",
                "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS approved_for_kb BOOLEAN DEFAULT FALSE",
            ]:
                connection.execute(text(stmt))

    _backfill_material_updated_at()


def _backfill_material_updated_at() -> None:
    """v1.4.1: copy created_at into updated_at for legacy audit_materials rows."""
    inspector = inspect(engine)
    if "audit_materials" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("audit_materials")}
    if "updated_at" not in columns:
        return
    dialect = engine.dialect.name
    with engine.begin() as connection:
        if dialect == "sqlite":
            connection.execute(
                text("UPDATE audit_materials SET updated_at = created_at WHERE updated_at IS NULL")
            )
        else:
            connection.execute(
                text("UPDATE audit_materials SET updated_at = created_at WHERE updated_at IS NULL")
            )


def _sqlite_db_path() -> Path | None:
    if not settings.DATABASE_URL.startswith("sqlite"):
        return None
    # sqlite:///data/app.db or sqlite:////absolute/path
    raw = settings.DATABASE_URL.replace("sqlite:///", "", 1)
    return Path(raw)


def _recover_sqlite_if_corrupted() -> None:
    """If app.db is corrupted (e.g. deleted while Docker held the file), recreate it."""
    db_path = _sqlite_db_path()
    if not db_path or not db_path.exists():
        return
    try:
        with sqlite3.connect(str(db_path), timeout=30) as conn:
            row = conn.execute("PRAGMA quick_check").fetchone()
        if row and str(row[0]).lower() == "ok":
            backup = db_path.with_suffix(".db.corrupt.bak")
            if backup.exists():
                try:
                    backup.unlink()
                except OSError:
                    pass
            return
    except (sqlite3.DatabaseError, sqlite3.OperationalError):
        return
    backup = db_path.with_suffix(".db.corrupt.bak")
    if db_path.exists():
        shutil.move(str(db_path), str(backup))
    db_path.parent.mkdir(parents=True, exist_ok=True)


def init_db():
    """Создает все таблицы в базе данных.

    Для полноценных продакшен-миграций подключите Alembic. В MVP create_all
    оставлен для быстрого запуска на SQLite и PostgreSQL.
    """
    _recover_sqlite_if_corrupted()
    from app.models import Client, ClientContact, AuditProject, AuditMaterial, AuditFinding, AuditRun, AuditChatMessage, AuditChatTelemetryEvent  # noqa
    Base.metadata.create_all(bind=engine)
    _ensure_audit_findings_feedback_columns()
    _ensure_material_and_finding_columns()
    _ensure_audit_project_limitation_column()
    _ensure_chat_tables_columns()
    _ensure_audit_runs_actor_column()
    _ensure_client_g1_columns()
    _ensure_audit_archived_column()
    _ensure_audit_plan_column()
    _ensure_active_metrics_material_column()
    _ensure_report_appendix_column()
    _ensure_finding_illustration_column()
    _ensure_finding_illustration_caption_column()


def _ensure_finding_illustration_caption_column() -> None:
    """R1.15b: marketer caption under finding illustration in PDF."""
    inspector = inspect(engine)
    if "audit_findings" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_findings")}
    if "illustration_caption" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_findings ADD COLUMN illustration_caption TEXT"
        if dialect == "sqlite"
        else "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS illustration_caption TEXT"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_finding_illustration_column() -> None:
    """R1.15: optional screenshot inline with a finding."""
    inspector = inspect(engine)
    if "audit_findings" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_findings")}
    if "illustration_material_id" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_findings ADD COLUMN illustration_material_id INTEGER"
        if dialect == "sqlite"
        else "ALTER TABLE audit_findings ADD COLUMN IF NOT EXISTS illustration_material_id INTEGER"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_report_appendix_column() -> None:
    """R1.12: curated screenshot appendix for client PDF."""
    inspector = inspect(engine)
    if "audit_projects" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_projects")}
    if "report_appendix_json" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_projects ADD COLUMN report_appendix_json TEXT"
        if dialect == "sqlite"
        else "ALTER TABLE audit_projects ADD COLUMN IF NOT EXISTS report_appendix_json TEXT"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_active_metrics_material_column() -> None:
    """J13: which manual_metrics period is canonical for report/AI."""
    inspector = inspect(engine)
    if "audit_projects" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_projects")}
    if "active_metrics_material_id" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_projects ADD COLUMN active_metrics_material_id INTEGER"
        if dialect == "sqlite"
        else "ALTER TABLE audit_projects ADD COLUMN IF NOT EXISTS active_metrics_material_id INTEGER"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_audit_plan_column() -> None:
    """J1/J2: baseline, targets, forecast on audit_projects."""
    inspector = inspect(engine)
    if "audit_projects" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_projects")}
    if "audit_plan_json" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_projects ADD COLUMN audit_plan_json TEXT"
        if dialect == "sqlite"
        else "ALTER TABLE audit_projects ADD COLUMN IF NOT EXISTS audit_plan_json TEXT"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_audit_archived_column() -> None:
    """G4: archived_at on audit_projects."""
    inspector = inspect(engine)
    if "audit_projects" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_projects")}
    if "archived_at" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_projects ADD COLUMN archived_at DATETIME"
        if dialect == "sqlite"
        else "ALTER TABLE audit_projects ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_client_g1_columns() -> None:
    """G1: region, niche_category, niche_subcategory on clients."""
    inspector = inspect(engine)
    if "clients" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("clients")}
    dialect = engine.dialect.name
    columns = {
        "region": "VARCHAR(255)",
        "niche_category": "VARCHAR(100)",
        "niche_subcategory": "VARCHAR(255)",
    }
    with engine.begin() as connection:
        for name, col_type in columns.items():
            if name in existing:
                continue
            if dialect == "sqlite":
                connection.execute(text(f"ALTER TABLE clients ADD COLUMN {name} {col_type}"))
            else:
                connection.execute(text(f"ALTER TABLE clients ADD COLUMN IF NOT EXISTS {name} {col_type}"))


def _ensure_audit_project_limitation_column() -> None:
    inspector = inspect(engine)
    if "audit_projects" not in inspector.get_table_names():
        return
    existing = {column["name"] for column in inspector.get_columns("audit_projects")}
    if "accepted_data_limitations_json" in existing:
        return
    dialect = engine.dialect.name
    stmt = (
        "ALTER TABLE audit_projects ADD COLUMN accepted_data_limitations_json TEXT"
        if dialect == "sqlite"
        else "ALTER TABLE audit_projects ADD COLUMN IF NOT EXISTS accepted_data_limitations_json TEXT"
    )
    with engine.begin() as connection:
        connection.execute(text(stmt))


def _ensure_chat_tables_columns() -> None:
    inspector = inspect(engine)
    dialect = engine.dialect.name
    with engine.begin() as connection:
        if "audit_chat_messages" in inspector.get_table_names():
            cols = {c["name"] for c in inspector.get_columns("audit_chat_messages")}
            statements = {
                "confidence_level": "ALTER TABLE audit_chat_messages ADD COLUMN confidence_level VARCHAR(20)",
                "fallback_used": "ALTER TABLE audit_chat_messages ADD COLUMN fallback_used BOOLEAN DEFAULT 0",
                "duration_ms": "ALTER TABLE audit_chat_messages ADD COLUMN duration_ms INTEGER",
                "context_version": "ALTER TABLE audit_chat_messages ADD COLUMN context_version VARCHAR(50)",
            }
            for name, stmt in statements.items():
                if name not in cols:
                    if dialect != "sqlite":
                        stmt = stmt.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS")
                    connection.execute(text(stmt))
        if "audit_chat_telemetry_events" in inspector.get_table_names():
            cols = {c["name"] for c in inspector.get_columns("audit_chat_telemetry_events")}
            stmt = "ALTER TABLE audit_chat_telemetry_events ADD COLUMN error_type VARCHAR(50)"
            if "error_type" not in cols:
                if dialect != "sqlite":
                    stmt = stmt.replace("ADD COLUMN", "ADD COLUMN IF NOT EXISTS")
                connection.execute(text(stmt))


def _ensure_audit_runs_actor_column() -> None:
    inspector = inspect(engine)
    if "audit_runs" not in inspector.get_table_names():
        return
    cols = {c["name"] for c in inspector.get_columns("audit_runs")}
    if "actor" in cols:
        return
    stmt = "ALTER TABLE audit_runs ADD COLUMN actor VARCHAR(255)"
    if engine.dialect.name != "sqlite":
        stmt = "ALTER TABLE audit_runs ADD COLUMN IF NOT EXISTS actor VARCHAR(255)"
    with engine.begin() as connection:
        connection.execute(text(stmt))
