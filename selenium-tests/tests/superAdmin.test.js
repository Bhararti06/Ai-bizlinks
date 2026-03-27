const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Super Admin Suite: Dynamic URL Capture', function () {
    let driver;
    let loginPage;
    let orgPage;

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        orgPage = new OrganizationsPage(driver);

        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.login(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD);
    });

    after(async function () {
        await driver.quit();
    });

    it('should create an organization and capture the dynamic URL', async function () {
        const orgData = {
            name: `Test Org ${Date.now()}`,
            owner: 'Test Admin',
            contact: '1234567890',
            email: `admin_${Date.now()}@example.com`,
            domain: `test-org-${Date.now()}`
        };

        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);

        const capturedUrl = await orgPage.getCapturedUrl();
        expect(capturedUrl).to.contain('login?org=');

        // Store in GlobalState for subsequent tests
        globalState.setOrgUrl(capturedUrl);
        console.log(`Captured Org URL: ${capturedUrl}`);

        await orgPage.closeSuccessModal();
    });
});
