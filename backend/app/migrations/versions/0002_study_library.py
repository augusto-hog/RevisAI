from alembic import op
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, inspect, text

revision = "0002_study_library"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    bind = op.get_bind()
    inspector = inspect(bind)
    existing = set(inspector.get_table_names())
    if "projects" not in existing:
        op.create_table("projects", Column("id", Integer, primary_key=True), Column("name", String(120), nullable=False), Column("description", Text, nullable=False, server_default=""), Column("kind", String(20), nullable=False, server_default="livre"), Column("created_at", DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False))
    if "disciplines" not in existing:
        op.create_table("disciplines", Column("id", Integer, primary_key=True), Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False), Column("name", String(120), nullable=False), Column("position", Integer, nullable=False, server_default="0"))
    if "subjects" not in existing:
        op.create_table("subjects", Column("id", Integer, primary_key=True), Column("discipline_id", Integer, ForeignKey("disciplines.id", ondelete="CASCADE"), nullable=False), Column("name", String(140), nullable=False), Column("position", Integer, nullable=False, server_default="0"))
    if "topics" not in existing:
        op.create_table("topics", Column("id", Integer, primary_key=True), Column("subject_id", Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=False), Column("name", String(160), nullable=False), Column("position", Integer, nullable=False, server_default="0"))
    if "materials" not in existing:
        op.create_table("materials", Column("id", Integer, primary_key=True), Column("project_id", Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False), Column("name", String(255), nullable=False), Column("format", String(10), nullable=False), Column("size", Integer, nullable=False), Column("stored_name", String(80), nullable=False, unique=True), Column("sha256", String(64), nullable=False), Column("status", String(30), nullable=False), Column("extracted_text", Text, nullable=False, server_default=""), Column("imported_at", DateTime, server_default=text("CURRENT_TIMESTAMP"), nullable=False))

def downgrade():
    op.drop_table("materials")
    op.drop_table("topics")
    op.drop_table("subjects")
    op.drop_table("disciplines")
    op.drop_table("projects")
