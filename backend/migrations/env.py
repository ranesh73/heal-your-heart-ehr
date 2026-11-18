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

def get_engine():
    connectable = context.config.attributes.get('connection', None)
    if connectable is not None:
        return connectable
    url = context.config.get_main_option("sqlalchemy.url")
    if url and not url.endswith("/data/ehr.db") and not url.endswith(r"\data\ehr.db") and url != "sqlite:///data/ehr.db":
        return sa.create_engine(url)
    from app.db import engine
    return engine

target_engine = get_engine()

if context.is_offline_mode():
    context.configure(url=str(target_engine.url),target_metadata=Base.metadata,literal_binds=True)
    with context.begin_transaction(): context.run_migrations()
else:
    with target_engine.begin() as connection:
        ensure_version_table(connection)
    with target_engine.connect() as connection:
        context.configure(connection=connection,target_metadata=Base.metadata,compare_type=True,render_as_batch=connection.dialect.name=='sqlite')
        with context.begin_transaction(): context.run_migrations()
