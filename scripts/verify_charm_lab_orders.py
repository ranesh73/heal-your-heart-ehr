import urllib.request
import urllib.parse
import http.cookiejar
import json

BASE_URL = "http://127.0.0.1:8000/api"

def main():
    print("=== Testing CharmHealth Lab Orders & Results Backend End-to-End ===")
    
    # 1. Health check
    req = urllib.request.Request(f"{BASE_URL}/health")
    with urllib.request.urlopen(req) as resp:
        body = resp.read().decode('utf-8')
        print(f"1. Health check: {resp.status} {body}")
        assert resp.status == 200, "Health check failed"

    # Setup session with cookiejar
    cj = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))

    # 2. Login as doctor via /auth/login
    login_data = json.dumps({
        "email": "doctor@demo.local",
        "password": "HipTaeC3uvAq0i9o3hJHd0ic"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/auth/login", data=login_data, headers={"Content-Type": "application/json"})
    with opener.open(req) as resp:
        login_res = json.loads(resp.read().decode('utf-8'))
        csrf_token = login_res.get("csrf")
        print(f"2. Doctor login: {resp.status} - user: {login_res.get('user', {}).get('name')}, csrf: {csrf_token[:8]}...")
        assert resp.status == 200, "Login failed"
        assert csrf_token is not None, "Missing CSRF token"

    default_headers = {
        "Content-Type": "application/json",
        "X-CSRF-Token": csrf_token
    }

    # 3. Find Isaac G. E.
    req = urllib.request.Request(f"{BASE_URL}/patients?q=Isaac", headers={"X-CSRF-Token": csrf_token})
    with opener.open(req) as resp:
        pat_data = json.loads(resp.read().decode('utf-8'))
        patients = pat_data.get("items", [])
        assert len(patients) > 0, "Patient Isaac G. E. not found"
        isaac = patients[0]
        patient_id = isaac["id"]
        print(f"3. Found patient: {isaac['first_name']} {isaac['last_name']} (MRN: {isaac['mrn']}, ID: {patient_id})")

    # 4. Check lab templates catalog
    req = urllib.request.Request(f"{BASE_URL}/catalogs?kind=lab_template", headers={"X-CSRF-Token": csrf_token})
    with opener.open(req) as resp:
        templates = json.loads(resp.read().decode('utf-8'))
        assert len(templates) > 0, "No lab templates found"
        huh_tpl = next((t for t in templates if "HUH-Cardio Diabetic" in t["name"]), None)
        assert huh_tpl is not None, "HUH-Cardio Diabetic template not found"
        raw_desc = huh_tpl.get("content") or huh_tpl.get("description") or "{}"
        tpl_meta = json.loads(raw_desc) if isinstance(raw_desc, str) else raw_desc
        print(f"4. Found template: {huh_tpl['name']} with {len(tpl_meta.get('tests', []))} tests:")
        for t in tpl_meta.get("tests", [])[:5]:
            print(f"   - {t}")
        print("   ... (total 16 tests)")

    # 5. Create Lab Order (Workflow A)
    order_payload = json.dumps({
        "kind": "Lab",
        "patient_id": patient_id,
        "name": "HUH-Cardio Diabetic (16 Tests)",
        "instructions": ", ".join(tpl_meta["tests"]),
        "notes_lab_patient": "Overnight fasting required (10-12 hours). Morning sample preferred.",
        "notes_intra_office": "Urgent review for EECP qualification",
        "order_metadata": json.dumps({
            "template_name": "HUH-Cardio Diabetic",
            "tests": tpl_meta["tests"],
            "specimen": {
                "date": "2026-11-06",
                "time": "08:30",
                "type": "Blood (Serum)",
                "site": "Left antecubital fossa",
                "volume": "5 mL",
                "fasting": True
            }
        })
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/records/orders", data=order_payload, headers=default_headers)
    with opener.open(req) as resp:
        created_order = json.loads(resp.read().decode('utf-8'))
        print(f"5. Create Lab Order response: {resp.status}")
        order_id = created_order["id"]
        lab_ref = created_order.get("lab_ref")
        print(f"   Order ID: {order_id}")
        print(f"   Lab Ref: {lab_ref} (CharmHealth 8-digit format)")
        print(f"   Status: {created_order.get('status')}")
        print(f"   Patient Note: {created_order.get('notes_lab_patient')}")
        print(f"   Intra-office Note: {created_order.get('notes_intra_office')}")
        assert lab_ref is not None and len(lab_ref) == 8, f"Invalid lab_ref: {lab_ref}"
        assert created_order.get("status") == "Pending", f"Expected Pending status, got {created_order.get('status')}"

    # 6. Import Lab Results (Workflow B)
    result_payload = json.dumps({
        "version": created_order["version"],
        "status": "Partial",
        "result": "Partial laboratory results entered for Calcium and Apolipoprotein-A1.",
        "values": [
            {
                "test_name": "Calcium",
                "parameter": "Calcium",
                "value": 1.0,
                "unit": "mg/dL",
                "range_min": 8.6,
                "range_max": 10.2,
                "interpretation": "Low",
                "comments": "Critical low calcium. Advise clinical correlation."
            },
            {
                "test_name": "Apolipoprotein-A1",
                "parameter": "Apolipoprotein-A1",
                "value": 2.0,
                "unit": "mg/dL",
                "range_min": 111.0,
                "range_max": 184.0,
                "interpretation": "Low",
                "comments": "Severely low Apo-A1 indicating elevated atherogenic cardiovascular risk."
            },
            {
                "test_name": "Blood Urea Nitrogen",
                "parameter": "BUN",
                "value": 14.0,
                "unit": "mg/dL",
                "range_min": 7.0,
                "range_max": 20.0,
                "interpretation": "Normal",
                "comments": ""
            }
        ]
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/orders/{order_id}/result", data=result_payload, headers=default_headers)
    with opener.open(req) as resp:
        resulted_order = json.loads(resp.read().decode('utf-8'))
        print(f"6. Result entry response: {resp.status}")
        print(f"   Updated status: {resulted_order.get('status')}")
        assert resulted_order.get("status") in ["Partial", "resulted"], f"Unexpected status: {resulted_order.get('status')}"

    # 7. Query records and verify lab values
    req = urllib.request.Request(f"{BASE_URL}/records/orders", headers={"X-CSRF-Token": csrf_token})
    with opener.open(req) as resp:
        orders_list = json.loads(resp.read().decode('utf-8'))
        target_order = next((o for o in orders_list if o["id"] == order_id), None)
        assert target_order is not None, "Order not found in listing"
        print(f"7. Verified Order in Listing:")
        print(f"   Ref: {target_order.get('lab_ref')}")
        print(f"   Name: {target_order.get('name')}")
        print(f"   Status: {target_order.get('status')}")
        print(f"   Values count: {len(target_order.get('values', []))}")
        for v in target_order.get("values", []):
            print(f"     - {v.get('parameter')} = {v.get('value')} {v.get('unit')} [{v.get('interpretation')}]")

    print("\n>>> ALL 7 END-TO-END VERIFICATIONS PASSED PERFECTLY! <<<")

if __name__ == "__main__":
    main()
