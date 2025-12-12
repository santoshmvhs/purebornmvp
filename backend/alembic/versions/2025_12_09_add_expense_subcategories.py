"""add expense subcategories

Revision ID: add_expense_subcategories
Revises: add_byproducts_manufacturing
Create Date: 2025-12-09 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'add_expense_subcategories'
down_revision = 'add_byproducts_manufacturing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add description to expense_categories
    op.add_column(
        'expense_categories',
        sa.Column('description', sa.Text(), nullable=True)
    )
    
    # Create expense_subcategories table
    op.create_table(
        'expense_subcategories',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text('gen_random_uuid()')),
        sa.Column('category_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['category_id'], ['expense_categories.id'], ondelete='CASCADE')
    )
    
    # Add expense_subcategory_id to expenses table
    op.add_column(
        'expenses',
        sa.Column('expense_subcategory_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_expenses_subcategory',
        'expenses',
        'expense_subcategories',
        ['expense_subcategory_id'],
        ['id'],
        ondelete='RESTRICT'
    )


def downgrade() -> None:
    op.drop_constraint('fk_expenses_subcategory', 'expenses', type_='foreignkey')
    op.drop_column('expenses', 'expense_subcategory_id')
    op.drop_table('expense_subcategories')
    op.drop_column('expense_categories', 'description')

