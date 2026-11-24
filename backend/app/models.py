from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Project(Base):
    __tablename__ = "projects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    kind: Mapped[str] = mapped_column(String(20), default="livre", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    disciplines: Mapped[list[Discipline]] = relationship(back_populates="project", cascade="all, delete-orphan", order_by=lambda: (Discipline.position, Discipline.id))
    materials: Mapped[list[Material]] = relationship(back_populates="project", cascade="all, delete-orphan")


class Discipline(Base):
    __tablename__ = "disciplines"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    project: Mapped[Project] = relationship(back_populates="disciplines")
    subjects: Mapped[list[Subject]] = relationship(back_populates="discipline", cascade="all, delete-orphan", order_by=lambda: (Subject.position, Subject.id))


class Subject(Base):
    __tablename__ = "subjects"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    discipline_id: Mapped[int] = mapped_column(ForeignKey("disciplines.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    discipline: Mapped[Discipline] = relationship(back_populates="subjects")
    topics: Mapped[list[Topic]] = relationship(back_populates="subject", cascade="all, delete-orphan", order_by=lambda: (Topic.position, Topic.id))


class Topic(Base):
    __tablename__ = "topics"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    subject_id: Mapped[int] = mapped_column(ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    subject: Mapped[Subject] = relationship(back_populates="topics")


class Material(Base):
    __tablename__ = "materials"
    __table_args__ = (UniqueConstraint("project_id", "sha256", name="uq_material_project_hash"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    format: Mapped[str] = mapped_column(String(10), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    stored_name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    sha256: Mapped[str] = mapped_column(String(64), nullable=False)
    blob_id: Mapped[int | None] = mapped_column(ForeignKey("material_blobs.id", ondelete="RESTRICT"), nullable=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    extracted_text: Mapped[str] = mapped_column(Text, default="", nullable=False)
    imported_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.current_timestamp())
    project: Mapped[Project] = relationship(back_populates="materials")
    blob: Mapped[MaterialBlob | None] = relationship(back_populates="materials")


class MaterialBlob(Base):
    __tablename__ = "material_blobs"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sha256: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    stored_name: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    materials: Mapped[list[Material]] = relationship(back_populates="blob")
