import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from . import identity, patients, scheduling, clinical, consultations, eecp, operations, settings_router, templates_router, catalogue_service, rx_service, immunization_service, settings_modules_service, billing_service, waiting_list, flowsheets, tasks_workflow, recalls, patient_alerts, quick_notes, referrals, analytics, ai_router, workflow_router, device_imports_router, phr_router, phr_settings_router, phr_service

app=FastAPI(title='Heal Your Heart EHR',version='0.1.0',docs_url='/docs',redoc_url='/redoc',openapi_url='/openapi.json')
app.include_router(immunization_service.router, prefix="/api/settings/immunization")
app.include_router(immunization_service.router, prefix="/settings/immunization")
app.include_router(settings_modules_service.router)
app.include_router(billing_service.router)
app.include_router(waiting_list.router)
app.include_router(workflow_router.router)
app.include_router(ai_router.router)
app.include_router(device_imports_router.router)
app.include_router(phr_router.router)
app.include_router(phr_settings_router.router)
for router in (identity.router,patients.router,scheduling.router,clinical.router,consultations.router,eecp.router,operations.router,settings_router.router,templates_router.router,catalogue_service.router,rx_service.router,flowsheets.router,tasks_workflow.router,recalls.router,patient_alerts.router,quick_notes.router,referrals.router,analytics.router): app.include_router(router)

@app.get('/api/docs', include_in_schema=False)
def api_docs_redirect():
    from fastapi.responses import RedirectResponse
    return RedirectResponse(url='/docs')


@app.middleware('http')
async def headers(request:Request,call_next):
    if request.headers.get('content-length','').isdigit() and int(request.headers['content-length'])>11*1024*1024:
        return JSONResponse({'detail':'Request too large'},status_code=413)
    origin=request.headers.get('origin')
    if origin and request.method not in ('GET','HEAD','OPTIONS'):
        permitted=set(os.getenv('EHR_ORIGINS','http://127.0.0.1:5173,http://localhost:5173,http://127.0.0.1:8000,http://localhost:8000,http://127.0.0.1:8001,http://localhost:8001').split(','))
        host=request.headers.get('host')
        same_origins={f"http://{host}",f"https://{host}"} if host else set()
        if origin not in permitted and origin not in same_origins: return JSONResponse({'detail':'Origin not allowed'},status_code=403)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Cache-Control']='no-store'
    response.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'

    path = request.url.path.lower()
    is_doc_stream = (
        path.startswith('/api/documents/') or
        path.startswith('/documents/') or
        path.startswith('/api/device-imports/') or
        path.startswith('/device-imports/') or
        path.startswith('/api/phr/') or
        path.startswith('/phr/') or
        path == '/phr' or
        'pdf' in path or
        'inline=true' in str(request.url.query).lower()
    )
    if is_doc_stream:
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: *; connect-src 'self' *; frame-ancestors 'self' *; object-src 'self' data: blob: *; base-uri 'self'; form-action 'self'"
        response.headers['Cache-Control'] = 'private, max-age=3600'
    else:
        response.headers['X-Frame-Options'] = 'SAMEORIGIN'
        response.headers['Content-Security-Policy'] = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self' *; object-src 'none'; base-uri 'self'; form-action 'self'"
    return response


@app.exception_handler(RequestValidationError)
@app.exception_handler(ValidationError)
async def validation_error(request,exc):
    return JSONResponse({'detail':'; '.join('.'.join(str(x) for x in e['loc'])+': '+e['msg'] for e in exc.errors())},status_code=422)


@app.exception_handler(IntegrityError)
async def integrity_error(request,exc):
    return JSONResponse({'detail':'Record conflicts with an existing record or a required relationship'},status_code=409)


@app.exception_handler(Exception)
async def unexpected_error(request,exc):
    import traceback
    traceback.print_exc()
    logging.getLogger('ehr').error('Request failed: %s: %s', type(exc).__name__, exc)
    return JSONResponse({'detail':'The operation could not be completed. No changes were saved.'},status_code=500)


@app.on_event('startup')
def startup_sync():
    try:
        from . import db
        db.init_db()
    except Exception as e:
        logging.getLogger('ehr').warning('Startup init_db failed: %s', e)
    try:
        settings_router.load_store()
    except Exception as e:
        logging.getLogger('ehr').warning('Startup settings sync failed: %s', e)
    try:
        from .db import engine
        from sqlalchemy import text
        with engine.begin() as conn:
            if engine.dialect.name == 'sqlite':
                cols = [r[1] for r in conn.execute(text("PRAGMA table_info(appointments)")).fetchall()]
                if 'token_number' not in cols:
                    conn.execute(text("ALTER TABLE appointments ADD COLUMN token_number INTEGER"))
                doc_cols = [r[1] for r in conn.execute(text("PRAGMA table_info(documents)")).fetchall()]
                if 'drive_file_id' not in doc_cols:
                    conn.execute(text("ALTER TABLE documents ADD COLUMN drive_file_id VARCHAR(120)"))
            else:
                conn.execute(text("ALTER TABLE documents ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(120)"))
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS waiting_list_entries (
                    id TEXT PRIMARY KEY,
                    facility_id TEXT,
                    data_json TEXT,
                    created_at TEXT
                )
            """))
    except Exception as e:
        logging.getLogger('ehr').warning('Startup migration failed: %s', e)
    try:
        from .db import SessionLocal
        with SessionLocal() as db:
            flowsheets.ensure_flowsheet_seed_data(db)
            tasks_workflow.ensure_clinical_tasks_seed_data(db)
            recalls.ensure_recalls_seed_data(db)
            phr_service.ensure_phr_seed_data(db)
            from .billing_service import ensure_all_facilities_billing_defaults
            ensure_all_facilities_billing_defaults(db)
            db.commit()
    except Exception as e:
        logging.getLogger('ehr').warning('Startup seed data failed: %s', e)
    try:
        from .db import SessionLocal
        from .device_import_service import backfill_and_repair_documents
        with SessionLocal() as db:
            backfill_and_repair_documents(db)
    except Exception as e:
        logging.getLogger('ehr').warning('Startup backfill_and_repair_documents failed: %s', e)
    try:
        from .device_import_service import poller
        poller.start()
    except Exception as e:
        logging.getLogger('ehr').warning('Startup device import poller failed: %s', e)


@app.on_event('shutdown')
def shutdown_background_tasks():
    try:
        from .device_import_service import poller
        poller.stop()
    except Exception as e:
        logging.getLogger('ehr').warning('Shutdown device import poller failed: %s', e)


@app.get('/api/health')
def health(): return {'status':'ok','mode':'development','external_integrations':False}

FRONTEND = Path(__file__).resolve().parents[2] / 'frontend' / 'dist'
FRONTEND_PUBLIC = Path(__file__).resolve().parents[2] / 'frontend' / 'public'

# PWA Web App Manifest endpoint
MANIFEST_FILE = FRONTEND / 'manifest.webmanifest' if (FRONTEND / 'manifest.webmanifest').exists() else (FRONTEND_PUBLIC / 'manifest.webmanifest')
if MANIFEST_FILE.exists():
    @app.get('/manifest.webmanifest')
    @app.get('/manifest.json')
    def get_manifest():
        return FileResponse(MANIFEST_FILE, media_type='application/manifest+json')

if FRONTEND.exists():
    app.mount('/assets', StaticFiles(directory=FRONTEND / 'assets'), name='assets')
    if (FRONTEND / 'images').exists():
        app.mount('/images', StaticFiles(directory=FRONTEND / 'images'), name='images')
    if (FRONTEND / 'icons').exists():
        app.mount('/icons', StaticFiles(directory=FRONTEND / 'icons'), name='icons')

    @app.get('/{path:path}')
    def spa(path: str):
        if path.startswith('api/') or path in ('docs', 'redoc', 'openapi.json'):
            return JSONResponse({'detail': 'Not found'}, status_code=404)
        target = FRONTEND / path
        if path and target.is_file():
            media_type = None
            if path.endswith('.webmanifest') or path.endswith('.json'):
                media_type = 'application/manifest+json'
            elif path.endswith('.js'):
                media_type = 'application/javascript'
            elif path.endswith('.png'):
                media_type = 'image/png'
            elif path.endswith('.ico'):
                media_type = 'image/x-icon'
            elif path.endswith('.svg'):
                media_type = 'image/svg+xml'
            return FileResponse(target, media_type=media_type)
        return FileResponse(FRONTEND / 'index.html')
