import json
import sqlite3
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from .security import context

router = APIRouter(prefix='/api')
SETTINGS_FILE = Path(__file__).resolve().parent.parent / 'data' / 'settings_store.json'


def load_store():
    if not SETTINGS_FILE.exists():
        initial = {
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
        SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
            json.dump(initial, f, indent=2)
        return initial
    try:
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_store(store):
    SETTINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(store, f, indent=2)


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
    return store.get("custom_settings", {}).get(key, {})


@router.put('/admin/settings/{category}/{option}')
def save_setting_option(category: str, option: str, data: dict, c=Depends(context)):
    c.allow({'admin'})
    store = load_store()
    custom = store.setdefault("custom_settings", {})
    key = f"{category}:{option}"
    custom[key] = data
    save_store(store)
    return data

