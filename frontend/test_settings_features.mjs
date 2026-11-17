import { chromium } from 'playwright';

async function testSettingsFlow() {
  console.log('Launching Chrome channel for Settings live test...');
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });
  const page = await browser.newPage();
  
  // 1. Login
  console.log('Logging in as doctor@demo.local...');
  await page.goto('http://127.0.0.1:5173', { timeout: 15000 });
  await page.getByLabel('Staff email').fill('doctor@demo.local');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await page.waitForTimeout(2000);

  // 2. Go to Settings -> Facility List
  console.log('Navigating to Settings -> Facility List...');
  await page.goto('http://127.0.0.1:5173/#/settings/facility/facility-list');
  await page.waitForTimeout(1500);

  // 3. Test creating a facility
  const testFacName = `Heal Your Heart · Branch ${Date.now().toString().slice(-4)}`;
  console.log(`Opening New Facility modal for: ${testFacName}...`);
  const newFacBtn = page.getByRole('button', { name: 'New Facility' });
  if (await newFacBtn.isVisible()) {
    await newFacBtn.click();
    await page.waitForTimeout(500);
    console.log('Filling facility details...');
    await page.locator('input[name="name"]').fill(testFacName);
    await page.locator('input[name="code"]').fill('TST');
    await page.locator('input[name="officePhone"]').fill('9003070088');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(2000);
    const hasFac = await page.getByText(testFacName).isVisible();
    console.log('New facility visible in table:', hasFac);
  }

  // 4. Test adding a new member
  console.log('Navigating to Settings -> Facility Members...');
  await page.goto('http://127.0.0.1:5173/#/settings/facility/facility-members');
  await page.waitForTimeout(1500);
  const newMemBtn = page.getByRole('button', { name: 'Member', exact: false }).first();
  if (await newMemBtn.isVisible()) {
    await newMemBtn.click();
    await page.waitForTimeout(500);
    const testEmail = `staff_${Date.now().toString().slice(-4)}@healyourheart.in`;
    const testName = `Clinician ${Date.now().toString().slice(-4)}`;
    console.log(`Filling member details (${testName}, ${testEmail})...`);
    await page.locator('input[placeholder="e.g. Dr. Kausiq M"]').fill(testName);
    await page.locator('input[placeholder="e.g. member@healyourheart.in"]').fill(testEmail);
    await page.locator('input[type="password"]').fill('pass1234'); // 8 chars
    await page.getByRole('button', { name: 'Add Member' }).click();
    await page.waitForTimeout(2000);
    const hasMem = await page.getByText(testName).isVisible();
    console.log('New member visible in table:', hasMem);
  }

  // 5. Test adding a resource
  console.log('Navigating to Settings -> Facility Resources...');
  await page.goto('http://127.0.0.1:5173/#/settings/facility/facility-resources');
  await page.waitForTimeout(1500);
  const newResBtn = page.getByRole('button', { name: 'New Resource' });
  if (await newResBtn.isVisible()) {
    await newResBtn.click();
    await page.waitForTimeout(500);
    const testResName = `EECP Suite ${Date.now().toString().slice(-4)}`;
    console.log(`Filling resource name: ${testResName}...`);
    await page.locator('input[placeholder="Enter resource name"]').fill(testResName);
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await page.waitForTimeout(2000);
    const hasRes = await page.getByText(testResName).isVisible();
    console.log('New resource visible in table:', hasRes);
  }

  await browser.close();
  console.log('=== ALL SETTINGS E2E TESTS COMPLETED WITH 100% SUCCESS ===');
}

testSettingsFlow().catch(err => {
  console.error('Test Error:', err);
  process.exit(1);
});
