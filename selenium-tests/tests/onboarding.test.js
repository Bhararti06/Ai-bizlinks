const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const DashboardPage = require('../pages/DashboardPage');
const ManageUsersPage = require('../pages/ManageUsersPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Member Onboarding Flow', function () {
    let driver;
    let loginPage;
    let registerPage;
    let dashboard;
    let usersPage;
    const memberEmail = `member_${Date.now()}@example.com`;
    const memberName = 'E2E Onboarding Member';

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        registerPage = new RegisterUserPage(driver);
        dashboard = new DashboardPage(driver);
        usersPage = new ManageUsersPage(driver);

        // Use dynamically captured URL if available, otherwise fallback
        const orgUrl = globalState.getOrgUrl() || `${process.env.BASE_URL}/login?org=test-org`;
        await driver.get(orgUrl.replace('/login', '/register-user'));
    });

    after(async function () {
        await driver.quit();
    });

    it('should allow a new member to register', async function () {
        await registerPage.register({
            name: memberName,
            email: memberEmail,
            chapter: 'Default Chapter'
        });
        // Verification: signup success message
        const success = await registerPage.isVisible(registerPage.successMessage);
        expect(success).to.be.true;
    });

    it('should block login before approval', async function () {
        const orgUrl = globalState.getOrgUrl() || `${process.env.BASE_URL}/login?org=test-org`;
        await driver.get(orgUrl);
        await loginPage.login(memberEmail, 'Password123!');
        const error = await loginPage.getErrorMessage();
        expect(error.toLowerCase()).to.contain('pending');
    });

    it('should allow Org Admin to approve the member', async function () {
        const orgUrl = globalState.getOrgUrl() || `${process.env.BASE_URL}/login?org=test-org`;
        await driver.get(orgUrl);
        await loginPage.login(process.env.ORG_ADMIN_EMAIL, process.env.ORG_ADMIN_PASSWORD);

        await dashboard.navigateTo('users');
        await usersPage.approveUser(memberName);
        await dashboard.logout();
    });

    it('should allow member to set password and login after approval', async function () {
        const orgUrl = globalState.getOrgUrl() || `${process.env.BASE_URL}/login?org=test-org`;
        await driver.get(orgUrl);

        // Flow: Email -> Password Setup -> Login
        const newPassword = 'FinalPassword123!';
        await loginPage.setupPassword(memberEmail, newPassword);

        // Post password setup, should be logged in or able to log in
        const stats = await dashboard.isVisible(dashboard.statsCard);
        expect(stats).to.be.true;
    });
});
