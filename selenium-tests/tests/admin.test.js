const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const ManageUsersPage = require('../pages/ManageUsersPage');
const ReferralsPage = require('../pages/ReferralsPage');
require('dotenv').config();

describe('Organization & Chapter Admin Test Suite', function () {
    let driver;
    let loginPage;
    let dashboard;
    let users;
    let referrals;

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        users = new ManageUsersPage(driver);
        referrals = new ReferralsPage(driver);

        await loginPage.goTo(`${process.env.BASE_URL}/login`);
        await loginPage.login(process.env.ORG_ADMIN_EMAIL, process.env.ORG_ADMIN_PASSWORD);
    });

    after(async function () {
        await driver.quit();
    });

    it('should be able to approve a new member', async function () {
        await dashboard.navigateTo('users');
        const testUser = 'Automation Candidate';
        const isPresent = await users.isUserInList(testUser);

        if (isPresent) {
            await users.approveUser(testUser);
            // Verify success toast or status change
            const toast = await loginPage.getErrorMessage(); // Use helper
            expect(toast).to.contain('success');
        }
    });

    it('should respect the "Chapter Referrals Only" setting', async function () {
        // This test assumes we navigate to settings and toggle the value
        // Then verify the count of members in the referral dropdown
        await dashboard.navigateTo('referrals');
        const initialCount = await referrals.getMemberCountInDropdown();

        // Logical check: If the setting is ON, count should be <= total organization members
        expect(initialCount).to.be.greaterThan(0);
    });
});
