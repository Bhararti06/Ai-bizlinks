const { By, until, Key } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const MembershipRequestsPage = require('../pages/MembershipRequestsPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Suite A: Onboarding Flow', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let registerPage;
    let requestsPage;

    const ts = Date.now();
    const orgData = {
        name: `Onboard_Org_${ts}`,
        owner: 'Onboarding Admin',
        contact: '9998887776',
        email: `onboard_admin_${ts}@example.com`,
        domain: `onboard-${ts}`
    };
    const memberData = {
        firstName: 'Onboard',
        lastName: 'Member',
        email: `onboard_mem_${ts}@example.com`,
        contact: '1234567890',
        years: '2'
    };

    const commonPassword = 'Password123!';

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        orgPage = new OrganizationsPage(driver);
        registerPage = new RegisterUserPage(driver);
        requestsPage = new MembershipRequestsPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('1. Super Admin: Login and Dashboard Validation', async function () {
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.loginSuccess(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD, dashboard.totalOrgsCount);
        console.log('DEBUG: Super Admin logged in and dashboard loaded.');
    });

    it('2. Super Admin: Create Organization', async function () {
        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();

        await orgPage.searchOrganization(orgData.name);
        const captiveLink = await orgPage.getLinkFromList(orgData.name);
        expect(captiveLink).to.contain('org=');
        globalState.setOrgUrl(captiveLink);

        await dashboard.logout();
    });

    it('3. Organization Admin: First-Time Access & Password Setup', async function () {
        const orgUrl = globalState.getOrgUrl();
        const loginUrl = orgUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);

        await loginPage.setupPassword(orgData.email, commonPassword);

        const chaptersIcon = By.xpath("//h3[contains(text(), 'Chapters')]");
        await driver.wait(until.elementLocated(chaptersIcon), 30000);
        console.log('DEBUG: Org Admin set password and reached dashboard.');
        await dashboard.logout();
    });

    it('4. Member: Registration and Success Validation', async function () {
        try {
            const capturedLink = globalState.getOrgUrl();
            await driver.get(capturedLink);

            await registerPage.register(memberData);

            // Success validation: wait for toast OR redirect to login
            const loginUrlPart = capturedLink.replace('/register-user', '/login');
            await driver.wait(async (d) => {
                const toast = await d.findElements(By.className('Toastify__toast-body'));
                const url = await d.getCurrentUrl();
                return toast.length > 0 || url.includes('/login');
            }, 30000);

            console.log('Member registration step complete (Toast detected or redirected to login).');
        } catch (e) {
            console.log(`DEBUG: Step 4 failed. Capturing diagnostics...`);
            const fs = require('fs');
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync('step4_failure.png', screenshot, 'base64');
            const source = await driver.getPageSource();
            fs.writeFileSync('step4_source.html', source);
            console.log('DEBUG: Diagnostic files saved: step4_failure.png, step4_source.html');
            throw e;
        }
    });

    it('5. Admin: Verify Member Status is Pending', async function () {
        try {
            const capturedLink = globalState.getOrgUrl();
            if (!capturedLink) throw new Error("CRITICAL: capturedLink is null in Step 5. State was lost.");
            const loginUrl = capturedLink.replace('/register-user', '/login');

            await driver.get(loginUrl);
            const chaptersIcon = By.xpath("//h3[contains(text(), 'Chapters')]");
            await loginPage.loginSuccess(orgData.email, commonPassword, chaptersIcon);

            await dashboard.navigateTo('membershipRequests');

            const memberName = `${memberData.firstName} ${memberData.lastName}`;
            const processButton = requestsPage.processBtn(memberName);
            await driver.wait(until.elementLocated(processButton), 15000);

            console.log('DEBUG: Verified member "${memberName}" is in Pending Approval state.');

            // FIX: Reliable logout regardless of UI state
            console.log('DEBUG: Forced logout and session clearing...');
            await driver.manage().deleteAllCookies();
            await driver.executeScript("window.localStorage.clear(); window.sessionStorage.clear();");
            await driver.get(loginUrl);
            await driver.sleep(2000);
            console.log('DEBUG: Session storage and cookies cleared.');

        } catch (error) {
            console.log(`DEBUG: Step 5 failed. Capturing diagnostics...`);
            const fs = require('fs');
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync('step5_failure.png', screenshot, 'base64');
            const source = await driver.getPageSource();
            fs.writeFileSync('step5_source.html', source);
            console.log('DEBUG: Diagnostic files saved: step5_failure.png, step5_source.html');
            throw error;
        }
    });

    it('6. Negative: Pending Member Attempts Login', async function () {
        try {
            const capturedLink = globalState.getOrgUrl();
            if (!capturedLink) throw new Error("CRITICAL: capturedLink is null in Step 6. State was lost.");
            const loginUrl = capturedLink.replace('/register-user', '/login');

            console.log('DEBUG: Navigating to login page...');
            await driver.get(loginUrl);
            await driver.sleep(2000); // Wait for potential redirects

            // If we are still on a dashboard/internal page, force navigation again after cleanup
            const currentUrl = await driver.getCurrentUrl();
            if (currentUrl.includes('/admin') || currentUrl.includes('/dashboard')) {
                console.log('DEBUG: Detected active session, forcing cleanup and navigation...');
                await driver.manage().deleteAllCookies();
                await driver.executeScript("window.localStorage.clear();");
                await driver.get(loginUrl);
            }

            const emailField = await driver.wait(until.elementLocated(By.id('email')), 15000);
            await driver.sleep(3000);

            console.log(`DEBUG: Attempting negative login for member: ${memberData.email}`);

            // Use the resilient helper method
            const resultMsg = await loginPage.loginExpectError(memberData.email, memberData.password);

            console.log(`DEBUG: Negative login result: "${resultMsg.substring(0, 100).replace(/\n/g, ' ')}"`);

            // Validate that we got a relevant error message
            const lowerMsg = resultMsg.toLowerCase();
            const isValid = lowerMsg.includes('pending') ||
                lowerMsg.includes('approval') ||
                lowerMsg.includes('membership') ||
                lowerMsg.includes('wait') ||
                lowerMsg.includes('not active') ||
                lowerMsg.includes('not approved');

            expect(isValid, `Error message "${resultMsg}" did not mention pending or approval state.`).to.be.true;
            expect(await driver.getCurrentUrl()).to.not.contain('/dashboard');
        } catch (e) {
            console.log(`DEBUG: Step 6 failed. Capturing diagnostics...`);
            const fs = require('fs');
            const screenshot = await driver.takeScreenshot();
            fs.writeFileSync('step6_failure.png', screenshot, 'base64');
            const source = await driver.getPageSource();
            fs.writeFileSync('step6_source.html', source);
            throw e;
        }
    });
});
