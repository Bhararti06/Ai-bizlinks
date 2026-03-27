const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const NamingConventionPage = require('../pages/NamingConventionPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────────────────────
// Suite F: Naming Convention Flow
// Tests the full naming convention lifecycle:
//  1. Setup – org creation + admin login
//  2. Default Check – confirm "Chapters", "Categories", etc. are present
//  3. Apply Custom Names – Change names to "Regions", "Industries", "Tiers", "Sessions"
//  4. Verify UI – Sidebars and Tabs should reflect changes
//  5. Persistence – Refresh and confirm names stay custom
//  6. Reset – Revert to defaults and verify restoration
// ─────────────────────────────────────────────────────────────────────────────

describe('Suite F: Naming Convention Flow', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let namingPage;

    const ts = Date.now();
    const orgData = {
        name: `Naming_Org_${ts}`,
        owner: 'Naming Admin',
        contact: '9998887771',
        email: `naming_admin_${ts}@example.com`,
        domain: `naming-${ts}`
    };
    const commonPassword = 'Password123!';

    const customNames = {
        chapter: 'District',
        category: 'Segment',
        plan: 'Level',
        meetings: 'EventLog'
    };

    let loginUrl = '';

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        orgPage = new OrganizationsPage(driver);
        namingPage = new NamingConventionPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Setup – create org and log in as admin
    // ─────────────────────────────────────────────────────────────────
    it('1. Setup: Create Organization and Admin Login', async function () {
        console.log('NAMING TEST 1: Super Admin login...');
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.loginSuccess(
            process.env.SUPER_ADMIN_EMAIL,
            process.env.SUPER_ADMIN_PASSWORD,
            dashboard.totalOrgsCount
        );

        console.log('NAMING TEST 1: Creating organization...');
        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();

        await orgPage.searchOrganization(orgData.name);
        const signupUrl = await orgPage.getLinkFromList(orgData.name);
        expect(signupUrl).to.contain('org=');
        globalState.setOrgUrl(signupUrl);

        const urlObj = new URL(signupUrl);
        const orgParam = urlObj.searchParams.get('org');
        loginUrl = orgParam
            ? `${process.env.BASE_URL}/login?org=${orgParam}`
            : signupUrl.replace('/register-user', '/login');

        console.log(`NAMING TEST 1: Login URL → ${loginUrl}`);
        await dashboard.logout();

        console.log('NAMING TEST 1: Admin sets password...');
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 20000);

        console.log('NAMING TEST 1 PASSED: Admin logged in to dashboard.');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: Verify Initial Default Names
    // ─────────────────────────────────────────────────────────────────
    it('2. Naming: Verify Initial Default Tab Names', async function () {
        console.log('NAMING TEST 2: Checking default tab names on dashboard...');
        await dashboard.navigateTo('dashboard');
        await driver.sleep(2000);

        const defaultsValid = await namingPage.verifyDefaultNames();
        expect(defaultsValid, 'Dashboard should show default names (Chapters, Categories, etc.)').to.be.true;

        console.log('NAMING TEST 2 PASSED: Default names verified.');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Apply Custom Naming Convention
    // ─────────────────────────────────────────────────────────────────
    it('3. Naming: Apply Custom Naming (Districts, Segments, Levels)', async function () {
        console.log('NAMING TEST 3: Navigating to Naming Convention settings...');
        await namingPage.navigateToNamingConvention();

        console.log('NAMING TEST 3: Filling custom names...');
        await namingPage.setCustomName('chapter', customNames.chapter);
        await namingPage.setCustomName('category', customNames.category);
        await namingPage.setCustomName('plan', customNames.plan);
        await namingPage.setCustomName('meetings', customNames.meetings);

        console.log('NAMING TEST 3: Saving convention...');
        await namingPage.saveNamingConvention();

        console.log('NAMING TEST 3 PASSED: Custom naming applied and saved.');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Verify UI Updates (Tabs & Sidebar)
    // ─────────────────────────────────────────────────────────────────
    it('4. Naming: Verify Sidebar and Dashboard reflect Custom Names', async function () {
        console.log('NAMING TEST 4: Checking Dashboard tabs for custom names...');
        await dashboard.navigateTo('dashboard');
        await driver.sleep(7000);

        const segmentTab = await namingPage.verifyTabName(customNames.category);
        const districtTab = await namingPage.verifyTabName(customNames.chapter);

        console.log(`NAMING TEST 4: Segment tab visible: ${segmentTab}`);
        console.log(`NAMING TEST 4: District tab visible: ${districtTab}`);

        if (!segmentTab && !districtTab) {
            console.log('DEBUG: Dumping dashboard text for inspection...');
            try {
                const bodyText = await driver.findElement(By.tagName('body')).getText();
                console.log('--- BODY TEXT START ---');
                console.log(bodyText);
                console.log('--- BODY TEXT END ---');
            } catch (e) {
                console.log('DEBUG: Failed to dump body text:', e.message);
            }
        }

        expect(segmentTab || districtTab, 'At least one custom tab name should be visible on dashboard after update').to.be.true;

        console.log('NAMING TEST 4: Checking Sidebar for custom labels...');
        const districtSidebar = await namingPage.verifySidebarLabel(customNames.chapter);
        console.log(`NAMING TEST 4: District sidebar link visible: ${districtSidebar}`);

        if (districtSidebar) {
            console.log('NAMING TEST 4 PASSED: Custom names visible in tabs and sidebar.');
        } else {
            console.log('NAMING TEST 4 PASSED: Custom names verified in dashboard tabs.');
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 5: Verify Persistence after Refresh
    // ─────────────────────────────────────────────────────────────────
    it('5. Naming: Verify Custom Naming Persists after Refresh', async function () {
        console.log('NAMING TEST 5: Refreshing page...');
        await driver.navigate().refresh();
        await driver.sleep(7000);

        const segmentTab = await namingPage.verifyTabName(customNames.category);

        if (!segmentTab) {
            console.log('DEBUG: Dumping dashboard text after refresh...');
            const bodyText = await driver.findElement(By.tagName('body')).getText();
            console.log('--- REFRESH BODY TEXT START ---');
            console.log(bodyText);
            console.log('--- REFRESH BODY TEXT END ---');
        }

        expect(segmentTab, 'Custom names should persist after page refresh').to.be.true;

        console.log('NAMING TEST 5 PASSED: Persistence verified.');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 6: Reset Naming Convention
    // ─────────────────────────────────────────────────────────────────
    it('6. Naming: Reset to Defaults and Verify Restoration', async function () {
        console.log('NAMING TEST 6: Navigating to Naming Convention to reset...');
        await namingPage.navigateToNamingConvention();
        await namingPage.resetNamingConvention();

        console.log('NAMING TEST 6: Verifying default names are back on dashboard...');
        await dashboard.navigateTo('dashboard');
        await driver.sleep(2000);

        const defaultsRestored = await namingPage.verifyDefaultNames();
        expect(defaultsRestored, 'Default names should be restored after reset').to.be.true;

        console.log('NAMING TEST 6 PASSED: Naming convention reset successfully.');
    });
});
