import json
import sqlite3
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from .security import context
from . import models as m
from .serialization import serialize

router = APIRouter(prefix='/api')
SETTINGS_FILE = Path(__file__).resolve().parent.parent / 'data' / 'settings_store.json'
SEED_FILE = Path(__file__).resolve().parent.parent / 'seed_data' / 'settings_store.json'


def load_store():
    store = {}
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
                store = json.load(f) or {}
        except Exception:
            store = {}
    
    # If store is missing or missing vital keys, auto-hydrate from SEED_FILE
    needs_save = False
    if SEED_FILE.exists():
        try:
            with open(SEED_FILE, 'r', encoding='utf-8') as f:
                seed = json.load(f) or {}
            for key, val in seed.items():
                if key not in store or (isinstance(val, list) and len(store.get(key, [])) == 0) or (isinstance(val, dict) and not store.get(key)):
                    store[key] = val
                    needs_save = True
        except Exception:
            pass

    if not store:
        store = {
            "kiosk_accounts": [
                {
                    "id": "kiosk-1",
                    "user_name": "neelankarai_1",
                    "access_through": "Web Browser, Tablet (iPad, GTab etc)",
                    "facilities": ["Heal Your Heart Neelankarai - HUH001", "Heal Your Heart Royapettah - HUH002", "4R Health & Wellness"],
                    "video_consult": "Not Required",
                    "modules": ["Patient Demographics", "Insurance", "Questionnaires", "Consent Forms"],
                    "checked_in_status": ""
                },
                {
                    "id": "kiosk-2",
                    "user_name": "kioskhuh001",
                    "access_through": "Kiosk Terminal (self check-in)",
                    "facilities": ["Heal Your Heart Neelankarai - HUH001"],
                    "video_consult": "Not Required",
                    "modules": ["Patient Demographics", "Consent Forms"],
                    "checked_in_status": ""
                }
            ],
            "departments": [
                {
                    "id": "dept-1",
                    "name": "Diagnostic",
                    "facility": "Heal Your Heart Neelankarai",
                    "members": ["Susan Sekar", "Dr. Elakkiya M", "Dr. Ramasamy S"]
                },
                {
                    "id": "dept-2",
                    "name": "EECP Therapy",
                    "facility": "Heal Your Heart Neelankarai",
                    "members": ["Hariharan S", "Kausiq SR", "Divya A", "Nathiya V"]
                },
                {
                    "id": "dept-3",
                    "name": "Cardiology Consultation",
                    "facility": "Heal Your Heart Neelankarai",
                    "members": ["Dr. Ramasamy S", "Dr. Ebinesh Joel"]
                }
            ],
            "roles": [
                {"id": "r-1", "name": "Accounts Assistant", "description": "Assists the Accounts Head and manages billing related operations.", "encounters": [], "labs": ["Add"], "gpt": [], "copilot": []},
                {"id": "r-2", "name": "Charm Assistant", "description": "Assist the organisation with maintaining CharmEHR", "encounters": [], "labs": ["Add", "Edit"], "gpt": ["Ask GPT"], "copilot": ["Text-Only Interaction"]},
                {"id": "r-3", "name": "Charted Accountant", "description": "Manages Accounts", "encounters": [], "labs": [], "gpt": [], "copilot": []},
                {"id": "r-4", "name": "Clinic Admin Asst", "description": "Assist the Clinic Administrator in managing the clinic.", "encounters": ["Start Encounter and Enter Vitals"], "labs": ["Add"], "gpt": [], "copilot": []},
                {"id": "r-5", "name": "Clinic Administrator", "description": "Manage the day-to-day operations of the clinic", "encounters": ["Start Encounter and Enter Vitals"], "labs": ["Add", "Edit", "Delete"], "gpt": ["Ask GPT"], "copilot": ["Text-Only Interaction"]},
                {"id": "r-6", "name": "Follow Up Assistant", "description": "To Follow Up patient", "encounters": [], "labs": [], "gpt": [], "copilot": []},
                {"id": "r-7", "name": "Lab Technician", "description": "Examines samples collected and updates results under lab records", "encounters": [], "labs": ["Add", "Edit", "Delete"], "gpt": [], "copilot": []},
                {"id": "r-8", "name": "PA", "description": "Assists patient calls and treatment room allotments.", "encounters": ["Start Encounter and Enter Vitals"], "labs": ["Add"], "gpt": [], "copilot": []},
                {"id": "r-9", "name": "Physician", "description": "A registered medical practitioner", "encounters": ["Start Encounter and Enter Vitals", "Enter SOAP Notes, Prescribe Medications and Order Labs/Images", "Add Quick Rx"], "labs": ["Add", "Edit", "Delete"], "gpt": ["Ask GPT", "Chart Note Assistance", "Referral Mail Assistance", "Lab Results Opinion"], "copilot": ["Text-Only Interaction", "Voice Chat", "Ambient Voice", "Consultation/ Encounter", "Nurse Triage", "Patient Summarization"]},
                {"id": "r-10", "name": "Physician Assistant", "description": "Certified medical assistant and works with a physician", "encounters": ["Start Encounter and Enter Vitals", "Enter SOAP Notes, Prescribe Medications and Order Labs/Images"], "labs": ["Add", "Edit"], "gpt": ["Ask GPT", "Chart Note Assistance"], "copilot": ["Text-Only Interaction"]},
                {"id": "r-11", "name": "PracticeAdmin", "description": "Member who is the administrator of the practice with permission to add other members", "encounters": ["Start Encounter and Enter Vitals", "Enter SOAP Notes, Prescribe Medications and Order Labs/Images", "Add Quick Rx", "View Private Encounters of other members"], "labs": ["Add", "Edit", "Delete"], "gpt": ["Ask GPT", "Chart Note Assistance"], "copilot": ["Text-Only Interaction", "Voice Chat", "Ambient Voice"]},
                {"id": "r-12", "name": "Receptionist", "description": "Appointment booking, patient registration and billing", "encounters": [], "labs": [], "gpt": [], "copilot": []},
                {"id": "r-13", "name": "Therapist", "description": "Nurse trained in EECP therapy", "encounters": ["Start Encounter and Enter Vitals"], "labs": ["Add"], "gpt": ["Ask GPT"], "copilot": ["Text-Only Interaction"]}
            ],
            "notifications": {
                "lab_results": [
                    {
                        "parameter": "Troponin-I",
                        "criteria": ">",
                        "value": "0.04 ng/mL",
                        "message": "Critical Alert: Elevated Troponin-I detected. Immediate clinical review required.",
                        "notified_members": [
                            {"name": "Dr. Ramasamy S", "phone": "9003070065", "sms": True, "email": True, "inside_product": True}
                        ]
                    },
                    {
                        "parameter": "Serum Potassium",
                        "criteria": ">",
                        "value": "5.5 mEq/L",
                        "message": "Hyperkalemia Alert: Serum potassium above threshold.",
                        "notified_members": [
                            {"name": "Dr. Ebinesh Joel", "phone": "9789455491", "sms": True, "email": True, "inside_product": True}
                        ]
                    }
                ]
            },
            "custom_settings": {}
        }
        needs_save = True

    if needs_save or not SETTINGS_FILE.exists():
        save_store(store)
    return store


def save_store(store):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(store, f, indent=2)
    try:
        SEED_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SEED_FILE, 'w', encoding='utf-8') as f:
            json.dump(store, f, indent=2)
    except Exception:
        pass


@router.get('/kiosk-accounts')
def get_kiosk_accounts(c=Depends(context)):
    return load_store().get("kiosk_accounts", [])


@router.post('/admin/kiosk-accounts')
def save_kiosk_account(data: dict, c=Depends(context)):
    c.allow({'admin'})
    store = load_store()
    accounts = store.get("kiosk_accounts", [])
    acc_id = data.get("id")
    if acc_id:
        for idx, a in enumerate(accounts):
            if a.get("id") == acc_id:
                accounts[idx] = data
                break
        else:
            accounts.append(data)
    else:
        import uuid
        data["id"] = "kiosk-" + str(uuid.uuid4())[:8]
        accounts.append(data)
    store["kiosk_accounts"] = accounts
    save_store(store)
    return data


@router.get('/departments')
def get_departments(c=Depends(context)):
    return load_store().get("departments", [])


@router.post('/admin/departments')
def save_department(data: dict, c=Depends(context)):
    c.allow({'admin'})
    store = load_store()
    depts = store.get("departments", [])
    dept_id = data.get("id")
    if dept_id:
        for idx, d in enumerate(depts):
            if d.get("id") == dept_id:
                depts[idx] = data
                break
        else:
            depts.append(data)
    else:
        import uuid
        data["id"] = "dept-" + str(uuid.uuid4())[:8]
        depts.append(data)
    store["departments"] = depts
    save_store(store)
    return data


@router.get('/roles-list')
def get_roles(c=Depends(context)):
    return load_store().get("roles", [])


@router.post('/admin/roles-list')
def save_role(data: dict, c=Depends(context)):
    c.allow({'admin'})
    store = load_store()
    roles = store.get("roles", [])
    role_id = data.get("id")
    if role_id:
        for idx, r in enumerate(roles):
            if r.get("id") == role_id:
                roles[idx] = data
                break
        else:
            roles.append(data)
    else:
        import uuid
        data["id"] = "r-" + str(uuid.uuid4())[:8]
        roles.append(data)
    store["roles"] = roles
    save_store(store)
    return data


@router.get('/notifications-rules')
def get_notifications(c=Depends(context)):
    return load_store().get("notifications", {})


@router.post('/admin/notifications-rules')
def save_notifications(data: dict, c=Depends(context)):
    c.allow({'admin'})
    store = load_store()
    store["notifications"] = data
    save_store(store)
    return data


# --- Calendar: Appointment Statuses ---
@router.get('/calendar/appointment-statuses')
def get_appointment_statuses(c=Depends(context)):
    return load_store().get("appointment_statuses", [])

@router.post('/admin/calendar/appointment-statuses')
def save_appointment_status(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = store.get("appointment_statuses", [])
    item_id = data.get("id")
    if item_id:
        for idx, it in enumerate(items):
            if it.get("id") == item_id:
                items[idx] = data
                break
        else:
            items.append(data)
    else:
        import uuid
        data["id"] = "status-" + str(uuid.uuid4())[:8]
        items.append(data)
    store["appointment_statuses"] = items
    save_store(store)
    return data

@router.delete('/admin/calendar/appointment-statuses/{item_id}')
def delete_appointment_status(item_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = [x for x in store.get("appointment_statuses", []) if x.get("id") != item_id]
    store["appointment_statuses"] = items
    save_store(store)
    return {"ok": True}


# --- Calendar: Visit Types ---
@router.get('/calendar/visit-types')
def get_visit_types(c=Depends(context)):
    return load_store().get("visit_types", [])

@router.post('/admin/calendar/visit-types')
def save_visit_type(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = store.get("visit_types", [])
    item_id = data.get("id")
    if item_id:
        for idx, it in enumerate(items):
            if it.get("id") == item_id:
                items[idx] = data
                break
        else:
            items.append(data)
    else:
        import uuid
        data["id"] = "vt-" + str(uuid.uuid4())[:8]
        items.append(data)
    store["visit_types"] = items
    save_store(store)
    return data

@router.delete('/admin/calendar/visit-types/{item_id}')
def delete_visit_type(item_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = [x for x in store.get("visit_types", []) if x.get("id") != item_id]
    store["visit_types"] = items
    save_store(store)
    return {"ok": True}


# --- Calendar: Event Types ---
@router.get('/calendar/event-types')
def get_event_types(c=Depends(context)):
    return load_store().get("event_types", [])

@router.post('/admin/calendar/event-types')
def save_event_type(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = store.get("event_types", [])
    item_id = data.get("id")
    if item_id:
        for idx, it in enumerate(items):
            if it.get("id") == item_id:
                items[idx] = data
                break
        else:
            items.append(data)
    else:
        import uuid
        data["id"] = "et-" + str(uuid.uuid4())[:8]
        items.append(data)
    store["event_types"] = items
    save_store(store)
    return data

@router.delete('/admin/calendar/event-types/{item_id}')
def delete_event_type(item_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = [x for x in store.get("event_types", []) if x.get("id") != item_id]
    store["event_types"] = items
    save_store(store)
    return {"ok": True}


# --- Calendar: Web Embeds ---
@router.get('/calendar/web-embeds')
def get_web_embeds(c=Depends(context)):
    return load_store().get("web_embeds", [])

@router.post('/admin/calendar/web-embeds')
def save_web_embed(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = store.get("web_embeds", [])
    item_id = data.get("id")
    if item_id:
        for idx, it in enumerate(items):
            if it.get("id") == item_id:
                items[idx] = data
                break
        else:
            items.append(data)
    else:
        import uuid
        data["id"] = "embed-" + str(uuid.uuid4())[:8]
        items.append(data)
    store["web_embeds"] = items
    save_store(store)
    return data

@router.delete('/admin/calendar/web-embeds/{item_id}')
def delete_web_embed(item_id: str, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    items = [x for x in store.get("web_embeds", []) if x.get("id") != item_id]
    store["web_embeds"] = items
    save_store(store)
    return {"ok": True}


# --- Calendar: Provider Timings ---
@router.get('/calendar/provider-timings')
def get_provider_timings(facility_id: str = None, provider_id: str = None, c=Depends(context)):
    store = load_store()
    timings = store.get("provider_timings", {})
    key = f"{facility_id or 'all'}_{provider_id or 'all'}"
    default_hours = store.get("provider_timings_default", {
        "Sunday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Monday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Tuesday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Wednesday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Thursday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Friday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
        "Saturday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False}
    })
    return timings.get(key, {"hours": default_hours, "exceptions": []})

@router.post('/admin/calendar/provider-timings')
def save_provider_timings(data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    store = load_store()
    timings = store.setdefault("provider_timings", {})
    facility_id = data.get("facility_id", "all")
    provider_id = data.get("provider_id", "all")
    key = f"{facility_id}_{provider_id}"
    timings[key] = {
        "hours": data.get("hours", {}),
        "exceptions": data.get("exceptions", [])
    }
    save_store(store)
    return timings[key]


@router.get('/settings/{category}/{option}')
def get_setting_option(category: str, option: str, c=Depends(context)):
    store = load_store()
    key = f"{category}:{option}"
    saved = store.get("custom_settings", {}).get(key)
    if saved is not None:
        return saved
    # Return structured defaults for Inventory settings
    if key == "inventory:inventory-vaccine-settings":
        return {
            "minKitThreshold": 10,
            "alertOnExpiryDays": 60,
            "useInventoryAndDispense": True,
            "recommendDrugsFromInHouse": True,
            "autoPopulateInvoiceFromChartNoteDrugs": True,
            "autoPopulateInvoiceFromChartNoteSupplements": True,
            "autoPopulateDispenseQuantity": True,
            "autoPopulateOnlySupportedUnits": True,
            "showStockInEncounter": True,
            "useVaccinesInventory": True,
        }
    if key == "inventory:multi-facility-store-settings":
        return {
            "enableMultiStore": False,
            "enableInterBranchTransfers": True,
        }
    if key == "inventory:e-commerce-settings":
        return {
            "enableECommerce": False,
            "allowPracticeOrders": False,
        }
    return {}


@router.put('/admin/settings/{category}/{option}')
def save_setting_option(category: str, option: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    key = f"{category}:{option}"
    if key == "inventory:inventory-vaccine-settings":
        if 'minKitThreshold' in data:
            try:
                val = int(data['minKitThreshold'])
                if val < 0:
                    raise ValueError()
                data['minKitThreshold'] = val
            except (ValueError, TypeError):
                raise HTTPException(422, 'Reorder level must be a positive number or zero')
        if 'alertOnExpiryDays' in data:
            try:
                val = int(data['alertOnExpiryDays'])
                if val < 0:
                    raise ValueError()
                data['alertOnExpiryDays'] = val
            except (ValueError, TypeError):
                raise HTTPException(422, 'Days before expiry warning alert must be a positive number or zero')

    store = load_store()
    custom = store.setdefault("custom_settings", {})
    custom[key] = data
    save_store(store)
    return data


# --- Calendar: Facility Timings & Time Zone ---
DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
DEFAULT_FACILITY_TIMEZONE = "( GMT 5:30 ) India Standard Time ( Asia/Kolkata )"


def parse_time_minutes(t_str: str) -> int:
    t_str = t_str.strip().lower()
    parts = t_str.split()
    if len(parts) != 2:
        raise ValueError(f"Invalid time format: {t_str}")
    time_part, meridian = parts
    h_str, m_str = time_part.split(':')
    hours = int(h_str)
    minutes = int(m_str)
    if meridian == 'pm' and hours != 12:
        hours += 12
    elif meridian == 'am' and hours == 12:
        hours = 0
    return hours * 60 + minutes


@router.get('/facilities/{facility_id}/timings')
def get_facility_timings(facility_id: str, c=Depends(context)):
    fac = c.db.get(m.Facility, facility_id)
    if not fac:
        raise HTTPException(404, 'Facility not found')

    rows = list(c.db.scalars(
        select(m.FacilityWorkingHours)
        .where(m.FacilityWorkingHours.facility_id == facility_id)
    ))
    existing_by_day = {r.day_of_week: r for r in rows}

    store = load_store()
    facility_store = store.get("facility_timings", {}).get(facility_id, {})

    tz = (
        rows[0].timezone if rows and rows[0].timezone
        else facility_store.get("timezone", DEFAULT_FACILITY_TIMEZONE)
    )

    days_data = []
    for day in DAYS_OF_WEEK:
        if day in existing_by_day:
            row = existing_by_day[day]
            days_data.append({
                "day_of_week": day,
                "is_working_day": bool(row.is_working_day),
                "start_time": row.start_time,
                "end_time": row.end_time,
                "timezone": row.timezone
            })
        elif day in facility_store.get("hours", {}):
            h = facility_store["hours"][day]
            days_data.append({
                "day_of_week": day,
                "is_working_day": bool(h.get("is_working_day", not h.get("holiday", False))),
                "start_time": h.get("start_time", "12:00 am"),
                "end_time": h.get("end_time", "11:45 pm"),
                "timezone": tz
            })
        else:
            days_data.append({
                "day_of_week": day,
                "is_working_day": day != "Sunday",
                "start_time": "12:00 am",
                "end_time": "11:45 pm",
                "timezone": tz
            })

    return {
        "facility_id": fac.id,
        "facility_code": fac.code,
        "facility_name": fac.name,
        "timezone": tz,
        "timings": days_data
    }


@router.get('/calendar/facility-timings')
def get_facility_timings_alias(facility_id: str = None, c=Depends(context)):
    target_fid = facility_id or c.facility_id
    if not target_fid:
        fac = c.db.scalars(select(m.Facility).limit(1)).first()
        target_fid = fac.id if fac else ""
    return get_facility_timings(target_fid, c)


@router.put('/facilities/{facility_id}/timings')
def save_facility_timings(facility_id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    fac = c.db.get(m.Facility, facility_id)
    if not fac:
        raise HTTPException(404, 'Facility not found')

    timings = data.get("timings", [])
    tz = data.get("timezone")

    for item in timings:
        day = item.get("day_of_week")
        if day not in DAYS_OF_WEEK:
            raise HTTPException(422, f"Invalid day of week: {day}")
        is_working = item.get("is_working_day", True)
        if is_working:
            start_t = item.get("start_time", "12:00 am")
            end_t = item.get("end_time", "11:45 pm")
            try:
                start_m = parse_time_minutes(start_t)
                end_m = parse_time_minutes(end_t)
            except Exception as e:
                raise HTTPException(422, f"Invalid time format on {day}: {e}")
            if end_m <= start_m:
                raise HTTPException(422, f"End time must be later than start time on {day}")

    existing_rows = {
        r.day_of_week: r
        for r in c.db.scalars(
            select(m.FacilityWorkingHours).where(m.FacilityWorkingHours.facility_id == facility_id)
        )
    }

    current_tz = tz or (
        next(iter(existing_rows.values())).timezone
        if existing_rows else DEFAULT_FACILITY_TIMEZONE
    )

    for item in timings:
        day = item["day_of_week"]
        is_working = bool(item.get("is_working_day", True))
        start_t = item.get("start_time", "12:00 am")
        end_t = item.get("end_time", "11:45 pm")
        item_tz = tz or item.get("timezone", current_tz)

        if day in existing_rows:
            row = existing_rows[day]
            row.is_working_day = is_working
            row.start_time = start_t
            row.end_time = end_t
            if tz:
                row.timezone = tz
            row.version += 1
        else:
            new_row = m.FacilityWorkingHours(
                id=str(uuid4()),
                facility_id=facility_id,
                timezone=item_tz,
                day_of_week=day,
                is_working_day=is_working,
                start_time=start_t,
                end_time=end_t
            )
            c.db.add(new_row)

    c.db.flush()

    store = load_store()
    fac_timings = store.setdefault("facility_timings", {})
    fac_timings[facility_id] = {
        "facility_id": facility_id,
        "timezone": current_tz,
        "hours": {
            item["day_of_week"]: {
                "is_working_day": bool(item.get("is_working_day", True)),
                "start_time": item.get("start_time", "12:00 am"),
                "end_time": item.get("end_time", "11:45 pm"),
            }
            for item in timings
        }
    }
    save_store(store)
    c.audit('update_facility_timings', fac)
    return {"ok": True, "facility_id": facility_id, "timezone": current_tz, "timings": timings}


@router.put('/facilities/{facility_id}/timezone')
def save_facility_timezone(facility_id: str, data: dict, c=Depends(context)):
    c.allow({'admin', 'doctor', 'reception', 'therapist'})
    fac = c.db.get(m.Facility, facility_id)
    if not fac:
        raise HTTPException(404, 'Facility not found')
    tz = data.get("timezone", "").strip()
    if not tz:
        raise HTTPException(422, "Timezone is required")

    rows = list(c.db.scalars(
        select(m.FacilityWorkingHours).where(m.FacilityWorkingHours.facility_id == facility_id)
    ))
    if rows:
        for r in rows:
            r.timezone = tz
            r.version += 1
    else:
        for day in DAYS_OF_WEEK:
            c.db.add(m.FacilityWorkingHours(
                id=str(uuid4()),
                facility_id=facility_id,
                timezone=tz,
                day_of_week=day,
                is_working_day=day != "Sunday",
                start_time="12:00 am",
                end_time="11:45 pm"
            ))
    c.db.flush()

    store = load_store()
    fac_timings = store.setdefault("facility_timings", {})
    if facility_id not in fac_timings:
        fac_timings[facility_id] = {"facility_id": facility_id, "hours": {}}
    fac_timings[facility_id]["timezone"] = tz
    save_store(store)
    c.audit('update_facility_timezone', fac)
    return {"ok": True, "facility_id": facility_id, "timezone": tz}

