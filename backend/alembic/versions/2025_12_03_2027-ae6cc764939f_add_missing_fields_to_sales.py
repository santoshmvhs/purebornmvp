"""add missing fields to sales

Revision ID: ae6cc764939f
Revises: add_oil_cake_sales
Create Date: 2025-12-03 20:27:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'ae6cc764939f'
down_revision = 'add_oil_cake_sales'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new columns to sales_new table
    op.add_column('sales_new', sa.Column('employee', sa.Text(), nullable=True))
    op.add_column('sales_new', sa.Column('partner_ref_id', sa.Text(), nullable=True))
    op.add_column('sales_new', sa.Column('charges', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales_new', sa.Column('charges_discount', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales_new', sa.Column('cgst_amount', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales_new', sa.Column('sgst_amount', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales_new', sa.Column('igst_amount', sa.Numeric(14, 2), nullable=False, server_default='0'))
    op.add_column('sales_new', sa.Column('round_off', sa.Numeric(14, 2), nullable=True))
    op.add_column('sales_new', sa.Column('payment_ref_mode', sa.Text(), nullable=True))
    op.add_column('sales_new', sa.Column('transaction_ref_id', sa.Text(), nullable=True))
    op.add_column('sales_new', sa.Column('status', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('sales_new', 'status')
    op.drop_column('sales_new', 'transaction_ref_id')
    op.drop_column('sales_new', 'payment_ref_mode')
    op.drop_column('sales_new', 'round_off')
    op.drop_column('sales_new', 'igst_amount')
    op.drop_column('sales_new', 'sgst_amount')
    op.drop_column('sales_new', 'cgst_amount')
    op.drop_column('sales_new', 'charges_discount')
    op.drop_column('sales_new', 'charges')
    op.drop_column('sales_new', 'partner_ref_id')
    op.drop_column('sales_new', 'employee')
