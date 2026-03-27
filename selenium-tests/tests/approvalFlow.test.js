const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const MembershipRequestsPage = require('../pages/MembershipRequestsPage');
const MasterDataPage = require('../pages/MasterDataPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Suite B: Approval Flow', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let registerPage;
    let requestsPage;
    let masterPage;

    const ts = Date.now();
    let orgData = {
        name: `Approv_Org_${ts}`,
        owner: 'Approval Admin',
        contact: '9998887776',
        email: `approv_admin_${ts}@example.com`,
        domain: `approv-${ts}`
    };
    let memberData = {
        firstName: 'Approv',
        lastName: 'Member',
        email: `approv_mem_${ts}@example.com`,
        contact: '1234567890',
        years: '2'
    };
    const masterData = {
        chapter: `App_Chap_${ts}`,
        category: `App_Cat_${ts}`,
        plan: `App_Plan_${ts}`
    };

    const commonPassword = 'Password123!';
    let signupUrl;

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        orgPage = new OrganizationsPage(driver);
        registerPage = new RegisterUserPage(driver);
        requestsPage = new MembershipRequestsPage(driver);
        masterPage = new MasterDataPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('1. Setup: Create Org, Admin, Master Data and Register Member', async function () {
        // Super Admin Login
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.loginSuccess(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD, dashboard.totalOrgsCount);
        console.log('DEBUG: Super Admin logged in and dashboard loaded.');

        // Store data in GlobalState for cross-step persistence
        globalState.state.orgData = orgData;
        globalState.state.memberData = memberData;
        globalState.state.masterData = masterData;

        // Create Org
        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();
        await orgPage.searchOrganization(orgData.name);
        signupUrl = await orgPage.getLinkFromList(orgData.name);
        globalState.state.signupUrl = signupUrl; // Essential for subsequent steps

        await dashboard.logout();

        // Admin Password Setup
        const loginUrl = signupUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.elementLocated(dashboard.chaptersHeader), 30000);

        // Master Data Setup
        await masterPage.navigateTo('chapters');
        await masterPage.createChapter(masterData.chapter, '9876543210', 'Pune', 'MH');
        await masterPage.navigateTo('categories');
        await masterPage.createCategory(masterData.category, 'Approval Flow Category');
        await masterPage.navigateTo('plans');
        await masterPage.createPlan(masterData.plan, '1000', 'Approval Flow Plan');
        await dashboard.logout();

        // Member Registration
        await driver.get(signupUrl);
        await registerPage.register(memberData);
        await driver.wait(until.urlContains('/login'), 30000);
    });

    it('2. Admin: Approve Pending Member', async function () {
        const currentUrl = signupUrl || globalState.state.signupUrl;
        if (!currentUrl) throw new Error("Signup URL not found in GlobalState! Step 1 probably failed.");

        const loginUrl = currentUrl.replace('/register-user', '/login');
        const adminEmail = orgData.email || globalState.state.orgData.email;

        await driver.get(loginUrl);
        await loginPage.loginSuccess(adminEmail, commonPassword, dashboard.chaptersHeader);

        // Check initial active member count
        const initialMemberCount = await dashboard.getActiveMemberCount();
        console.log(`DEBUG: Initial active member count: ${initialMemberCount}`);

        await dashboard.navigateTo('membershipRequests');
        await requestsPage.approveUser(`${memberData.firstName} ${memberData.lastName}`, {
            chapter: masterData.chapter,
            category: masterData.category,
            plan: masterData.plan,
            referralName: 'Auto Approval System'
        });

        // Navigate back to dashboard to verify member count increased
        await dashboard.navigateTo('dashboard');
        await driver.sleep(2000); // Wait for dashboard to refresh
        const updatedMemberCount = await dashboard.getActiveMemberCount();
        console.log(`DEBUG: Updated active member count: ${updatedMemberCount}`);

        expect(updatedMemberCount).to.equal(initialMemberCount + 1);
        console.log('DEBUG: Active member count increased by 1 after approval.');

        await dashboard.logout();
    });

    it('3. Member: Final Password Setup and Dashboard Verification', async function () {
        const currentUrl = signupUrl || globalState.state.signupUrl;
        if (!currentUrl) throw new Error("Signup URL not found in GlobalState!");

        const loginUrl = currentUrl.replace('/register-user', '/login');
        const memberEmail = memberData.email || globalState.state.memberData.email;

        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);

        await loginPage.setupPassword(memberEmail, commonPassword);

        // Verify member successfully logged in (not on login page)
        let url = await driver.getCurrentUrl();
        console.log(`DEBUG: Member landed on: ${url}`);
        expect(url).to.not.contain('/login');

        // Navigate to member dashboard directly
        console.log('DEBUG: Navigating to member dashboard...');
        const baseUrl = url.split('?')[0]; // Remove query params if any
        const dashboardUrl = `${baseUrl}/userdashboard`;
        await driver.get(dashboardUrl);

        console.log('DEBUG: Waiting for dashboard to load...');
        await driver.sleep(2000);

        // Verify member is on dashboard page
        const finalUrl = await driver.getCurrentUrl();
        console.log(`DEBUG: Final member URL: ${finalUrl}`);
        expect(finalUrl).to.not.contain('/login');
        expect(finalUrl).to.contain('/userdashboard');
        expect(finalUrl).to.contain(orgData.domain || globalState.state.orgData.domain);

        console.log('DEBUG: Member successfully accessed dashboard page.');
    });
});
