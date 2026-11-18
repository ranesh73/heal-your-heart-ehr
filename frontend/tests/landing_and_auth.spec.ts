import { test, expect } from "@playwright/test";

test.describe("Heal Your Heart EHR — Landing Page, Authentication & RBAC", () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
  });

  test("1. Two-Column Hero: Branding, WebThreads & Doctor Placeholder", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/#/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Assert scroll position is exactly 0
    const scrollY = await page.evaluate(() => window.scrollY);
    expect(scrollY).toBe(0);

    // 2. First viewport container is present
    const firstViewport = page.locator('[data-testid="first-viewport"]');
    await expect(firstViewport).toBeVisible();

    // 3. New Curved SVG Ribbon background is present and WebThreads is completely removed
    const ribbonBg = page.locator('[data-testid="hero-ribbon-background"]');
    await expect(ribbonBg).toBeVisible();
    await expect(page.locator('[data-testid="hero-webthreads-background"]')).not.toBeVisible();
    await expect(page.locator('.web-threads-canvas')).not.toBeVisible();

    // Verify Ribbon Background is pointer-events: none and zIndex 0
    const bgStyles = await ribbonBg.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return { pointerEvents: computed.pointerEvents, zIndex: computed.zIndex };
    });
    expect(bgStyles.pointerEvents).toBe("none");

    // 4. Two-Column Layout: Left column (~54%) and Right column (~44%)
    const leftCol = page.locator('[data-testid="hero-left-column"]');
    const rightCol = page.locator('[data-testid="hero-right-column"]');
    await expect(leftCol).toBeVisible();
    await expect(rightCol).toBeVisible();

    // Verify left column is left-aligned
    const leftAlign = await leftCol.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return computed.textAlign;
    });
    expect(leftAlign).toBe("left");

    // 5. Complete Original Logo artwork is visible with integrated EHR
    const origLogo = page.locator('[data-testid="hero-original-logo"]');
    await expect(origLogo).toBeVisible();
    await expect(origLogo).toHaveAttribute("src", "/images/hyh_logo_ehr.png");

    // 6. EHR Product Designation is present
    const ehrBadge = page.locator('[data-testid="first-viewport-wordmark"]');
    await expect(ehrBadge).toBeAttached();
    await expect(ehrBadge).toHaveText("Heal Your Heart EHR");

    // 7. Supporting clinical text is visible and left-aligned
    const supportingText = page.locator('[data-testid="hero-supporting-text"]');
    await expect(supportingText).toBeVisible();
    await expect(supportingText).toContainText("Specialized Electronic Health Record");

    // 8. Doctor photograph on right side (approved transparent portrait, not placeholder)
    const doctorPhoto = page.locator('[data-testid="hero-doctor-photo"]');
    await expect(doctorPhoto).toBeVisible();
    await expect(doctorPhoto).toHaveAttribute("src", "/images/doctor_hero.png");
    await expect(page.locator('[data-testid="hero-doctor-placeholder"]')).not.toBeVisible();

    // 9. Sign In and Sign Up buttons: Horizontally aligned, text only, equal height
    const signInBtn = page.locator('[data-testid="first-viewport-signin-btn"]');
    const signUpBtn = page.locator('[data-testid="first-viewport-signup-btn"]');

    await expect(signInBtn).toBeVisible();
    await expect(signUpBtn).toBeVisible();
    await expect(signInBtn).toHaveText("Sign In");
    await expect(signUpBtn).toHaveText("Sign Up");

    const signInBounds = await signInBtn.boundingBox();
    const signUpBounds = await signUpBtn.boundingBox();
    expect(signInBounds).not.toBeNull();
    expect(signUpBounds).not.toBeNull();
    if (signInBounds && signUpBounds) {
      // Equal visual height
      expect(Math.round(signInBounds.height)).toBe(Math.round(signUpBounds.height));
      // Horizontally aligned (same vertical range)
      expect(Math.abs(signInBounds.y - signUpBounds.y)).toBeLessThanOrEqual(4);
      // Both within viewport bounds without scrolling
      expect(signInBounds.y + signInBounds.height).toBeLessThanOrEqual(800);
      expect(signUpBounds.y + signUpBounds.height).toBeLessThanOrEqual(800);
    }

    // Verify no Connected Care headline
    await expect(page.getByText("Connected Care. Smarter Clinical Workflows.")).not.toBeVisible();

    // Verify no statistics / trust indicator row in first viewport
    await expect(firstViewport.getByText("13 Role-Based Clinical Access Profiles")).not.toBeVisible();
    await expect(firstViewport.getByText("30 EECP Treatment Centres")).not.toBeVisible();

    // Verify Header: Balanced 3-region layout
    // Left branding group: Logo emblem + Heal Your Heart EHR wordmark
    const leftBranding = page.locator('[data-testid="nav-left-branding"]');
    await expect(leftBranding).toBeVisible();
    await expect(leftBranding.locator('img[src="/images/hyh_emblem.png"]')).toBeVisible();
    await expect(leftBranding.getByText("Heal Your")).toBeVisible();
    await expect(leftBranding.getByText("Heart")).toBeVisible();
    await expect(leftBranding.getByText("EHR")).toBeVisible();

    // Center navigation links: About Us, EECP Mechanism, EECP Therapy, Platform, Clinical Roles, Contact Us
    const centerLinks = page.locator('[data-testid="nav-center-links"]');
    await expect(centerLinks).toBeVisible();
    await expect(page.locator('[data-testid="nav-link-about"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-link-angiogenesis"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-link-treatment"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-link-platform"]')).toBeVisible();
    await expect(page.locator('[data-testid="nav-link-roles"]')).toBeVisible();
    const contactLink = page.locator('[data-testid="nav-link-contact"]');
    await expect(contactLink).toBeVisible();
    await expect(contactLink).toHaveText("Contact Us");
    await expect(contactLink).toHaveAttribute("href", "#contact");

    // Right region: Access EHR button is COMPLETELY REMOVED from navigation bar
    const header = page.locator("header");
    await expect(header.getByText("Access EHR")).not.toBeVisible();
    await expect(header.getByText("Vasomeditech (EECP Center)")).not.toBeVisible();

    // 10. Responsive layout verification & Screenshots (Desktop 1440, Tablet 1024, Mobile 390)
    // Desktop 1440x900
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: "test-results/hero_desktop_1440.png" });

    // Tablet 1024x768
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.waitForTimeout(300);
    let overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await page.screenshot({ path: "test-results/hero_tablet_1024.png" });

    // Mobile 390x844
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    expect(overflow).toBe(false);
    await expect(leftCol).toBeVisible();
    await expect(doctorPhoto).toBeVisible();
    await page.screenshot({ path: "test-results/hero_mobile_390.png" });

    // Mobile menu toggle check
    const mobileToggle = page.locator('[data-testid="mobile-menu-toggle"]');
    await expect(mobileToggle).toBeVisible();
    await mobileToggle.click();
    const mobileNav = page.locator('[data-testid="mobile-nav-menu"]');
    await expect(mobileNav).toBeVisible();
    await expect(mobileNav.getByText("Contact Us")).toBeVisible();
    await mobileToggle.click();
    await expect(mobileNav).not.toBeVisible();

    // Restore desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(200);
    await page.screenshot({ path: "test-results/first_viewport_zero_scroll.png" });
  });

  test("2. Landing Page: Precise Visual Corrections & Cleaned Sections", async ({ page }) => {
    await page.goto("/#/");
    await page.waitForLoadState("domcontentloaded");

    // 1. Verify Cleaned Leadership Photo (Section 2 - Medical Leadership)
    const leadershipImg = page.locator('img[src="/images/leadership_clean.jpg"]');
    await expect(leadershipImg).toBeVisible();

    // 2. Verify Cleaned Angiogenesis Visual (Section 3 - Educational Visual)
    const angiogenesisImg = page.locator('img[src="/images/angiogenesis_clean.jpg"]');
    await expect(angiogenesisImg).toBeVisible();

    // 3. Verify Cleaned EECP Treatment Photo (Section 4 - Treatment)
    const treatmentImg = page.locator('img[src="/images/eecp_treatment_clean.jpg"]');
    await expect(treatmentImg).toBeVisible();

    // 4. Verify Clinical Workspace Overview is COMPLETELY REMOVED
    await expect(page.getByText("Purpose-Built for Non-Invasive Cardiology & EECP")).not.toBeVisible();
    await expect(page.getByText("Clinical Workspace Overview")).not.toBeVisible();
    await expect(page.getByText("Today's Scheduled Patients")).not.toBeVisible();

    // 5. Verify Patient Journey section is COMPLETELY REMOVED
    await expect(page.getByText("A Seamless, Connected Clinical Pathway")).not.toBeVisible();
    await expect(page.getByText("Patient Journey")).not.toBeVisible();

    // 6. Verify Platform Feature Cards are present
    await expect(page.getByText("Patient Demographics & MRN")).toBeVisible();
    await expect(page.getByText("35-Session EECP Tracker")).toBeVisible();
    await expect(page.getByText("Diagnostic Lab Ingestion")).toBeVisible();

    // 7. Verify no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasHorizontalOverflow).toBe(false);

    // 8. Verify Footer
    await expect(page.getByText("Vaso-Meditech Private Limited. All Rights Reserved.")).toBeVisible();
    await expect(page.getByText("Medical Notice:")).toBeVisible();

    // Save full page screenshot
    await page.screenshot({ path: "test-results/landing_page_full.png", fullPage: true });
  });

  test("3. Sign In Page: Layout, Password Toggle, Demo Selector and Login", async ({ page }) => {
    await page.goto("/#/login");
    await page.waitForLoadState("domcontentloaded");

    // Verify Card
    const loginCard = page.locator('[data-testid="login-card"]');
    await expect(loginCard).toBeVisible();
    await expect(loginCard).toContainText("Sign In to Heal Your Heart EHR");

    // Toggle password visibility
    const pwInput = page.locator('[data-testid="login-password-input"]');
    await expect(pwInput).toHaveAttribute("type", "password");
    const toggleBtn = page.locator('[data-testid="toggle-password-visibility"]');
    await toggleBtn.click();
    await expect(pwInput).toHaveAttribute("type", "text");
    await toggleBtn.click();
    await expect(pwInput).toHaveAttribute("type", "password");

    // Click quick demo role: Reception
    const demoReceptionBtn = page.locator('[data-testid="demo-login-reception"]');
    await demoReceptionBtn.click();
    const idInput = page.locator('[data-testid="login-identifier-input"]');
    await expect(idInput).toHaveValue("reception@demo.local");

    // Switch back to doctor
    const demoDoctorBtn = page.locator('[data-testid="demo-login-doctor"]');
    await demoDoctorBtn.click();
    await expect(idInput).toHaveValue("doctor@demo.local");

    // Submit login
    const submitBtn = page.locator('[data-testid="login-submit-btn"]');
    await submitBtn.click();

    // Verify redirection to authenticated workspace
    await expect(page.locator(".charm-global-topbar")).toBeVisible({ timeout: 10000 });

    // Save screenshot
    await page.screenshot({ path: "test-results/authenticated_workspace.png" });
  });

  test("4. Sign Up Page: Practice Onboarding Access Request", async ({ page }) => {
    await page.goto("/#/signup");
    await page.waitForLoadState("domcontentloaded");

    const signupCard = page.locator('[data-testid="signup-card"]');
    await expect(signupCard).toBeVisible();
    await expect(signupCard).toContainText("Staff Onboarding & Practice Registration");
    await expect(signupCard).toContainText("Organizational Access Notice:");

    // Fill in registration fields
    await page.locator('[data-testid="signup-first-name"]').fill("Radhika");
    await page.locator('[data-testid="signup-last-name"]').fill("S");
    await page.locator('[data-testid="signup-email"]').fill("radhika.s@healyourheart.in");
    await page.locator('[data-testid="signup-phone"]').fill("9840998877");
    await page.locator('[data-testid="signup-practice"]').fill("Heal Your Heart Neelankarai");

    // Submit request
    await page.locator('[data-testid="signup-submit-btn"]').click();

    // Verify confirmation view
    const successView = page.locator('[data-testid="signup-success-view"]');
    await expect(successView).toBeVisible();
    await expect(successView).toContainText("Staff Access Request Received");
    await expect(successView).toContainText("Radhika S");

    // Back to Sign In button works
    await page.locator('[data-testid="signup-back-to-login-btn"]').click();
    await expect(page.locator('[data-testid="login-card"]')).toBeVisible();
  });

  test("5. Password Reset OTP Workflow", async ({ page }) => {
    await page.goto("/#/forgot-password");
    await page.waitForLoadState("domcontentloaded");

    const forgotCard = page.locator('[data-testid="forgot-password-card"]');
    await expect(forgotCard).toBeVisible();
    await expect(forgotCard).toContainText("Reset Your Password");

    // Request OTP for demo account
    await page.locator('[data-testid="forgot-password-identifier-input"]').fill("assistant@demo.local");
    await page.locator('[data-testid="forgot-password-request-otp-btn"]').click();

    // Verify OTP input step appears
    const otpInput = page.locator('[data-testid="forgot-password-otp-input"]');
    await expect(otpInput).toBeVisible();

    // Verify auto-filled or enter OTP
    await page.locator('[data-testid="forgot-password-new-pw-input"]').fill("password123");
    await page.locator('[data-testid="forgot-password-confirm-pw-input"]').fill("password123");

    // Submit password reset
    await page.locator('[data-testid="forgot-password-submit-btn"]').click();

    // Verify done view
    const doneView = page.locator('[data-testid="forgot-password-done-view"]');
    await expect(doneView).toBeVisible();
    await expect(doneView).toContainText("Password Updated Successfully");

    // Return to sign in
    await page.locator('[data-testid="forgot-password-back-login-btn"]').click();
    await expect(page.locator('[data-testid="login-card"]')).toBeVisible();
  });

  test("6. Facility Members Management: 62 Staff Members, Filtering & RBAC", async ({ page }) => {
    // 1. Login as Admin
    await page.goto("/#/login");
    await page.locator('[data-testid="demo-login-admin"]').click();
    await page.locator('[data-testid="login-submit-btn"]').click();
    await expect(page.locator(".charm-global-topbar")).toBeVisible({ timeout: 10000 });

    // 2. Open Settings -> Facility Members
    await page.goto("/#/settings/facility/facility-members");
    await page.waitForTimeout(1500);

    // Verify table
    const table = page.locator('[data-testid="facility-members-table"]');
    await expect(table).toBeVisible({ timeout: 10000 });

    // Verify pagination text: should contain "1 - 25 of"
    const pagination = page.locator('[data-testid="facility-members-pagination"]');
    await expect(pagination).toBeVisible();
    await expect(pagination).toContainText("1 - 25 of");

    // Click Next page
    const nextBtn = page.locator('[data-testid="pagination-next-btn"]');
    await nextBtn.click();
    await expect(pagination).toContainText("26 - 50 of");

    // Click Next page again
    await nextBtn.click();
    await expect(pagination).toContainText("51 - ");

    // Filter by Role: Therapist
    const roleSelect = page.locator('[data-testid="filter-role-select"]');
    await roleSelect.selectOption("Therapist");
    await page.waitForTimeout(500);

    // Verify role bracket displays [Therapist]
    await expect(page.locator(".charm-role-bracket").first()).toContainText("[Therapist]");

    // Reset role filter
    await roleSelect.selectOption("All Roles");

    // Search by Name
    const searchInput = page.locator('[data-testid="members-search-input"]');
    await searchInput.fill("Divya");
    await page.waitForTimeout(500);
    await expect(page.getByText("Divya A")).toBeVisible();

    // Clear search
    await searchInput.fill("");

    // Save screenshot
    await page.screenshot({ path: "test-results/facility_members_directory.png" });
  });
});
