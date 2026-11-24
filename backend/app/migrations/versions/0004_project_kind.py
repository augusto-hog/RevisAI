from alembic import op
import sqlalchemy as sa


revision = "0004_project_kind"
down_revision = "0003_shared_material_blobs"
branch_labels = None
depends_on = None


def upgrade():
    """Add the project kind column to databases with a pre-existing projects table."""
    inspector = sa.inspect(op.get_bind())
    if "projects" not in inspector.get_table_names():
        # The previous migration normally creates this table. Keep this
        # migration defensive for partially initialized legacy databases.
        return

    columns = {column["name"] for column in inspector.get_columns("projects")}
    if "kind" not in columns:
        op.add_column(
            "projects",
            sa.Column("kind", sa.String(20), nullable=False, server_default="livre"),
        )


def downgrade():
    inspector = sa.inspect(op.get_bind())
    if "projects" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("projects")}
    if "kind" in columns:
        with op.batch_alter_table("projects", recreate="always") as batch:
            batch.drop_column("kind")
