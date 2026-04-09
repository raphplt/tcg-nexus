"""Image analysis pipeline tables

Revision ID: 2025010601
Revises:
Create Date: 2025-01-06 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "2025010601"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("analysis_images"):
        op.create_table(
            "analysis_images",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("redis_key", sa.String(), nullable=False),
            sa.Column("filename", sa.String(), nullable=False),
            sa.Column("content_type", sa.String(), nullable=False),
            sa.Column("width", sa.Integer(), nullable=True),
            sa.Column("height", sa.Integer(), nullable=True),
            sa.Column("ttl_seconds", sa.Integer(), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    existing_analysis_indexes = {ix["name"] for ix in inspector.get_indexes("analysis_images")} if inspector.has_table("analysis_images") else set()
    if "ix_analysis_images_user_id" not in existing_analysis_indexes:
        op.create_index(op.f("ix_analysis_images_user_id"), "analysis_images", ["user_id"], unique=False)
    existing_analysis_uniques = {uc["name"] for uc in inspector.get_unique_constraints("analysis_images")} if inspector.has_table("analysis_images") else set()
    if "uq_analysis_images_redis_key" not in existing_analysis_uniques:
        op.create_unique_constraint(op.f("uq_analysis_images_redis_key"), "analysis_images", ["redis_key"])

    if not inspector.has_table("card_drafts"):
        op.create_table(
            "card_drafts",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("batch_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("candidates", sa.JSON(), nullable=False),
            sa.Column("top_candidate_id", sa.String(), nullable=True),
            sa.Column("top_candidate_score", sa.Float(), nullable=True),
            sa.Column("selected_card_id", sa.String(), nullable=True),
            sa.Column("detected_metadata", sa.JSON(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["image_id"], ["analysis_images.id"]),
            sa.ForeignKeyConstraint(["selected_card_id"], ["cards.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    existing_draft_indexes = {ix["name"] for ix in inspector.get_indexes("card_drafts")} if inspector.has_table("card_drafts") else set()
    if "ix_card_drafts_batch_id" not in existing_draft_indexes:
        op.create_index(op.f("ix_card_drafts_batch_id"), "card_drafts", ["batch_id"], unique=False)
    if "ix_card_drafts_user_id" not in existing_draft_indexes:
        op.create_index(op.f("ix_card_drafts_user_id"), "card_drafts", ["user_id"], unique=False)

    if not inspector.has_table("user_cards"):
        op.create_table(
            "user_cards",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("card_id", sa.String(), nullable=False),
            sa.Column("draft_id", postgresql.UUID(as_uuid=True), nullable=True),
            sa.Column("quantity", sa.Integer(), nullable=False),
            sa.Column("condition", sa.String(), nullable=False),
            sa.Column("price_paid", sa.Numeric(10, 2), nullable=True),
            sa.Column("acquired_at", sa.Date(), nullable=True),
            sa.Column("source", sa.String(), nullable=True),
            sa.Column("notes", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["card_id"], ["cards.id"]),
            sa.ForeignKeyConstraint(["draft_id"], ["card_drafts.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    existing_user_cards_indexes = {ix["name"] for ix in inspector.get_indexes("user_cards")} if inspector.has_table("user_cards") else set()
    if "ix_user_cards_card_id" not in existing_user_cards_indexes:
        op.create_index(op.f("ix_user_cards_card_id"), "user_cards", ["card_id"], unique=False)
    if "ix_user_cards_user_id" not in existing_user_cards_indexes:
        op.create_index(op.f("ix_user_cards_user_id"), "user_cards", ["user_id"], unique=False)

    if not inspector.has_table("user_master_set"):
        op.create_table(
            "user_master_set",
            sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("set_id", sa.String(), nullable=False),
            sa.Column("tracked_card_count", sa.Integer(), nullable=False),
            sa.Column("owned_card_count", sa.Integer(), nullable=False),
            sa.Column("completion_rate", sa.Float(), nullable=False),
            sa.Column("status", sa.String(), nullable=False),
            sa.Column("last_synced_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=True),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["set_id"], ["sets.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "set_id", name="user_master_set_user_set_key"),
        )
    existing_master_indexes = {ix["name"] for ix in inspector.get_indexes("user_master_set")} if inspector.has_table("user_master_set") else set()
    if "ix_user_master_set_set_id" not in existing_master_indexes:
        op.create_index(op.f("ix_user_master_set_set_id"), "user_master_set", ["set_id"], unique=False)
    if "ix_user_master_set_user_id" not in existing_master_indexes:
        op.create_index(op.f("ix_user_master_set_user_id"), "user_master_set", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_user_master_set_user_id"), table_name="user_master_set")
    op.drop_index(op.f("ix_user_master_set_set_id"), table_name="user_master_set")
    op.drop_table("user_master_set")
    op.drop_index(op.f("ix_user_cards_user_id"), table_name="user_cards")
    op.drop_index(op.f("ix_user_cards_card_id"), table_name="user_cards")
    op.drop_table("user_cards")
    op.drop_index(op.f("ix_card_drafts_user_id"), table_name="card_drafts")
    op.drop_index(op.f("ix_card_drafts_batch_id"), table_name="card_drafts")
    op.drop_table("card_drafts")
    op.drop_constraint(op.f("uq_analysis_images_redis_key"), "analysis_images", type_="unique")
    op.drop_index(op.f("ix_analysis_images_user_id"), table_name="analysis_images")
    op.drop_table("analysis_images")
