from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class Client(Base):
    __tablename__ = "clients"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    niche = Column(String(255))
    niche_category = Column(String(100))
    niche_subcategory = Column(String(255))
    region = Column(String(255))
    website = Column(String(500))
    comment = Column(Text)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Связи
    audit_projects = relationship("AuditProject", back_populates="client", cascade="all, delete-orphan")
    contacts = relationship(
        "ClientContact",
        back_populates="client",
        cascade="all, delete-orphan",
        order_by="ClientContact.sort_order",
    )


class ClientContact(Base):
    __tablename__ = "client_contacts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    role = Column(String(100))
    phone = Column(String(100))
    email = Column(String(255))
    messenger = Column(String(255))
    comment = Column(Text)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    client = relationship("Client", back_populates="contacts")

class AuditProject(Base):
    __tablename__ = "audit_projects"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    client_id = Column(Integer, ForeignKey("clients.id", ondelete="CASCADE"), nullable=False)
    goal = Column(Text)
    status = Column(String(50), default="draft")  # draft | in_progress | completed | needs_review | failed
    needs_review = Column(Boolean, default=False)
    accepted_data_limitations_json = Column(Text)
    audit_plan_json = Column(Text)
    report_appendix_json = Column(Text)
    active_metrics_material_id = Column(Integer, ForeignKey("audit_materials.id", ondelete="SET NULL"), nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Связи
    client = relationship("Client", back_populates="audit_projects")
    materials = relationship(
        "AuditMaterial",
        back_populates="audit_project",
        foreign_keys="AuditMaterial.audit_project_id",
        cascade="all, delete-orphan",
    )
    active_metrics_material = relationship(
        "AuditMaterial",
        foreign_keys=[active_metrics_material_id],
        post_update=True,
    )
    findings = relationship("AuditFinding", back_populates="audit_project", cascade="all, delete-orphan")
    runs = relationship("AuditRun", back_populates="audit_project", cascade="all, delete-orphan")
    chat_messages = relationship("AuditChatMessage", back_populates="audit_project", cascade="all, delete-orphan")

class AuditMaterial(Base):
    __tablename__ = "audit_materials"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_project_id = Column(Integer, ForeignKey("audit_projects.id", ondelete="CASCADE"), nullable=False)
    type = Column(String(50), nullable=False)  # text_note | audio | audio_transcript | screenshot | screenshot_ocr | manual_metrics | table | document
    title = Column(String(500))
    raw_content = Column(Text)
    file_url = Column(String(1000))
    extracted_text = Column(Text)
    confidence = Column(Float)
    needs_review = Column(Boolean, default=False)
    review_reason = Column(Text)
    status = Column(String(50), default="ready")  # ready | needs_review | excluded | processing_error
    excluded_from_analysis = Column(Boolean, default=False)
    excluded_from_report = Column(Boolean, default=False)
    exclusion_reason = Column(Text)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Связи
    audit_project = relationship(
        "AuditProject",
        back_populates="materials",
        foreign_keys=[audit_project_id],
    )

class AuditFinding(Base):
    __tablename__ = "audit_findings"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_project_id = Column(Integer, ForeignKey("audit_projects.id", ondelete="CASCADE"), nullable=False)
    area = Column(String(100))  # semantics | structure | analytics | crm | creatives | landing | budget | offer | other
    finding_kind = Column(String(50), default="hypothesis")  # confirmed | hypothesis | needs_data
    title = Column(String(500))
    severity = Column(String(20))  # low | medium | high
    problem = Column(Text)
    evidence_json = Column(Text)  # JSON-строка
    evidence_level = Column(String(50))  # strong | medium | weak | none
    based_on = Column(Text)
    missing_data = Column(Text)
    recommendation = Column(Text)
    expected_impact = Column(Text)
    confidence = Column(Float)
    needs_review = Column(Boolean, default=False)
    review_reason = Column(Text)
    approved_for_kb = Column(Boolean, default=False)

    # Поля обратной связи маркетолога по AI-выводам
    status = Column(String(50), default="ai_generated")
    # ai_generated → human_confirmed → human_rejected → human_edited
    original_ai_output = Column(JSON)
    edited_output = Column(JSON)
    human_comment = Column(Text)
    edited_by = Column(String(255))
    edited_at = Column(DateTime)
    illustration_material_id = Column(Integer, ForeignKey("audit_materials.id", ondelete="SET NULL"), nullable=True)
    illustration_caption = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Связи
    audit_project = relationship("AuditProject", back_populates="findings")

class AuditRun(Base):
    __tablename__ = "audit_runs"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_project_id = Column(Integer, ForeignKey("audit_projects.id", ondelete="CASCADE"), nullable=False)
    action = Column(String(100), nullable=False)
    input_json = Column(Text)
    output_json = Column(Text)
    actor = Column(String(255))
    status = Column(String(50))  # success | failed
    error = Column(Text)
    duration_ms = Column(Integer)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Связи
    audit_project = relationship("AuditProject", back_populates="runs")


class AuditChatMessage(Base):
    __tablename__ = "audit_chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_project_id = Column(Integer, ForeignKey("audit_projects.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources_json = Column(Text)
    provider = Column(String(50))
    model_name = Column(String(100))
    confidence_level = Column(String(20))
    fallback_used = Column(Boolean, default=False)
    duration_ms = Column(Integer)
    context_version = Column(String(50))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    audit_project = relationship("AuditProject", back_populates="chat_messages")


class AuditChatTelemetryEvent(Base):
    __tablename__ = "audit_chat_telemetry_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    audit_project_id = Column(Integer, ForeignKey("audit_projects.id", ondelete="SET NULL"), nullable=True)
    provider = Column(String(50))
    model_name = Column(String(100))
    duration_ms = Column(Integer)
    fallback_used = Column(Boolean, default=False)
    sources_count = Column(Integer, default=0)
    include_unverified = Column(Boolean, default=True)
    confidence_level = Column(String(20), default="medium")
    errored = Column(Boolean, default=False)
    error_type = Column(String(50))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))