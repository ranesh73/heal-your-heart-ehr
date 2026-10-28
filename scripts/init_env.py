"""Generate local-only secrets without printing or overwriting them."""
import secrets
from pathlib import Path

root=Path(__file__).resolve().parents[1]
env=root/'.env'
if env.exists():
    print('Existing .env retained.')
else:
    env.write_text('POSTGRES_PASSWORD='+secrets.token_urlsafe(32)+'\n',encoding='utf-8')
    print('Created ignored .env with a generated PostgreSQL password.')
