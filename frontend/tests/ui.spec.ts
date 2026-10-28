import { test, expect, Page } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
const password = readFileSync(resolve("../.demo-credentials.txt"), "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();
let suffix = Date.now().toString().slice(-8);

test.beforeAll(async () => {
  try {
    const py = resolve("../.venv/Scripts/python.exe");
    const pyCmd = existsSync(py) ? `"${py}"` : "python";
    execSync(`${pyCmd} "${resolve("../scripts/clean_test_data.py")}"`, {
      cwd: resolve(".."),
      stdio: "ignore",
    });
  } catch {
    // Non-fatal if environment has no direct python runner
  }
});

async function login(page: Page, role = "doctor") {
  await page.goto("/");
  await page.getByLabel("Staff email").fill(role + "@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(
    page.getByRole("heading", { name: "Your day, at a glance" }),
  ).toBeVisible();
  const branch = page.getByLabel("Active branch");
  await branch.selectOption({ label: "Neelankarai" });
  await expect(
    page.getByRole("heading", { name: "Your day, at a glance" }),
  ).toBeVisible();
}

async function apiSession(page: Page, role = "doctor") {
  const r = await page.request.post("/api/auth/login", {
    data: { email: role + "@demo.local", password },
  });
  expect(r.ok()).toBeTruthy();
  const data = await r.json();
  const me = await (await page.request.get("/api/auth/me")).json();
  const facility = me.facilities.find((f: any) => f.code === "HYN").id;
  return {
    headers: { "X-CSRF-Token": data.csrf, "X-Facility-ID": facility },
    facility,
    user: data.user,
  };
}

async function seedPatient(page: Page, first: string) {
  const session = await apiSession(page);
  const r = await page.request.post("/api/patients", {
    headers: session.headers,
    data: {
      first_name: first,
      last_name: "UITest",
      dob: "1974-05-12",
      sex: "Female",
      facility_ids: [session.facility],
    },
  });
  expect(r.ok()).toBeTruthy();
  return { p: await r.json(), ...session };
}

test("login, branch switch, navigation and responsive layout", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await expect(
    page.getByText("Aarav Demo", { exact: true }).first(),
  ).toBeVisible();
  for (const name of [
    "Patients",
    "Clinical",
    "EECP",
    "Operations",
    "Communication",
    "Home",
  ]) {
    await page
      .locator("nav")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(page.locator("main")).not.toContainText("Workspace not found");
  }
  await page.getByLabel("Active branch").selectOption({ label: "Royapettah" });
  await expect(page.getByText("No appointments today")).toBeVisible();
  await page.getByLabel("Active branch").selectOption({ label: "Neelankarai" });
  await page.screenshot({
    path: resolve("../../../ehr-dashboard.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Your day, at a glance" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});

test("reception registers, searches, books and checks in a patient", async ({
  page,
}) => {
  await login(page, "reception");
  await page
    .getByRole("button", { name: "Register patient", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("First name").fill("Reception" + suffix);
  await dialog.getByLabel("Last name").fill("UITest");
  await dialog.getByLabel("Date of birth").fill("1970-02-02");
  await dialog.getByLabel("Sex", { exact: true }).selectOption("Female");
  await dialog.getByRole("button", { name: "Register & open chart" }).click();
  await expect(
    page.getByRole("heading", { name: "Reception" + suffix + " UITest" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Book appointment", exact: true })
    .first()
    .click();
  await dialog
    .getByLabel("Provider / therapist")
    .selectOption({ label: "Dr. Ananya Demo" });
  await dialog.getByLabel("Start · Asia/Kolkata").fill("2033-04-04T09:00");
  await dialog.getByRole("button", { name: "Confirm booking" }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Appointments", exact: true }).click();
  await page.getByRole("button", { name: "Check in", exact: true }).click();
  await expect(
    page.locator("tbody").getByText("checked in", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Find a patient").fill("Reception" + suffix);
  await expect(
    page.locator(".search-results").getByText("Reception" + suffix + " UITest"),
  ).toBeVisible();
  await expect(page.getByRole("tab", { name: "Medical Records" })).toHaveCount(
    0,
  );
});

test("doctor saves, assistant records vitals, doctor signs and amends", async ({
  page,
}) => {
  const { p } = await seedPatient(page, "Clinical" + suffix);
  await page.context().clearCookies();
  await login(page);
  await page.goto("/#/patients/" + p.id);
  await page.getByRole("button", { name: "Start consultation" }).click();
  await expect(
    page.getByText("ACTIVE CONSULTATION", { exact: true }),
  ).toBeVisible();
  const encounterUrl = page.url();
  await page
    .getByLabel("Chief complaint", { exact: true })
    .fill("Synthetic browser workflow consultation");
  await page
    .getByLabel("Assessment", { exact: true })
    .fill("Software test assessment only");
  await page
    .getByLabel("Care plan", { exact: true })
    .fill("Software test follow-up plan only");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page.getByText("Draft saved · manual save")).toBeVisible();
  await page.context().clearCookies();
  await login(page, "assistant");
  await page.goto(encounterUrl);
  await page.getByRole("button", { name: "Record observations" }).click();
  await page.getByLabel("Systolic BP · mmHg", { exact: true }).fill("122");
  await page.getByLabel("Diastolic BP · mmHg", { exact: true }).fill("76");
  await page.getByLabel("Pulse · bpm", { exact: true }).fill("71");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save record", exact: true })
    .click();
  await expect(page.getByText("122 / 76 mmHg")).toBeVisible();
  await page.context().clearCookies();
  await login(page);
  await page.goto(encounterUrl);
  await page
    .getByRole("button", { name: "Sign encounter", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm & sign" }).click();
  await expect(
    page.getByText("Finalized documentation is read-only"),
  ).toBeVisible();
  await expect(page.getByLabel("Assessment", { exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Add amendment" }).click();
  await page.getByLabel("Reason for amendment").fill("Synthetic correction");
  await page
    .getByLabel("Amendment", { exact: true })
    .fill("Appended browser workflow correction");
  await page.getByRole("button", { name: "Record amendment" }).click();
  await expect(
    page.getByText("Appended browser workflow correction"),
  ).toBeVisible();
  await page.screenshot({
    path: resolve("../../../ehr-consultation.png"),
    fullPage: true,
  });
});

test("EECP authorizes, records consent, books and completes daily chart", async ({
  page,
}) => {
  const { p } = await seedPatient(page, "Treatment" + suffix);
  await page.context().clearCookies();
  await login(page);
  await page.goto("/#/patients/" + p.id);
  await page.getByRole("tab", { name: "EECP Treatment", exact: true }).click();
  await page.getByRole("button", { name: "Enroll patient" }).click();
  await page.getByLabel("Planned sessions (20, 35 or custom)").fill("20");
  await page
    .getByLabel("Assigned therapist", { exact: true })
    .selectOption({ label: "Kavin Demo" });
  await page.getByLabel("Plan start date").fill("2033-04-04");
  await page.getByRole("button", { name: "Create treatment plan" }).click();
  await page.getByRole("button", { name: "Authorize", exact: true }).click();
  await page.getByRole("button", { name: "Confirm authorization" }).click();
  await page
    .getByRole("button", { name: "Record consent", exact: true })
    .click();
  await page.getByRole("button", { name: "Upload a consent document" }).click();
  await page.getByLabel("Document title").fill("Synthetic signed consent");
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "consent.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nSynthetic test consent"),
    });
  await page
    .getByRole("button", { name: "Upload document", exact: true })
    .click();
  await page
    .getByLabel("Signed consent document", { exact: true })
    .selectOption({ label: "Synthetic signed consent" });
  await page.getByRole("button", { name: "Record verified consent" }).click();
  await page
    .getByRole("button", { name: "Schedule sessions", exact: true })
    .click();
  await page
    .getByLabel("Room / EECP bed")
    .selectOption({ label: "EECP Room 02" });
  await page.getByLabel("Start · Asia/Kolkata").fill("2033-04-04T10:00");
  await page.getByLabel("Number of appointments").fill("2");
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.context().clearCookies();
  await login(page, "therapist");
  await page.goto("/#/patients/" + p.id);
  await page.getByRole("tab", { name: "EECP Treatment" }).click();
  await page
    .getByRole("button", { name: "Check in", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .click();
  const d = page.getByRole("dialog");
  const inputs = [
    ["Pre · Oxygen · L/min", "0"],
    ["Pre · Weight · kg", "70"],
    ["Pre · Systolic BP · mmHg", "120"],
    ["Pre · Diastolic BP · mmHg", "78"],
    ["Pre · Pulse · bpm", "72"],
    ["Pre · SpO₂ · %", "98"],
    ["15 min · D/S Peak · ratio", "1.2"],
    ["15 min · D/S Area · ratio", "1.1"],
    ["15 min · Pulse · bpm", "73"],
    ["15 min · Applied pressure", "200"],
    ["45 min · D/S Peak · ratio", "1.3"],
    ["45 min · D/S Area · ratio", "1.2"],
    ["45 min · Pulse · bpm", "72"],
    ["45 min · Applied pressure", "200"],
  ];
  for (const [label, value] of inputs)
    await d.getByLabel(label, { exact: true }).fill(value);
  await d.getByRole("button", { name: "Save measurements" }).click();
  await expect(page.getByText("Daily observations saved.")).toBeVisible();
  await d.getByRole("button", { name: "Complete session" }).click();
  await expect(d).toHaveCount(0);
  await expect(
    page.locator("tbody").getByText("completed", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: resolve("../../../ehr-eecp.png"),
    fullPage: true,
  });
});

test("billing creates invoice and records a simulated installment receipt", async ({
  page,
}) => {
  const { p } = await seedPatient(page, "Billing" + suffix);
  await page.context().clearCookies();
  await login(page, "billing");
  await page.goto("/#/patients/" + p.id);
  await page.getByRole("tab", { name: "Billing", exact: true }).click();
  await page
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  await page
    .getByLabel("Service 1", { exact: true })
    .selectOption({ label: "EECP 20-session package" });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Create invoice", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Open record", exact: true }).click();
  await page.getByRole("button", { name: "Record simulated payment" }).click();
  await page.getByLabel("Amount · ₹", { exact: true }).fill("1000");
  await page.getByRole("button", { name: "Save simulated payment" }).click();
  await expect(
    page.getByRole("heading", { name: /SIMULATED RECEIPT/ }),
  ).toBeVisible();
  await expect(page.getByText("Remaining balance: ₹69,000.00")).toBeVisible();
});

test("administration catalog, inventory, audit, and role navigation", async ({
  page,
}) => {
  await login(page, "admin");
  await page
    .locator("nav")
    .getByRole("button", { name: "Administration" })
    .click();
  await page.getByRole("tab", { name: "Catalogs & templates" }).click();
  await page.getByRole("button", { name: "Add catalog record" }).click();
  await page.getByLabel("Code", { exact: true }).fill("UI-" + suffix);
  await page
    .getByLabel("Name", { exact: true })
    .fill("Synthetic browser service " + suffix);
  await page.getByLabel("Price · paise (100 = ₹1)").fill("50000");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await expect(
    page.getByText("Synthetic browser service " + suffix, { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Audit history" }).click();
  await expect(
    page.getByText("create catalog", { exact: true }).first(),
  ).toBeVisible();
  await page.locator("nav").getByRole("button", { name: "Operations" }).click();
  await page.getByRole("tab", { name: "Inventory" }).click();
  await page.getByRole("button", { name: "Add supply" }).click();
  await page.getByLabel("Supply name").fill("Synthetic UI supply " + suffix);
  await page.getByLabel("Category", { exact: true }).fill("Training");
  await page.getByRole("button", { name: "Save record", exact: true }).click();
  await page
    .getByRole("row")
    .filter({ hasText: "Synthetic UI supply " + suffix })
    .getByRole("button", { name: "Open Synthetic UI supply " + suffix })
    .click();
  await page.getByLabel("Stock change (+ receive / − issue)").fill("5");
  await page.getByLabel("Reason / reference").fill("Synthetic opening stock");
  await page.getByRole("button", { name: "Record stock movement" }).click();
  await expect(
    page.getByRole("row").filter({ hasText: "Synthetic UI supply " + suffix }),
  ).toContainText("5 each");
});

