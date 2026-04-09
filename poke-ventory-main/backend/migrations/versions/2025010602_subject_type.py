"""Add subject_type to card_drafts

Revision ID: 2025010602
Revises: 2025010601
Create Date: 2025-01-06 12:00:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = "2025010602"
down_revision = "2025010601"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "card_drafts",
        sa.Column("subject_type", sa.String(), nullable=False, server_default="cards"),
    )
    op.execute("UPDATE card_drafts SET subject_type='cards' WHERE subject_type IS NULL")
    op.alter_column("card_drafts", "subject_type", server_default=None)


def downgrade() -> None:
    op.drop_column("card_drafts", "subject_type")
