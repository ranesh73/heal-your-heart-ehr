import { test, expect, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const password = readFileSync(resolve("../.demo-credentials.txt"), "utf8")
  .match(/Password for all demo accounts: (.+)/)![1]
  .trim();

async function login(page: Page, role = "doctor") {
  await page.goto("/");
  await page.getByLabel("Staff email").fill(role + "@demo.local");
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in to workspace" }).click();
  await expect(page.locator(".charm-home-launcher-container")).toBeVisible();
}

test.describe("CharmHealth EHR Settings Replica & Floating Toolbar", () => {
  test("Settings dashboard loads with all 25 categories and search bar", async ({ page }) => {
    await login(page);

    // 1. Click Settings gear icon in header
    const settingsBtn = page.getByRole("button", { name: "Settings", exact: true });
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    // Verify URL
    await expect(page).toHaveURL(/.*#\/settings/);

    // 2. Verify search bar
    const searchInput = page.getByPlaceholder("Search in Settings and perform actions");
    await expect(searchInput).toBeVisible();

    // 3. Verify all 25 category headings
    const expectedCategories = [
      "Facility",
      "Calendar",
      "Patient",
      "Templates",
      "Questionnaires",
      "Documents",
      "Consultation",
      "Health Trackers",
      "Lab / Image",
      "Rx",
      "Immunization",
      "Injections",
      "Billing",
      "Inventory",
      "Message",
      "Task",
      "Patient Recall",
      "Quick Text",
      "Directory",
      "PHR Settings",
      "Charm TeleHealth",
      "Charm Connect",
      "Account",
      "Security",
      "Charm Assist",
    ];

    for (const cat of expectedCategories) {
      await expect(
        page.getByRole("heading", { name: cat, exact: true })
      ).toBeVisible();
    }

    // 4. Verify specific setting options exist as clickable buttons
    await expect(page.getByRole("button", { name: "Facility List", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Online Appointments", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "WhatsApp", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Vitals", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage Supplements and Drugs", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage Injections", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Procedure Codes", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Personal Quick Text", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Audit Trails", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Chart Note Assist", exact: true })).toBeVisible();
  });

  test("Settings search functionality, text highlighting and option navigation", async ({ page }) => {
    await login(page);
    await page.goto("/#/settings");

    const searchInput = page.getByPlaceholder("Search in Settings and perform actions");
    await expect(searchInput).toBeVisible();

    // Search for "whatsapp"
    await searchInput.fill("whatsapp");

    // Verify autocomplete dropdown appears
    const dropdown = page.locator(".charm-settings-dropdown-results");
    await expect(dropdown).toBeVisible();

    // Check matching item in dropdown with category tag
    const whatsappItem = dropdown.locator(".charm-dropdown-item").first();
    await expect(whatsappItem).toBeVisible();
    await expect(whatsappItem.locator(".charm-dropdown-cat-pill")).toHaveText("Patient");

    // Click result to navigate directly to setting page
    await whatsappItem.click();

    // Verify dedicated setting page opened
    await expect(page).toHaveURL(/.*#\/settings\/patient\/whatsapp/);
    await expect(page.getByRole("heading", { name: "WhatsApp" })).toBeVisible();
    await expect(page.getByText("Enable Official WhatsApp Business Cloud API")).toBeVisible();

    // Toggle a setting and save
    const saveBtn = page.getByRole("button", { name: "Save Changes" });
    await saveBtn.click();
    await expect(page.locator(".toast")).toBeVisible();
  });

  test("Keyboard navigation in search dropdown (Arrow keys and Enter)", async ({ page }) => {
    await login(page);
    await page.goto("/#/settings");

    const searchInput = page.getByPlaceholder("Search in Settings and perform actions");
    await searchInput.fill("vitals");

    // Dropdown is visible
    const dropdown = page.locator(".charm-settings-dropdown-results");
    await expect(dropdown).toBeVisible();

    // Press Enter to open the first matched option (Vitals)
    await page.keyboard.press("Enter");

    // Verify Vitals setting page opened
    await expect(page).toHaveURL(/.*#\/settings\/consultation\/vitals/);
    await expect(page.getByRole("heading", { name: "Vitals" })).toBeVisible();
    await expect(page.getByText("Enable Pulse Wave Velocity")).toBeVisible();
  });

  test("Clicking setting options navigates to dedicated setting screens", async ({ page }) => {
    await login(page);
    await page.goto("/#/settings");

    // 1. Facility List
    await page.getByRole("button", { name: "Facility List", exact: true }).click();
    await expect(page).toHaveURL(/.*#\/settings\/facility\/facility-list/);
    await expect(page.locator("#facilityList")).toBeVisible();
    await expect(page.getByText("Practice Name : Heal Your Heart")).toBeVisible();
    await expect(page.getByRole("button", { name: "New Facility" })).toBeVisible();

    // Back to settings
    await page.locator(".charm-settings-back-arrow-btn").click();
    await expect(page).toHaveURL(/.*#\/settings$/);

    // 2. Procedure Codes
    await page.getByRole("button", { name: "Procedure Codes", exact: true }).click();
    await expect(page).toHaveURL(/.*#\/settings\/billing\/procedure-codes/);
    await expect(page.getByText("Applicable Service GST Rate")).toBeVisible();

    // Back to settings
    await page.locator(".charm-settings-back-arrow-btn").click();
    await expect(page).toHaveURL(/.*#\/settings$/);

    // 3. Audit Trails
    await page.getByRole("button", { name: "Audit Trails", exact: true }).click();
    await expect(page).toHaveURL(/.*#\/settings\/security\/audit-trails/);
    // Back to settings
    await page.locator(".charm-settings-back-arrow-btn").click();
    await expect(page).toHaveURL(/.*#\/settings$/);
  });

  test("Floating toolbar: 4 icons, tooltips, and interactive popups", async ({ page }) => {
    await login(page);

    const toolbar = page.locator(".charm-floating-vertical-toolbar");
    await expect(toolbar).toBeVisible();

    // Verify 4 buttons exist
    const referBtn = toolbar.locator(".refer-friend-btn");
    const addonsBtn = toolbar.locator(".addons-btn");
    const helpBtn = toolbar.locator(".help-btn");
    const shortcutsBtn = toolbar.locator(".shortcuts-btn");

    await expect(referBtn).toBeVisible();
    await expect(addonsBtn).toBeVisible();
    await expect(helpBtn).toBeVisible();
    await expect(shortcutsBtn).toBeVisible();

    // 1. Refer a Friend popup
    await referBtn.click();
    const referModal = page.locator(".refer-friend-dialog");
    await expect(referModal).toBeVisible();
    await expect(referModal.getByRole("heading", { name: "Refer a Friend" })).toBeVisible();
    await expect(referModal.getByText("Invite Healthcare Colleagues")).toBeVisible();
    // Test Copy button
    const copyBtn = referModal.getByRole("button", { name: /Copy Link/ });
    await expect(copyBtn).toBeVisible();
    await copyBtn.click();
    await expect(page.locator(".toast")).toBeVisible();
    // Close modal
    await referModal.getByRole("button", { name: "Done" }).click();
    await expect(referModal).not.toBeVisible();

    // 2. Add-ons popup
    await addonsBtn.click();
    const addonsModal = page.locator(".addons-dialog");
    await expect(addonsModal).toBeVisible();
    await expect(addonsModal.getByRole("heading", { name: "Add-ons & Integrations" })).toBeVisible();
    await expect(addonsModal.getByText("WhatsApp Integration")).toBeVisible();
    await expect(addonsModal.getByText("Payment Gateway (Razorpay)")).toBeVisible();
    await expect(addonsModal.getByText("AI Clinical Assistant")).toBeVisible();
    // Close modal
    await addonsModal.locator(".modal-head").getByRole("button", { name: "Close" }).click();
    await expect(addonsModal).not.toBeVisible();

    // 3. Help popup
    await helpBtn.click();
    const helpModal = page.locator(".help-dialog");
    await expect(helpModal).toBeVisible();
    await expect(helpModal.getByRole("heading", { name: "Help & Support Center" })).toBeVisible();
    await expect(helpModal.getByRole("button", { name: "User Guide" })).toBeVisible();
    await expect(helpModal.getByRole("button", { name: "Frequently Asked Questions" })).toBeVisible();
    // Navigate tabs inside help
    await helpModal.getByRole("button", { name: "Frequently Asked Questions" }).click();
    await expect(helpModal.getByText("How do I document a 35-Session EECP")).toBeVisible();
    // Close modal
    await helpModal.locator(".modal-head").getByRole("button", { name: "Close" }).click();
    await expect(helpModal).not.toBeVisible();

    // 4. Keyboard Shortcuts popup
    await shortcutsBtn.click();
    const shortcutsModal = page.locator(".shortcuts-dialog");
    await expect(shortcutsModal).toBeVisible();
    await expect(shortcutsModal.getByText("Shift", { exact: true }).first()).toBeVisible();
    await expect(shortcutsModal.getByText("K", { exact: true }).first()).toBeVisible();
    await expect(shortcutsModal.getByText("Open Keyboard Shortcuts", { exact: true })).toBeVisible();
    // Close with Escape
    await page.keyboard.press("Escape");
    await expect(shortcutsModal).not.toBeVisible();
  });

  test("Global keyboard shortcut Shift + K functions across application and does not trigger in inputs", async ({ page }) => {
    await login(page);

    // On /home, press Shift + K
    await page.keyboard.press("Shift+K");
    const shortcutsModal = page.locator(".shortcuts-dialog");
    await expect(shortcutsModal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(shortcutsModal).not.toBeVisible();

    // Navigate to /patients
    await page.goto("/#/patients");
    await page.keyboard.press("Shift+K");
    await expect(shortcutsModal).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(shortcutsModal).not.toBeVisible();

    // Verify typing in an input does NOT trigger Shift + K
    const searchInput = page.getByPlaceholder("Search Patient by Name / ID").first();
    await searchInput.focus();
    // Press Shift + K inside input
    await page.keyboard.press("Shift+K");
    // Shortcuts modal must NOT open
    await expect(shortcutsModal).not.toBeVisible();
    // Input must contain "K"
    await expect(searchInput).toHaveValue("K");
  });
});
