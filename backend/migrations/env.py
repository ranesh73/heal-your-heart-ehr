from alembic import context
import sqlalchemy as sa
from app.db import engine
from app.models import Base

def ensure_version_table(connection):
    inspector = sa.inspect(connection)
    if 'alembic_version' not in inspector.get_table_names():
        sa.Table(
            'alembic_version',
            sa.MetaData(),
            sa.Column('version_num', sa.String(64), nullable=False, primary_key=True),
        ).create(connection)
        return

    if connection.dialect.name == 'postgresql':
        version_column = next(
            (column for column in inspector.get_columns('alembic_version') if column['name'] == 'version_num'),
            None,
        )
        current_length = getattr(version_column['type'], 'length', None) if version_column else None
        if current_length is not None and current_length < 64:
            connection.execute(
                sa.text('ALTER TABLE alembic_version ALTER COLUMN version_num TYPE VARCHAR(64)')
            )

if context.is_offline_mode():
    context.configure(url=str(engine.url),target_metadata=Base.metadata,literal_binds=True)
    with context.begin_transaction(): context.run_migrations()
else:
    with engine.begin() as connection:
        ensure_version_table(connection)
    with engine.connect() as connection:
        context.configure(connection=connection,target_metadata=Base.metadata,compare_type=True,render_as_batch=engine.dialect.name=='sqlite')
        with context.begin_transaction(): context.run_migrations()
