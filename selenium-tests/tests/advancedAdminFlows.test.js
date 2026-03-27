const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const MembershipRequestsPage = require('../pages/MembershipRequestsPage');
const MasterDataPage = require('../pages/MasterDataPage');
const AccountProvisioningPage = require('../pages/AccountProvisioningPage');
require('dotenv').config();

describe('Suite C: Advanced Admin Flow', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let registerPage;
    let requestsPage;
    let masterPage;
    let provisioningPage;

    const ts = Date.now();
    const orgData = {
        name: `Adv_Org_${ts}`,
        owner: 'Advanced Admin',
        contact: '9998887776',
        email: `adv_admin_${ts}@example.com`,
        domain: `adv-${ts}`
    };
    const bulkChapters = [`Adv_Chap_1_${ts}`, `Adv_Chap_2_${ts}`];
    const bulkCategories = [`Adv_Cat_1_${ts}`, `Adv_Cat_2_${ts}`];
    const bulkPlans = [`Adv_Plan_1_${ts}`, `Adv_Plan_2_${ts}`];
    const bulkMembers = [
        { firstName: 'Bulk', lastName: 'One', email: `bulk1_${ts}@example.com`, contact: '1111111111', years: '1' },
        { firstName: 'Bulk', lastName: 'Two', email: `bulk2_${ts}@example.com`, contact: '2222222222', years: '2' },
        { firstName: 'Reject', lastName: 'Me', email: `reject_${ts}@example.com`, contact: '4444444444', years: '4' }
    ];

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
        provisioningPage = new AccountProvisioningPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    it('1. Setup: Create Org and Admin', async function () {
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.login(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD);
        await driver.wait(until.elementLocated(dashboard.totalOrgsCount), 30000);

        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();
        await orgPage.searchOrganization(orgData.name);
        signupUrl = await orgPage.getLinkFromList(orgData.name);
        await dashboard.logout();

        const loginUrl = signupUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.elementLocated(By.xpath("//h3[contains(text(), 'Chapters')]")), 30000);
    });

    it('2. Admin: Bulk Master Data Setup', async function () {
        for (let i = 0; i < bulkChapters.length; i++) {
            await masterPage.navigateTo('chapters');
            await masterPage.createChapter(bulkChapters[i], `900000000${i}`, 'Pune', 'MH');

            await masterPage.navigateTo('categories');
            await masterPage.createCategory(bulkCategories[i], `Bulk Category ${i}`);

            await masterPage.navigateTo('plans');
            await masterPage.createPlan(bulkPlans[i], '3000', `Bulk Plan ${i}`);
        }
    });

    it('3. Member: Bulk Registration', async function () {
        for (const member of bulkMembers) {
            await driver.get(signupUrl);
            await registerPage.register(member);
            // Wait for success indication (URL change or toast)
            await driver.sleep(2000); // Give time for registration to process
        }
    });

    it('4. Admin: Member Rejection Flow', async function () {
        const loginUrl = signupUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await loginPage.loginSuccess(orgData.email, commonPassword, By.xpath("//h3[contains(text(), 'Chapters')]"));

        await dashboard.navigateTo('membershipRequests');
        const rejectMember = bulkMembers[2];
        await requestsPage.rejectUser(`${rejectMember.firstName} ${rejectMember.lastName}`);

        // Verify Negative: Rejected member cannot login
        await dashboard.logout();
        await driver.get(loginUrl);
        await loginPage.loginExpectError(rejectMember.email, commonPassword);
    });

    it('5. Admin: Bulk Member Approval & Chapter Admin Auth', async function () {
        const loginUrl = signupUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await loginPage.loginSuccess(orgData.email, commonPassword, By.xpath("//h3[contains(text(), 'Chapters')]"));

        await dashboard.navigateTo('membershipRequests');

        // Approve Bulk One
        await requestsPage.approveUser(`${bulkMembers[0].firstName} ${bulkMembers[0].lastName}`, {
            chapter: bulkChapters[0],
            category: bulkCategories[0],
            plan: bulkPlans[0]
        });

        // Approve Bulk Two
        await requestsPage.approveUser(`${bulkMembers[1].firstName} ${bulkMembers[1].lastName}`, {
            chapter: bulkChapters[1],
            category: bulkCategories[1],
            plan: bulkPlans[1]
        });

        // Chapter Admin Authorization
        await dashboard.navigateTo('createChapterAdmin');
        await provisioningPage.authorizeChapterAdmin(bulkChapters[0], bulkMembers[0].firstName);

        const admins = await provisioningPage.getExistingAdmins();
        const found = admins.some(a => a.includes(bulkMembers[0].firstName));
        expect(found).to.be.true;
    });

    it('6. Member: Bulk Login Validation', async function () {
        await dashboard.logout();
        const loginUrl = signupUrl.replace('/register-user', '/login');

        for (let i = 0; i < 2; i++) {
            await driver.get(loginUrl);
            await loginPage.setupPassword(bulkMembers[i].email, commonPassword);

            // Wait for unique dashboard element
            const userDashboardCard = By.xpath("//div[contains(@class, 'premium-card')]//h3");
            await driver.wait(until.elementLocated(userDashboardCard), 30000);

            await dashboard.logout();
        }
    });
});
