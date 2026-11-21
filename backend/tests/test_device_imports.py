"""
Comprehensive tests for Google Drive Background Polling & Auto-Import service.
"""
import io
import json
import os
import hashlib
from datetime import date
from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from sqlalchemy import select, delete

from app import models as m
from app.db import SessionLocal, DATA_DIR
from app.device_import_service import (
    extract_ecg_patient_id,
    extract_echo_patient_id,
    process_device_file,
    resolve_inbox_subfolders,
    DeviceImportPoller,
    DEFAULT_INBOX_FOLDER_ID,
)
from tests.test_workflows import client


def test_filename_parsers():
    # 1. ECG format: YYYYMMDD-HHMMSS-<6_digit_id>.pdf
    assert extract_ecg_patient_id("20261117-002208-000207.pdf") == "000207"
    assert extract_ecg_patient_id("20260101-123456-999999.PDF") == "999999"
    # Invalid ECG filenames
    assert extract_ecg_patient_id("invalid-format.pdf") is None
    assert extract_ecg_patient_id("20261117-002208-00207.pdf") is None  # 5 digits
    assert extract_ecg_patient_id("20261117-002208-0000207.pdf") is None  # 7 digits
    assert extract_ecg_patient_id("20261117-002208-000207.png") is None  # not pdf

    # 2. ECHO format: Extracts 6-digit patient ID
    assert extract_echo_patient_id("20261117-002208-000207.pdf") == "000207"
    assert extract_echo_patient_id("ECHO_000207.pdf") == "000207"
    assert extract_echo_patient_id("echo-report-000207-color.pdf") == "000207"
    assert extract_echo_patient_id("000207.pdf") == "000207"
    # Invalid ECHO filenames without 6 digits
    assert extract_echo_patient_id("echo_test_no_id.pdf") is None
    assert extract_echo_patient_id("echo_123.pdf") is None


def test_resolve_inbox_subfolders_with_mock():
    mock_service = MagicMock()
    # Mock list of subfolders: ECG, ECHO present; Processed, Unmatched missing
    mock_service.files().list().execute.return_value = {
        "files": [
            {"id": "folder_ecg_123", "name": "ECG"},
            {"id": "folder_echo_456", "name": "ECHO"},
        ]
    }
    # Mock folder creation for missing Processed and Unmatched
    mock_service.files().create().execute.side_effect = [
        {"id": "folder_proc_789", "name": "Processed"},
        {"id": "folder_unmatch_999", "name": "Unmatched"},
    ]

    folders = resolve_inbox_subfolders(mock_service, "root_inbox_id")
    assert folders["ECG"] == "folder_ecg_123"
    assert folders["ECHO"] == "folder_echo_456"
    assert folders["PROCESSED"] == "folder_proc_789"
    assert folders["UNMATCHED"] == "folder_unmatch_999"


def test_ecg_auto_import_workflow():
    with SessionLocal() as db_session:
        fac = db_session.scalar(select(m.Facility))
        doc_user = db_session.scalar(select(m.User).where(m.User.role == "doctor"))

        # Setup test patient with MRN HYN-MR-000207
        patient = db_session.scalar(select(m.Patient).where(m.Patient.mrn == "HYN-MR-000207"))
        if not patient:
            p_id = str(uuid4())
            patient = m.Patient(
                id=p_id,
                mrn="HYN-MR-000207",
                first_name="Radha",
                last_name="Krishnan",
                dob=date(1980, 5, 15),
                sex="female",
                primary_facility_id=fac.id,
                provider_id=doc_user.id,
                version=1,
            )
            db_session.add(patient)
            db_session.flush()

        # Clean existing processed records for this test file id if any
        db_session.execute(
            delete(m.ProcessedDeviceFile).where(
                m.ProcessedDeviceFile.google_file_id == "gdrive_file_ecg_001"
            )
        )

        # Setup pending ECG Image Order
        order_id = str(uuid4())
        order = m.ClinicalOrder(
            id=order_id,
            patient_id=patient.id,
            facility_id=fac.id,
            author_id=doc_user.id,
            kind="Image",
            name="ECG : Resting [ 93000 ]",
            status="Pending",
            lab_ref="00009901",
            version=1,
        )
        db_session.add(order)
        db_session.commit()

        # Mock Google Drive service
        mock_service = MagicMock()

        file_info = {
            "id": "gdrive_file_ecg_001",
            "name": "20261117-002208-000207.pdf",
        }
        mock_pdf_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

        result = process_device_file(
            db=db_session,
            drive_service=mock_service,
            file_info=file_info,
            modality="ECG",
            src_folder_id="folder_ecg",
            processed_folder_id="folder_processed",
            unmatched_folder_id="folder_unmatched",
            override_file_bytes=mock_pdf_bytes,
        )

        assert result["status"] == "completed"
        assert result["patient_mrn"] == "HYN-MR-000207"
        assert result["order_id"] == order_id

        # Verify Order was updated to Completed with reviewer kept
        db_session.expire_all()
        updated_order = db_session.get(m.ClinicalOrder, order_id)
        assert updated_order.status == "Completed"
        assert "ECG" in updated_order.result
        assert updated_order.reviewed_by == doc_user.id

        # Verify Document was created
        doc = db_session.scalar(select(m.Document).where(m.Document.order_id == order_id))
        assert doc is not None
        assert doc.patient_id == patient.id
        assert doc.filename == "20261117-002208-000207.pdf"
        assert doc.mime == "application/pdf"
        assert doc.size == len(mock_pdf_bytes)

        # Verify ProcessedDeviceFile was recorded
        proc_file = db_session.scalar(
            select(m.ProcessedDeviceFile).where(m.ProcessedDeviceFile.google_file_id == "gdrive_file_ecg_001")
        )
        assert proc_file is not None
        assert proc_file.modality == "ECG"
        assert proc_file.patient_id == patient.id

        # Verify Google Drive file was moved to Processed
        mock_service.files().update.assert_called_with(
            fileId="gdrive_file_ecg_001",
            addParents="folder_processed",
            removeParents="folder_ecg",
            fields="id, parents",
            supportsAllDrives=True,
        )

        # Test Idempotency: re-processing same file_id skips cleanly
        result2 = process_device_file(
            db=db_session,
            drive_service=mock_service,
            file_info=file_info,
            modality="ECG",
            src_folder_id="folder_ecg",
            processed_folder_id="folder_processed",
            unmatched_folder_id="folder_unmatched",
            override_file_bytes=mock_pdf_bytes,
        )
        assert result2["status"] == "already_processed"


def test_echo_auto_import_workflow():
    with SessionLocal() as db_session:
        fac = db_session.scalar(select(m.Facility))
        doc_user = db_session.scalar(select(m.User).where(m.User.role == "doctor"))

        patient = db_session.scalar(select(m.Patient).where(m.Patient.mrn == "HYN-MR-000208"))
        if not patient:
            p_id = str(uuid4())
            patient = m.Patient(
                id=p_id,
                mrn="HYN-MR-000208",
                first_name="Sundar",
                last_name="Raman",
                dob=date(1978, 11, 20),
                sex="male",
                primary_facility_id=fac.id,
                provider_id=doc_user.id,
                version=1,
            )
            db_session.add(patient)
            db_session.flush()

        db_session.execute(
            delete(m.ProcessedDeviceFile).where(
                m.ProcessedDeviceFile.google_file_id == "gdrive_file_echo_002"
            )
        )

        # Setup pending ECHO Image Order
        order_id = str(uuid4())
        order = m.ClinicalOrder(
            id=order_id,
            patient_id=patient.id,
            facility_id=fac.id,
            author_id=doc_user.id,
            kind="Image",
            name="ECHO : Ejection Fraction / RWMA / PAH [ 93306 ]",
            status="Pending",
            lab_ref="00009902",
            version=1,
        )
        db_session.add(order)
        db_session.commit()

        mock_service = MagicMock()
        file_info = {
            "id": "gdrive_file_echo_002",
            "name": "ECHO_000208.pdf",
        }
        mock_bytes = b"%PDF-1.4 ECHO Report Content"

        result = process_device_file(
            db=db_session,
            drive_service=mock_service,
            file_info=file_info,
            modality="ECHO",
            src_folder_id="folder_echo",
            processed_folder_id="folder_processed",
            unmatched_folder_id="folder_unmatched",
            override_file_bytes=mock_bytes,
        )

        assert result["status"] == "completed"
        assert result["order_id"] == order_id

        db_session.expire_all()
        updated_order = db_session.get(m.ClinicalOrder, order_id)
        assert updated_order.status == "Completed"
        assert "ECHO" in updated_order.result


def test_modality_isolation_rule_ecg_does_not_attach_to_echo():
    """
    Never attach an ECG file to an ECHO order or vice versa.
    If a patient only has a pending ECHO order and an ECG file arrives,
    it must NOT match and must be moved to Unmatched.
    """
    with SessionLocal() as db_session:
        fac = db_session.scalar(select(m.Facility))
        doc_user = db_session.scalar(select(m.User).where(m.User.role == "doctor"))

        patient = db_session.scalar(select(m.Patient).where(m.Patient.mrn == "HYN-MR-000209"))
        if not patient:
            p_id = str(uuid4())
            patient = m.Patient(
                id=p_id,
                mrn="HYN-MR-000209",
                first_name="Mohan",
                last_name="K",
                dob=date(1965, 3, 10),
                sex="male",
                primary_facility_id=fac.id,
                provider_id=doc_user.id,
                version=1,
            )
            db_session.add(patient)
            db_session.flush()

        db_session.execute(
            delete(m.UnmatchedDeviceImport).where(
                m.UnmatchedDeviceImport.google_file_id == "gdrive_file_ecg_wrong_modality"
            )
        )

        # Patient only has a pending ECHO order, NO ECG order
        order_id = str(uuid4())
        order = m.ClinicalOrder(
            id=order_id,
            patient_id=patient.id,
            facility_id=fac.id,
            author_id=doc_user.id,
            kind="Image",
            name="ECHO : 2D Echocardiography with Color Doppler",
            status="Pending",
            lab_ref="00009903",
            version=1,
        )
        db_session.add(order)
        db_session.commit()

        mock_service = MagicMock()
        file_info = {
            "id": "gdrive_file_ecg_wrong_modality",
            "name": "20261117-002208-000209.pdf",
        }

        result = process_device_file(
            db=db_session,
            drive_service=mock_service,
            file_info=file_info,
            modality="ECG",  # Modality is ECG
            src_folder_id="folder_ecg",
            processed_folder_id="folder_processed",
            unmatched_folder_id="folder_unmatched",
            override_file_bytes=b"%PDF-Mock",
        )

        # Must be unmatched because no ECG pending order exists
        assert result["status"] == "unmatched"
        assert "No pending ECG Image Order" in result["reason"]

        # Verify ECHO order was NOT modified
        db_session.expire_all()
        echo_order = db_session.get(m.ClinicalOrder, order_id)
        assert echo_order.status == "Pending"

        # Verify moved to Unmatched in Google Drive
        mock_service.files().update.assert_called_with(
            fileId="gdrive_file_ecg_wrong_modality",
            addParents="folder_unmatched",
            removeParents="folder_ecg",
            fields="id, parents",
            supportsAllDrives=True,
        )

        # Verify record in unmatched_device_imports
        unmatched_rec = db_session.scalar(
            select(m.UnmatchedDeviceImport).where(
                m.UnmatchedDeviceImport.google_file_id == "gdrive_file_ecg_wrong_modality"
            )
        )
        assert unmatched_rec is not None
        assert unmatched_rec.modality == "ECG"
        assert unmatched_rec.patient_id == patient.id


def test_unmatched_missing_patient():
    with SessionLocal() as db_session:
        mock_service = MagicMock()
        file_info = {
            "id": "gdrive_file_unknown_patient",
            "name": "20261117-002208-000999.pdf",
        }

        result = process_device_file(
            db=db_session,
            drive_service=mock_service,
            file_info=file_info,
            modality="ECG",
            src_folder_id="folder_ecg",
            processed_folder_id="folder_processed",
            unmatched_folder_id="folder_unmatched",
            override_file_bytes=b"%PDF-Mock",
        )

        assert result["status"] == "unmatched"
        assert "not found" in result["reason"]

        unmatched_rec = db_session.scalar(
            select(m.UnmatchedDeviceImport).where(
                m.UnmatchedDeviceImport.google_file_id == "gdrive_file_unknown_patient"
            )
        )
        assert unmatched_rec is not None
        assert unmatched_rec.target_mrn == "HYN-MR-000999"


def test_device_imports_rest_endpoints():
    auth_c = client("doctor")

    # 1. GET /api/device-imports/status
    resp = auth_c.get("/api/device-imports/status")
    assert resp.status_code == 200
    data = resp.json()
    assert "is_running" in data
    assert "total_processed_count" in data

    # 2. GET /api/device-imports/unmatched
    resp_unmatched = auth_c.get("/api/device-imports/unmatched")
    assert resp_unmatched.status_code == 200
    assert isinstance(resp_unmatched.json(), list)

    # 3. GET /api/device-imports/processed
    resp_processed = auth_c.get("/api/device-imports/processed")
    assert resp_processed.status_code == 200
    assert isinstance(resp_processed.json(), list)


def test_document_drive_fallback_when_local_disk_missing(monkeypatch):
    """
    Test that when local disk storage is wiped (e.g. Render redeploy),
    the document download/preview endpoint fetches the file from Google Drive,
    returns it with inline Content-Disposition, and caches it back to local disk.
    """
    auth_c = client("doctor")
    mock_pdf = b"%PDF-1.4 Fallback Streamed PDF Content"

    with SessionLocal() as db_session:
        fac = db_session.scalar(select(m.Facility))
        doc_user = db_session.scalar(select(m.User).where(m.User.role == "doctor"))
        patient = db_session.scalar(select(m.Patient))

        storage_key = str(uuid4())
        doc_id = str(uuid4())
        doc = m.Document(
            id=doc_id,
            patient_id=patient.id,
            facility_id=fac.id,
            author_id=doc_user.id,
            title="Auto-Imported ECG Test Fallback",
            filename="20261116-034934-000003.pdf",
            storage_key=storage_key,
            drive_file_id="mock_gdrive_file_id_0003",
            mime="application/pdf",
            size=len(mock_pdf),
            sha256=hashlib.sha256(mock_pdf).hexdigest(),
            created_at=m.now(),
            version=1,
        )
        db_session.add(doc)
        db_session.commit()

    # Ensure local disk file is missing (simulate Render redeploy wipe)
    disk_file = DATA_DIR / "documents" / storage_key
    if disk_file.is_file():
        disk_file.unlink()

    from app import device_import_service
    monkeypatch.setattr(device_import_service, "get_google_drive_service", lambda: object())
    monkeypatch.setattr(device_import_service, "download_file_bytes", lambda service, file_id: mock_pdf)

    # 1. Fetch via /download?inline=true
    resp = auth_c.get(f"/api/documents/{doc_id}/download?inline=true")
    assert resp.status_code == 200
    assert resp.content == mock_pdf
    assert "inline" in resp.headers.get("content-disposition", "")
    assert resp.headers.get("x-frame-options") == "SAMEORIGIN"
    assert "frame-ancestors 'self' *" in resp.headers.get("content-security-policy", "")

    # Verify that the file was cached to disk
    assert disk_file.is_file()
    assert disk_file.read_bytes() == mock_pdf

    # 2. Fetch via /preview route
    resp_preview = auth_c.get(f"/api/documents/{doc_id}/preview")
    assert resp_preview.status_code == 200
    assert resp_preview.content == mock_pdf

