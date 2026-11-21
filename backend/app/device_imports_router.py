"""
REST endpoints for Google Drive Device Import service and Unmatched imports management.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, desc

from . import models as m
from .security import context, CLINICAL
from .device_import_service import poller, process_device_file, get_google_drive_service, resolve_inbox_subfolders
from .serialization import serialize

router = APIRouter(prefix="/api/device-imports", tags=["device-imports"])


@router.get("/status")
def get_device_imports_status(c=Depends(context)):
    c.allow(CLINICAL | {"admin"})
    state = dict(poller.state)
    has_creds = bool(get_google_drive_service())
    state["has_credentials"] = has_creds
    return state


@router.post("/poll-now")
def trigger_poll_now(c=Depends(context)):
    c.allow(CLINICAL | {"admin"})
    result = poller.poll_once()
    c.audit("trigger_device_import_poll", c.user)
    return result


@router.get("/unmatched")
def list_unmatched_imports(
    modality: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    c=Depends(context),
):
    c.allow(CLINICAL | {"admin"})
    query = select(m.UnmatchedDeviceImport)
    if modality:
        query = query.where(m.UnmatchedDeviceImport.modality == modality.upper())
    rows = c.db.scalars(query.order_by(desc(m.UnmatchedDeviceImport.created_at)).limit(limit)).all()
    return [serialize(r) for r in rows]


@router.get("/processed")
def list_processed_imports(
    modality: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    c=Depends(context),
):
    c.allow(CLINICAL | {"admin"})
    query = select(m.ProcessedDeviceFile)
    if modality:
        query = query.where(m.ProcessedDeviceFile.modality == modality.upper())
    rows = c.db.scalars(query.order_by(desc(m.ProcessedDeviceFile.processed_at)).limit(limit)).all()
    return [serialize(r) for r in rows]


@router.post("/unmatched/{identifier}/retry")
def retry_unmatched_import(identifier: str, c=Depends(context)):
    c.allow(CLINICAL | {"admin"})
    unmatched = c.db.get(m.UnmatchedDeviceImport, identifier)
    if not unmatched:
        raise HTTPException(404, "Unmatched import record not found")

    service = get_google_drive_service()
    if not service:
        raise HTTPException(503, "Google Drive service is not connected")

    root_id = poller.state.get("inbox_folder_id") or poller.DEFAULT_INBOX_FOLDER_ID
    subfolders = resolve_inbox_subfolders(service, root_id)
    unmatched_folder_id = subfolders.get("UNMATCHED")
    processed_folder_id = subfolders.get("PROCESSED")

    if not unmatched_folder_id or not processed_folder_id:
        raise HTTPException(500, "Unmatched or Processed subfolder missing in Google Drive")

    file_info = {"id": unmatched.google_file_id, "name": unmatched.file_name}
    res = process_device_file(
        db=c.db,
        drive_service=service,
        file_info=file_info,
        modality=unmatched.modality,
        src_folder_id=unmatched_folder_id,
        processed_folder_id=processed_folder_id,
        unmatched_folder_id=unmatched_folder_id,
    )

    if res.get("status") == "completed":
        # Remove from unmatched table since it succeeded
        c.db.delete(unmatched)
        c.db.commit()

    c.audit("retry_unmatched_import", unmatched)
    return res


@router.get("/drive-stream/{file_id}")
@router.get("/drive-preview/{file_id}")
def stream_drive_file(file_id: str, c=Depends(context)):
    """
    Proxy stream a Google Drive file directly through our backend with inline Content-Disposition
    and permissive frame-ancestors headers so it renders cleanly in EHR iframes.
    """
    c.allow(CLINICAL | {"admin"})
    service = get_google_drive_service()
    if not service:
        raise HTTPException(503, "Google Drive service is not configured or authenticated")
    try:
        from .device_import_service import download_file_bytes
        file_bytes = download_file_bytes(service, file_id)
        filename = f"{file_id}.pdf"
        mime = "application/pdf"
        try:
            meta = service.files().get(fileId=file_id, fields="name,mimeType").execute()
            filename = meta.get("name", filename)
            mime = meta.get("mimeType", mime)
        except Exception:
            pass

        from fastapi import Response
        return Response(
            content=file_bytes,
            media_type=mime,
            headers={
                "Content-Disposition": f'inline; filename="{filename}"',
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "SAMEORIGIN",
                "Content-Security-Policy": "frame-ancestors 'self' *",
            },
        )
    except Exception as e:
        raise HTTPException(500, f"Error streaming file from Google Drive: {e}")
