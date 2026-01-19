"""add oil cake sales table

Revision ID: add_oil_cake_sales
Revises: comprehensive_schema
Create Date: 2025-12-03 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_oil_cake_sales'
down_revision = 'comprehensive_schema'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'oil_cake_sales',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('customer_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('cake_category', sa.Text(), nullable=False),
        sa.Column('cake', sa.Text(), nullable=False),
        sa.Column('quantity', sa.Numeric(14, 3), nullable=False),
        sa.Column('price_per_kg', sa.Numeric(14, 2), nullable=False),
        sa.Column('total', sa.Numeric(14, 2), nullable=False),
        sa.Column('is_paid', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('remarks', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['customer_id'], ['customers_new.id'], ondelete='RESTRICT')
    )
    
    # Create index on date for faster queries
    op.create_index('ix_oil_cake_sales_date', 'oil_cake_sales', ['date'])
    op.create_index('ix_oil_cake_sales_customer_id', 'oil_cake_sales', ['customer_id'])


def downgrade() -> None:
    op.drop_index('ix_oil_cake_sales_customer_id', table_name='oil_cake_sales')
    op.drop_index('ix_oil_cake_sales_date', table_name='oil_cake_sales')
    op.drop_table('oil_cake_sales')

