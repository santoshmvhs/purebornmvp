"""add byproducts to manufacturing batches

Revision ID: add_byproducts_manufacturing
Revises: ae6cc764939f
Create Date: 2025-12-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_byproducts_manufacturing'
down_revision = 'ae6cc764939f'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add byproducts JSON column to manufacturing_batches
    op.add_column(
        'manufacturing_batches',
        sa.Column('byproducts', postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('manufacturing_batches', 'byproducts')

