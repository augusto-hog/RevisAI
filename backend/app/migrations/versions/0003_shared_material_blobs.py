from alembic import op
import sqlalchemy as sa

revision = "0003_shared_material_blobs"
down_revision = "0002_study_library"
branch_labels = None
depends_on = None


def upgrade():
    inspector = sa.inspect(op.get_bind())
    tables = set(inspector.get_table_names())
    if "material_blobs" not in tables:
        op.create_table(
            "material_blobs",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("sha256", sa.String(64), nullable=False, unique=True),
            sa.Column("stored_name", sa.String(80), nullable=False, unique=True),
            sa.Column("size", sa.Integer(), nullable=False),
        )
    material_columns = {column["name"] for column in inspector.get_columns("materials")}
    if "blob_id" not in material_columns:
        # SQLite cannot ALTER TABLE to add a foreign-key constraint. Alembic's
        # batch mode rebuilds the table while preserving all existing rows.
        with op.batch_alter_table("materials", recreate="always") as batch:
            batch.add_column(sa.Column(
                "blob_id", sa.Integer(), nullable=True,
            ))
            batch.create_foreign_key(
                "fk_materials_blob_id_material_blobs", "material_blobs",
                ["blob_id"], ["id"], ondelete="RESTRICT",
            )
    bind = op.get_bind()
    rows = bind.execute(sa.text("SELECT id, sha256, stored_name, size, blob_id FROM materials")).mappings()
    blobs_by_hash = {}
    for row in rows:
        blob_id = row["blob_id"]
        if blob_id is None:
            blob_id = blobs_by_hash.get(row["sha256"])
            if blob_id is None:
                existing = bind.execute(
                    sa.text("SELECT id FROM material_blobs WHERE sha256 = :hash"),
                    {"hash": row["sha256"]},
                ).first()
                if existing:
                    blob_id = existing[0]
                else:
                    result = bind.execute(
                        sa.text("INSERT INTO material_blobs (sha256, stored_name, size) VALUES (:hash, :name, :size)"),
                        {"hash": row["sha256"], "name": row["stored_name"], "size": row["size"]},
                    )
                    blob_id = result.lastrowid
                blobs_by_hash[row["sha256"]] = blob_id
            bind.execute(sa.text("UPDATE materials SET blob_id = :blob WHERE id = :id"), {"blob": blob_id, "id": row["id"]})


def downgrade():
    with op.batch_alter_table("materials") as batch:
        batch.drop_column("blob_id")
    op.drop_table("material_blobs")
