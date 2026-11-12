import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent

initial_appointment_statuses = [
    {"id": "status-1", "name": "Absent", "color": "#0000ff"},
    {"id": "status-2", "name": "Admission", "color": "#004d40"},
    {"id": "status-3", "name": "Checked in", "color": "#008000"},
    {"id": "status-4", "name": "Confirmed", "color": "#84cc16"},
    {"id": "status-5", "name": "Consultation / Demo", "color": "#854d0e"},
    {"id": "status-6", "name": "Consulted", "color": "#1e1b4b"},
    {"id": "status-7", "name": "Diabetic / HT Management", "color": "#d97706"},
    {"id": "status-8", "name": "Discharge", "color": "#06b6d4"},
    {"id": "status-9", "name": "EECP Treatment 1st Day", "color": "#ea580c"},
    {"id": "status-10", "name": "EECP Treatment 20 Sessions 1st Day", "color": "#dc2626"},
    {"id": "status-11", "name": "EECP Treatment Completed", "color": "#64748b"},
    {"id": "status-12", "name": "EECP Treatment Started", "color": "#78350f"},
    {"id": "status-13", "name": "No show", "color": "#9ca3af"},
]

initial_visit_types = [
    {"id": "vt-1", "name": "Absent", "mode": "In Person", "duration": 0, "color": "#84cc16"},
    {"id": "vt-2", "name": "Admission", "mode": "In Person", "duration": 1440, "color": "#7f1d1d"},
    {"id": "vt-3", "name": "Diabetes/HT Management", "mode": "In Person", "duration": 15, "color": "#f87171"},
    {"id": "vt-4", "name": "EECP 10th Day", "mode": "In Person", "duration": 60, "color": "#a855f7"},
    {"id": "vt-5", "name": "EECP 11th Day", "mode": "In Person", "duration": 60, "color": "#c2410c"},
    {"id": "vt-6", "name": "EECP 12th Day", "mode": "In Person", "duration": 60, "color": "#c2410c"},
    {"id": "vt-7", "name": "EECP 13th Day", "mode": "In Person", "duration": 60, "color": "#c2410c"},
    {"id": "vt-8", "name": "EECP 14th Day", "mode": "In Person", "duration": 60, "color": "#c2410c"},
    {"id": "vt-9", "name": "EECP 15th Day", "mode": "In Person", "duration": 60, "color": "#c2410c"},
    {"id": "vt-10", "name": "EECP 16th Day", "mode": "In Person", "duration": 60, "color": "#ec4899"},
    {"id": "vt-11", "name": "EECP 17th Day", "mode": "In Person", "duration": 60, "color": "#ec4899"},
    {"id": "vt-12", "name": "EECP 18th Day", "mode": "In Person", "duration": 60, "color": "#ec4899"},
    {"id": "vt-13", "name": "EECP 1st Day", "mode": "In Person", "duration": 60, "color": "#ea580c"},
    {"id": "vt-14", "name": "EECP Treatment Started", "mode": "In Person", "duration": 60, "color": "#ea580c"},
    {"id": "vt-15", "name": "EECP Treatment Completed", "mode": "In Person", "duration": 60, "color": "#10b981"},
    {"id": "vt-16", "name": "Follow-up Visit", "mode": "In Person", "duration": 20, "color": "#3b82f6"},
    {"id": "vt-17", "name": "New Patient Visit", "mode": "In Person", "duration": 30, "color": "#166eb8"},
    {"id": "vt-18", "name": "Patient Discontinued", "mode": "In Person", "duration": 0, "color": "#9ca3af"},
    {"id": "vt-19", "name": "Telehealth", "mode": "Video Consult", "duration": 30, "color": "#8b5cf6"},
    {"id": "vt-20", "name": "Walk-in (Follow-up Visit)", "mode": "In Person", "duration": 20, "color": "#0ea5e9"},
    {"id": "vt-21", "name": "Walk-in (New Patient Visit)", "mode": "In Person", "duration": 30, "color": "#0284c7"},
]

initial_event_types = [
    {"id": "et-1", "name": "Holiday", "color": "#14b8a6"},
    {"id": "et-2", "name": "Leave", "color": "#14b8a6"},
    {"id": "et-3", "name": "Lecture", "color": "#14b8a6"},
    {"id": "et-4", "name": "Lunch", "color": "#14b8a6"},
    {"id": "et-5", "name": "Meeting", "color": "#14b8a6"},
    {"id": "et-6", "name": "Other", "color": "#14b8a6"},
    {"id": "et-7", "name": "Surgery", "color": "#14b8a6"},
    {"id": "et-8", "name": "Vacation", "color": "#14b8a6"},
]

initial_web_embeds = [
    {
        "id": "embed-1",
        "name": "Web Embed 1",
        "facility": "Heal Your Heart Neelankarai - HUH001",
        "providers": ["Dr. Ramasamy S"],
        "websites": "www.healurheart.com",
        "code": '<iframe src="https://ehr.healyourheart.in/book/embed?branch=HUH001" style="overflow:hidden;" frameborder="0"></iframe>'
    },
    {
        "id": "embed-2",
        "name": "Web Embed 2",
        "facility": "Heal Your Heart Royapettah - HUH002",
        "providers": ["Dr. Ramasamy S"],
        "websites": "www.healurheart.com",
        "code": '<iframe src="https://ehr.healyourheart.in/book/embed?branch=HUH002" style="overflow:hidden;" frameborder="0"></iframe>'
    }
]

default_working_hours = {
    "Sunday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Monday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Tuesday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Wednesday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Thursday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Friday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False},
    "Saturday": {"start": "12:00 am", "end": "11:45 pm", "not_working": False}
}

for path in [root / "backend" / "data" / "settings_store.json", root / "backend" / "seed_data" / "settings_store.json"]:
    if path.exists():
        data = json.loads(path.read_text(encoding="utf-8"))
    else:
        data = {}

    data["appointment_statuses"] = initial_appointment_statuses
    data["visit_types"] = initial_visit_types
    data["event_types"] = initial_event_types
    data["web_embeds"] = initial_web_embeds
    data.setdefault("provider_timings", {})
    data.setdefault("provider_timings_default", default_working_hours)

    path.write_text(json.dumps(data, indent=2), encoding="utf-8")
    print(f"Updated {path}")

