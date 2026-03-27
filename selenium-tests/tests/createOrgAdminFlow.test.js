const { createDriver } = require('../utils/driverFactory');
const { By, until, Key } = require('selenium-webdriver');
const LoginPage = require('../pages/LoginPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const DashboardPage = require('../pages/DashboardPage');
const OrgAdminPage = require('../pages/OrgAdminPage');
const SetPasswordPage = require('../pages/SetPasswordPage');
const { expect } = require('chai');
require('dotenv').config();

describe('Suite G: Create Org Admin Flow', function () {
    this.timeout(180000);
    let driver;
    let loginPage;
    let orgPage;
    let adminPage;
    let dashboardPage;
    let setPasswordPage;

    const timestamp = Date.now();
    const orgName = `AdminSuite_${timestamp}`;
    const orgDomain = `admin-${timestamp}`;
    const superEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@bizlinks.in';
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'Password123!';

    const primaryAdmin = {
        name: 'Primary Admin',
        email: `primary_admin_${timestamp}@example.com`,
        password: 'Password123!',
        mobile: '9876543210'
    };

    const secondaryAdmin = {
        name: 'Secondary Admin',
        email: `secondary_admin_${timestamp}@example.com`,
        password: 'Password123!',
        mobile: '1234567890'
    };

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        orgPage = new OrganizationsPage(driver);
        adminPage = new OrgAdminPage(driver);
        dashboardPage = new DashboardPage(driver);
        setPasswordPage = new SetPasswordPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: SETUP - Create Org & Login as Primary Admin
    // ─────────────────────────────────────────────────────────────────
    it('1. Setup: Create Org and Login as Admin', async function () {
        await loginPage.superAdminLogin(superEmail, superPassword);

        // Create Org
        await driver.get(`${process.env.BASE_URL}/super-admin/organizations`);
        await orgPage.createOrganization({
            name: orgName,
            owner: primaryAdmin.name,
            contact: primaryAdmin.mobile,
            email: primaryAdmin.email,
            domain: orgDomain
        });
        const loginUrl = await orgPage.getCapturedUrl();

        // Capture URL and restart driver to ensure no session leaks
        console.log(`DEBUG: Org created. Restarting driver for session isolation...`);

        await driver.quit();
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        orgPage = new OrganizationsPage(driver);
        adminPage = new OrgAdminPage(driver);
        dashboardPage = new DashboardPage(driver);
        setPasswordPage = new SetPasswordPage(driver);

        // Setup Admin Password
        console.log(`DEBUG: Navigating to org login: ${loginUrl}`);
        await driver.get(loginUrl);
        await driver.wait(until.urlContains('login'), 15000);
        await driver.sleep(2000);

        try {
            await loginPage.setupPassword(primaryAdmin.email, primaryAdmin.password);
        } catch (e) {
            console.log("DEBUG: ERROR IN SETUP PASSWORD. Capturing browser logs...");
            const logs = await driver.manage().logs().get('browser');
            logs.forEach(log => console.log(`BROWSER ${log.level.name}: ${log.message}`));
            throw e;
        }

        // Login as Primary Admin
        // NOTE: After password setup, the app usually auto-logs you in. 
        // We navigate to /dashboard and check if we're already there.
        await driver.get(`${process.env.BASE_URL}/${orgDomain}/admin/dashboard`);
        try {
            await dashboardPage.waitForDashboard();
            console.log("DEBUG: Auto-logged in detected, skipping manual login.");
        } catch (e) {
            console.log("DEBUG: Not auto-logged in or dashboard not ready, checking for login page...");
            const currentUrl = await driver.getCurrentUrl();
            if (currentUrl.includes('/login')) {
                await loginPage.login(primaryAdmin.email, primaryAdmin.password);
                await dashboardPage.waitForDashboard();
            } else {
                throw new Error(`Unexpected page state: ${currentUrl}`);
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Default UI State
    // ─────────────────────────────────────────────────────────────────
    it('2. Admin: Verify Default UI State of Create Org Admin Page', async function () {
        await driver.get(`${process.env.BASE_URL}/${orgDomain}/admin/create-org-admin`);

        expect(await adminPage.isVisible(adminPage.nameInput)).to.be.true;
        expect(await adminPage.isVisible(adminPage.emailInput)).to.be.true;
        expect(await adminPage.isVisible(adminPage.mobileInput)).to.be.true;
        expect(await adminPage.isVisible(adminPage.authorizeBtn)).to.be.true;
        expect(await adminPage.isVisible(adminPage.adminTable)).to.be.true;
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Create Org Admin (Positive Flow)
    // ─────────────────────────────────────────────────────────────────
    it('3. Admin: Create Secondary Org Admin and Verify Persistence', async function () {
        await adminPage.authorizeAdmin(secondaryAdmin.name, secondaryAdmin.email, secondaryAdmin.mobile);

        // Verify success toast deterministically (v11-safe)
        const toastText = await adminPage.waitForToast('success');
        expect(toastText).to.match(/created successfully|authorized/i);

        // Verify appears in table
        const rowLocator = By.xpath(`//tr[td[contains(., "${secondaryAdmin.email}")]]`);
        await adminPage.driver.wait(until.elementLocated(rowLocator), 20000);
        await adminPage.waitForTextInElement(rowLocator, secondaryAdmin.email, 20000);
        console.log("DEBUG: Admin found in table before refresh.");

        // Refresh and verify persistence
        await driver.navigate().refresh();
        await adminPage.driver.wait(until.elementLocated(rowLocator), 20000);
        await adminPage.waitForTextInElement(rowLocator, secondaryAdmin.email, 20000);
        const rowTextAfterRefresh = await adminPage.getText(rowLocator);
        expect(rowTextAfterRefresh).to.contain(secondaryAdmin.email);
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Negative Form Validation
    // ─────────────────────────────────────────────────────────────────
    it('4. Admin: Form Validation (Empty, Invalid Email/Mobile, Duplicate)', async function () {
        await driver.navigate().refresh();
        await driver.sleep(1000); // Let React settle

        // --- Empty fields: bypass HTML5 required by submitting form via JS ---
        await adminPage.driver.executeScript(`
            const form = document.querySelector('form');
            if (form) {
                form.noValidate = true;
            }
        `);
        await adminPage.click(adminPage.authorizeBtn);
        const emptyErr = await adminPage.waitForToast('error', 15000);
        expect(emptyErr).to.match(/required|all fields/i);

        // --- Invalid Email: fill name + mobile, put a bad email in the email field ---
        await adminPage.driver.navigate().refresh();
        await adminPage.type(adminPage.nameInput, 'Test Name');
        await adminPage.type(adminPage.mobileInput, '9999999999');
        // 'invalid@email' often passes browser validation but fails our app's Regex
        await adminPage.type(adminPage.emailInput, 'invalid@email');

        // Ensure no HTML5 tooltip blocks us
        await adminPage.driver.executeScript("document.querySelector('form').noValidate = true;");
        await adminPage.click(adminPage.authorizeBtn);

        const emailErr = await adminPage.waitForToast('error', 15000);
        expect(emailErr).to.match(/valid email|invalid/i);

        // --- Duplicate Email: normal flow --- 
        await adminPage.driver.navigate().refresh();
        await adminPage.authorizeAdmin('Duplicate', secondaryAdmin.email, '9999999999');
        const dupErr = await adminPage.waitForToast('error', 15000);
        expect(dupErr).to.match(/already exists|duplicate|conflict/i);
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 5: Edit Org Admin
    // ─────────────────────────────────────────────────────────────────
    it('5. Admin: Edit Secondary Admin and Verify Persistence', async function () {
        const newName = 'Secondary Updated';
        const newMobile = '8888888888';

        await adminPage.clickEdit(secondaryAdmin.email);
        await adminPage.updateAdmin(newName, null, newMobile);

        const editToast = await adminPage.waitForToast('success');
        expect(editToast).to.match(/updated successfully|saved/i);

        // 🚀 Ensure persistence before refresh
        await driver.sleep(3000);
        await driver.navigate().refresh();

        // Verify in table after refresh
        console.log(`DEBUG: Waiting for row with mail ${secondaryAdmin.email} and text "${newName}"`);
        const rowLocator = By.xpath(`//tr[td[contains(., "${secondaryAdmin.email}")]]`);
        await adminPage.driver.wait(until.elementLocated(rowLocator), 20000);

        // Resilience: JS-based text check to bypass any Selenium getText() vs CSS flakes
        await adminPage.driver.wait(async () => {
            const found = await adminPage.driver.executeScript(`
                const rows = Array.from(document.querySelectorAll('tbody tr'));
                const row = rows.find(r => r.textContent.includes('${secondaryAdmin.email}'));
                if (!row) return false;
                return row.textContent.toLowerCase().includes('${newName.toLowerCase()}');
            `);
            return found === true;
        }, 30000, `Timed out waiting for "${newName}" in row`);

        const rowText = (await adminPage.getText(rowLocator));
        console.log(`DEBUG: Found row text: "${rowText}"`);
        try {
            expect(rowText.toLowerCase()).to.include(newName.toLowerCase());
            expect(rowText).to.include(newMobile);
        } catch (e) {
            const allRows = await adminPage.driver.executeScript("return Array.from(document.querySelectorAll('tbody tr')).map(r => r.textContent)");
            console.log("DEBUG: TABLE DUMP ON FAILURE:", allRows);
            throw e;
        }

        // Second refresh for persistence check
        await driver.navigate().refresh();
        await adminPage.driver.wait(until.elementLocated(rowLocator), 20000);
        await adminPage.driver.wait(async () => {
            const found = await adminPage.driver.executeScript(`
                const rows = Array.from(document.querySelectorAll('tbody tr'));
                const row = rows.find(r => r.textContent.includes('${secondaryAdmin.email}'));
                if (!row) return false;
                return row.textContent.toLowerCase().includes('${newName.toLowerCase()}');
            `);
            return found === true;
        }, 20000);
        const rowTextAfterRefresh = (await adminPage.getText(rowLocator));
        expect(rowTextAfterRefresh.toLowerCase()).to.include(newName.toLowerCase());
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 6: Set Password & Login Flow (Critical E2E)
    // ─────────────────────────────────────────────────────────────────
    it('6. Admin: E2E Flow - Set Password and Login with Secondary Admin', async function () {
        // Logout primary
        await dashboardPage.logout();

        // Navigate to /create-password
        await driver.get(`${process.env.BASE_URL}/create-password`);
        await setPasswordPage.setPassword(secondaryAdmin.email, secondaryAdmin.password);

        // Wait for success toast (v11-safe)
        const pwToast = await setPasswordPage.waitForToast('success');
        console.log(`DEBUG: Set Password Toast: ${pwToast}`);
        expect(pwToast).to.match(/password.*(set|created|success)|success/i);

        // Login with secondary admin
        await loginPage.navigate();
        await loginPage.login(secondaryAdmin.email, secondaryAdmin.password);

        // Verify Dashboard
        await dashboardPage.waitForDashboard();
        expect(await driver.getCurrentUrl()).to.contain('/admin/dashboard');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 7: Authentication & Access Control
    // ─────────────────────────────────────────────────────────────────
    it('7. Admin: Auth Negative Tests (Wrong Pwd, Access Control)', async function () {
        await dashboardPage.logout();

        // Wrong password - use loginExpectError so we don't wait for a dashboard
        console.log(`DEBUG: Testing wrong password for ${secondaryAdmin.email}...`);
        const errorText = await loginPage.loginExpectError(secondaryAdmin.email, 'WrongPass123!');
        console.log(`DEBUG: Got error text: "${errorText}"`);
        expect(errorText).to.match(/Invalid|Unauthorized|incorrect|fail/i);

        // Ensure no redirect
        expect(await driver.getCurrentUrl()).to.contain('/login');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 8: Revoke Admin Access
    // ─────────────────────────────────────────────────────────────────
    it('8. Admin: Revoke Secondary Admin and Verify Login Blocked', async function () {
        // Login as Primary again
        await loginPage.navigate();
        await loginPage.login(primaryAdmin.email, primaryAdmin.password);
        await driver.get(`${process.env.BASE_URL}/${orgDomain}/admin/create-org-admin`);

        // Click Revoke
        await adminPage.clickRevoke(secondaryAdmin.email);

        // Handle native browser confirm dialog
        const alert = await driver.switchTo().alert();
        await alert.accept();

        const revokeToast = await adminPage.waitForToast('success');
        expect(revokeToast).to.match(/removed successfully|Revoked successfully|deleted/i);

        // Verify removed from table deterministically
        const rowLocator = By.xpath(`//tr[td[contains(., "${secondaryAdmin.email}")]]`);
        await adminPage.waitForElementToDisappear(rowLocator);
        console.log(`DEBUG: Admin ${secondaryAdmin.email} confirmed removed.`);

        // 🚀 Ensure revoke is fully committed
        await driver.sleep(4000);
        await driver.navigate().refresh();

        // Verify Login Blocked — use loginExpectError so we wait for error toast, not dashboard
        await dashboardPage.logout();
        const blockedErr = await loginPage.loginExpectError(secondaryAdmin.email, secondaryAdmin.password);
        expect(blockedErr).to.match(/inactive|Revoked|Unauthorized|contact|deactivated/i);
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 9: Backend & Security Verification
    // ─────────────────────────────────────────────────────────────────
    it('9. Security: Verify Role, Status, and Pwd Hashing in DB', async function () {
        // Load backend .env for DB credentials
        const path = require('path');
        require('dotenv').config({ path: path.join(__dirname, '../../backend/.env') });

        const { pool } = require('../../backend/config/database');
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [primaryAdmin.email]);
        const dbAdmin = rows[0];

        expect(dbAdmin.role).to.equal('admin');
        expect(dbAdmin.status).to.equal('approved');
        expect(dbAdmin.password).to.not.equal(primaryAdmin.password); // Hashed
        expect(dbAdmin.password).to.contain('$2'); // bcrypt indicator

        await pool.end();
    });
});
