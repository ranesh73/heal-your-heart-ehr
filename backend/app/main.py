import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import ValidationError
from sqlalchemy.exc import IntegrityError
from . import identity, patients, scheduling, clinical, eecp, operations, settings_router, templates_router

app=FastAPI(title='Heal Your Heart EHR',version='0.1.0',docs_url='/api/docs' if os.getenv('EHR_API_DOCS')=='1' else None,redoc_url=None,openapi_url='/api/openapi.json' if os.getenv('EHR_API_DOCS')=='1' else None)
for router in (identity.router,patients.router,scheduling.router,clinical.router,eecp.router,operations.router,settings_router.router,templates_router.router): app.include_router(router)


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
    response.headers['X-Frame-Options']='DENY'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['Cache-Control']='no-store'
    response.headers['Permissions-Policy']='camera=(), microphone=(), geolocation=()'
    response.headers['Content-Security-Policy']="default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'"
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
    logging.getLogger('ehr').error('Request failed: %s',type(exc).__name__)
    return JSONResponse({'detail':'The operation could not be completed. No changes were saved.'},status_code=500)


@app.get('/api/health')
def health(): return {'status':'ok','mode':'development','external_integrations':False}

FRONTEND=Path(__file__).resolve().parents[2]/'frontend'/'dist'
if FRONTEND.exists():
    app.mount('/assets',StaticFiles(directory=FRONTEND/'assets'),name='assets')
    @app.get('/{path:path}')
    def spa(path:str):
        if path.startswith('api/'):
            return JSONResponse({'detail':'Not found'},status_code=404)
        return FileResponse(FRONTEND/'index.html')
