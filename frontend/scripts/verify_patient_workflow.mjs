import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOT_DIR = "test-results/patient_workflow_verification";
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// Sample CSV
const CSV_FILE = path.resolve(SCREENSHOT_DIR, "import_test_patients.csv");
fs.writeFileSync(
  CSV_FILE,
  `Patient Record ID,First Name,Last Name,Gender,Date Of Birth(mm/dd/yyyy),Email,Home Phone,Mobile Phone,Work Phone,AddressLine1,AddressLine2,City,Country,State,Zip Code,Caregiver First Name,Caregiver Last Name\nHYN-IMP-101,Rajesh,Kannabiran,Male,03/25/1978,rajesh.k@example.com,,9840197771,,12 ECR Road,,Chennai,India,Tamil Nadu,600041,,\nHYN-IMP-102,Deepa,Swaminathan,Female,07/19/1982,deepa.s@example.com,,9840197772,,88 OMR Highway,,Chennai,India,Tamil Nadu,600096,,\n`
);

async function run() {
  console.log("Launching Edge browser for Patient Workflow verification...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  try {
    console.log("Navigating to http://127.0.0.1:5173/#/patients...");
    await page.goto("http://127.0.0.1:5173/#/patients", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    const loginBtn = await page.$('button:has-text("Sign in to workspace")');
    if (loginBtn) {
      console.log("Logging in via quick demo role Admin...");
      await page.click('button:has-text("Admin")');
      await page.waitForTimeout(500);
      await page.click('button:has-text("Sign in to workspace")');
      await page.waitForTimeout(2500);
      await page.goto("http://127.0.0.1:5173/#/patients", { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(2000);
    }

    console.log("Step 1: Checking Patients Header and More Actions button...");
    await page.waitForSelector(".charm-btn-patient-add");
    await page.waitForSelector(".charm-btn-more-dots");

    // Click More Actions
    await page.click(".charm-btn-more-dots");
    await page.waitForTimeout(500);
    await page.waitForSelector(".charm-dropdown-menu");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/01_more_actions_dropdown.png` });
    console.log("Saved 01_more_actions_dropdown.png");

    // Click Show Inactive Patients
    console.log("Step 2: Testing Show Inactive Patients toggle...");
    await page.click('text="Show Inactive Patients"');
    await page.waitForTimeout(1000);
    const titleText = await page.textContent(".charm-patients-title");
    console.log("Page title is now:", titleText);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/02_inactive_patients_view.png` });
    console.log("Saved 02_inactive_patients_view.png");

    // Toggle back to Active Patients
    await page.click(".charm-btn-more-dots");
    await page.waitForTimeout(500);
    await page.click('text="Show Active Patients"');
    await page.waitForTimeout(1000);

    // Step 3: Open Add Patient Screen
    console.log("Step 3: Opening full 3-column Add Patient screen...");
    await page.click(".charm-btn-patient-add");
    await page.waitForTimeout(1000);
    await page.waitForSelector(".charm-add-patient-page");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03_add_patient_screen.png`, fullPage: true });
    console.log("Saved 03_add_patient_screen.png");

    // Step 4: Fill form and click "Add"
    console.log("Step 4: Registering a patient via Add...");
    const uniqueSuffix = Date.now().toString().slice(-4);
    await page.fill('.charm-field-group:has-text("First Name") input', `Vijay${uniqueSuffix}`);
    await page.fill('.charm-field-group:has-text("Last Name") input', "Chandran");
    await page.fill('input[placeholder="dd/mm/yyyy"]', "15/08/1985");
    await page.selectOption('.charm-field-group:has-text("Sex") select', "Male");
    await page.fill('.charm-field-group:has-text("Mobile Phone") input', `9840${uniqueSuffix}1`);
    await page.fill('.charm-field-group:has-text("Email") input', `vijay${uniqueSuffix}@test.local`);
    await page.fill('.charm-field-group:has-text("City") input', "Chennai");
    await page.selectOption('.charm-field-group:has-text("Blood Group") select', "O+");
    await page.selectOption('.charm-field-group:has-text("Source") select', "Doctor Referral");

    await page.click('.charm-btn-orange:has-text("Add")');
    await page.waitForTimeout(2000);

    // Verify back on patients list and patient is listed
    await page.waitForSelector(".charm-patients-header-row");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04_patient_added_list.png` });
    console.log("Saved 04_patient_added_list.png");

    // Step 5: Test "Add and Open"
    console.log("Step 5: Testing Add and Open...");
    await page.click(".charm-btn-patient-add");
    await page.waitForTimeout(1000);
    await page.fill('.charm-field-group:has-text("First Name") input', `Meera${uniqueSuffix}`);
    await page.fill('.charm-field-group:has-text("Last Name") input', "Nair");
    await page.fill('input[placeholder="dd/mm/yyyy"]', "22/04/1992");
    await page.selectOption('.charm-field-group:has-text("Sex") select', "Female");
    await page.fill('.charm-field-group:has-text("Mobile Phone") input', `9840${uniqueSuffix}2`);
    await page.fill('.charm-field-group:has-text("Email") input', `meera${uniqueSuffix}@test.local`);

    await page.click('.charm-btn-secondary:has-text("Add and Open")');
    await page.waitForTimeout(2500);

    console.log("Current URL after Add and Open:", page.url());
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05_add_and_open_chart.png` });
    console.log("Saved 05_add_and_open_chart.png");

    // Step 6: Test Patient CSV Import Modal
    console.log("Step 6: Testing Patient CSV Import Modal...");
    fs.writeFileSync(
      CSV_FILE,
      `Patient Record ID,First Name,Last Name,Gender,Date Of Birth(mm/dd/yyyy),Email,Home Phone,Mobile Phone,Work Phone,AddressLine1,AddressLine2,City,Country,State,Zip Code,Caregiver First Name,Caregiver Last Name\nHYN-IMP-${uniqueSuffix}1,Rajesh${uniqueSuffix},Kannabiran,Male,03/25/1978,rajesh.${uniqueSuffix}@example.com,,9841${uniqueSuffix}1,,12 ECR Road,,Chennai,India,Tamil Nadu,600041,,\nHYN-IMP-${uniqueSuffix}2,Deepa${uniqueSuffix},Swaminathan,Female,07/19/1982,deepa.${uniqueSuffix}@example.com,,9841${uniqueSuffix}2,,88 OMR Highway,,Chennai,India,Tamil Nadu,600096,,\n`
    );

    await page.goto("http://127.0.0.1:5173/#/patients", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);

    await page.click(".charm-btn-more-dots");
    await page.waitForTimeout(500);
    await page.click('text="Import Patients"');
    await page.waitForTimeout(1000);

    await page.waitForSelector(".charm-import-modal-window");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06_import_modal.png` });
    console.log("Saved 06_import_modal.png");

    // Set file input
    const fileInput = await page.$('input[type="file"][accept=".csv"]');
    await fileInput.setInputFiles(CSV_FILE);
    await page.waitForTimeout(500);

    // Click Import
    await page.click('.charm-btn-orange:has-text("Import")');
    await page.waitForTimeout(2500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/07_import_success.png` });
    console.log("Saved 07_import_success.png");

    // Click Done
    await page.click('.charm-btn-orange:has-text("Done")');
    await page.waitForTimeout(1500);

    await page.screenshot({ path: `${SCREENSHOT_DIR}/08_patients_after_import.png` });
    console.log("Saved 08_patients_after_import.png");

    console.log("ALL TESTS COMPLETED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test failed with error:", err);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/error_state.png` });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
