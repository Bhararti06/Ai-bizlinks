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
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Strict Application Lifecycle: Onboarding & Approval Flow', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let registerPage;
    let requestsPage;
    let masterPage;
    let provisioningPage;

    // Fixed Test Data
    const ts = Date.now();
    const orgData = {
        name: `Lifecycle_Org_${ts}`,
        owner: 'Lifecycle Admin',
        contact: '9998887776',
        email: `orgadmin_${ts}@example.com`,
        domain: `org-${ts}`
    };
    const memberData = {
        firstName: 'Test',
        lastName: 'Member',
        email: `member_${ts}@example.com`,
        contact: '1234567890',
        years: '2'
    };
    const masterData = {
        chapter: `Chapter_${ts}`,
        category: `Category_${ts}`,
        plan: `Plan_${ts}`,
        fees: '5000',
        referral: 'John Doe Referral'
    };

    // Bulk Data
    const bulkChapters = [`B_Chap_1_${ts}`, `B_Chap_2_${ts}`];
    const bulkCategories = [`B_Cat_1_${ts}`, `B_Cat_2_${ts}`];
    const bulkPlans = [`B_Plan_1_${ts}`, `B_Plan_2_${ts}`];
    const bulkMembers = [
        { firstName: 'Bulk', lastName: 'One', email: `bulk1_${ts}@example.com`, contact: '1111111111', years: '1' },
        { firstName: 'Bulk', lastName: 'Two', email: `bulk2_${ts}@example.com`, contact: '2222222222', years: '2' },
        { firstName: 'Bulk', lastName: 'Three', email: `bulk3_${ts}@example.com`, contact: '3333333333', years: '3' },
        { firstName: 'Reject', lastName: 'Me', email: `reject_${ts}@example.com`, contact: '4444444444', years: '4' }
    ];

    const commonPassword = 'Password123!';

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

    it('1. Super Admin: Login and Baseline Stats Capture', async function () {
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.login(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD);
        await driver.wait(until.urlContains('/super-admin/dashboard'), 10000);
        const orgsCountBefore = parseInt(await dashboard.getStatValue('orgs'));
        globalState.setOrgName(orgsCountBefore);
    });

    it('2. Super Admin: Create Organization & Stats Validation', async function () {
        const orgsCountBefore = globalState.getOrgName();
        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();
        await orgPage.navigateTo('dashboard');
        await driver.sleep(2000);
        const orgsCountAfter = parseInt(await dashboard.getStatValue('orgs'));
        expect(orgsCountAfter).to.equal(orgsCountBefore + 1);
    });

    it('3. Super Admin: Capture Unique Signup Link from List', async function () {
        await orgPage.navigateTo('organizations');
        await orgPage.searchOrganization(orgData.name);
        const captiveLink = await orgPage.getLinkFromList(orgData.name);
        expect(captiveLink).to.contain('org=');
        globalState.setOrgUrl(captiveLink);
        await dashboard.logout();
    });

    it('4. Organization Admin: First-Time Access & Password Setup', async function () {
        const orgUrl = globalState.getOrgUrl();
        const loginUrl = orgUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 10000);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 10000);
        await dashboard.logout();
    });

    it('5. Member: Registration and Pending Verification', async function () {
        const capturedLink = globalState.getOrgUrl();
        await driver.get(capturedLink);

        await registerPage.register(memberData);

        // Verification: Wait longer for success indication
        const successToast = By.className('Toastify__toast-body');
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.wait(async (d) => {
            const hasToast = await d.findElements(successToast).then(elems => elems.length > 0);
            const isLoginUrl = await d.getCurrentUrl().then(url => url.includes('/login'));
            return hasToast || isLoginUrl;
        }, 30000, "Registration failed to show success toast or redirect to login");

        // VERIFY: Account is Pending
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);
        await loginPage.login(memberData.email, commonPassword);

        const error = await loginPage.getErrorMessage();
        expect(error.toLowerCase()).to.contain('pending');
    });

    it('6. Admin: Master Data Setup (Chapter, Category, Plan)', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 10000);
        await loginPage.login(orgData.email, commonPassword);

        // Create Chapter
        await masterPage.navigateTo('chapters');
        await masterPage.createChapter(masterData.chapter, '9876543210', 'Pune', 'Maharashtra');

        // Create Category
        await masterPage.navigateTo('categories');
        await masterPage.createCategory(masterData.category, 'Life cycle test category');

        // Create Plan
        await masterPage.navigateTo('plans');
        await masterPage.createPlan(masterData.plan, '5000', 'Life cycle test plan');

        await dashboard.logout();
    });

    it('7. Admin: Edit Membership Request & Grant Approval', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 10000);
        await loginPage.login(orgData.email, commonPassword);

        await dashboard.navigateTo('membershipRequests');
        await requestsPage.approveUser(`${memberData.firstName} ${memberData.lastName}`, {
            chapter: masterData.chapter,
            category: masterData.category,
            plan: masterData.plan,
            referralName: masterData.referral
        });

        await dashboard.logout();
    });

    it('8. Member: Access Granted & Final Password Setup', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);

        // This is the member login setup (after approval)
        await loginPage.setupPassword(memberData.email, commonPassword);

        await driver.wait(until.urlContains('/userDashboard'), 20000);
        expect(await driver.getCurrentUrl()).to.contain('/userDashboard');
        await dashboard.logout();
    });

    it('9. Admin: Bulk Master Data Setup', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await loginPage.login(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 10000);

        for (let i = 0; i < bulkChapters.length; i++) {
            await masterPage.navigateTo('chapters');
            await masterPage.createChapter(bulkChapters[i], `900000000${i}`, 'Pune', 'MH');

            await masterPage.navigateTo('categories');
            await masterPage.createCategory(bulkCategories[i], `Bulk Category ${i}`);

            await masterPage.navigateTo('plans');
            await masterPage.createPlan(bulkPlans[i], '3000', `Bulk Plan ${i}`);
        }
    });

    it('10. Member: Bulk Registration', async function () {
        const capturedLink = globalState.getOrgUrl();
        const successToast = By.className('Toastify__toast-body');
        for (const member of bulkMembers) {
            await driver.get(capturedLink);
            await registerPage.register(member);
            // Wait for success toast to confirm registration
            await driver.wait(until.elementLocated(successToast), 10000);
            await driver.sleep(1000); // Small buffer
        }
    });

    it('11. Admin: Member Rejection Flow (Positive & Negative Validation)', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await loginPage.login(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 10000);

        await dashboard.navigateTo('membershipRequests');
        const rejectMember = bulkMembers[3]; // 'Reject Me'
        await requestsPage.rejectUser(`${rejectMember.firstName} ${rejectMember.lastName}`);

        // Verify Positive: UI shows rejected/no longer in pending
        await driver.navigate().refresh();
        const isVisible = await requestsPage.isVisible(requestsPage.processBtn(`${rejectMember.firstName} ${rejectMember.lastName}`), 3000);
        expect(isVisible).to.be.false;

        // Verify Negative: Rejected member cannot login
        await dashboard.logout();
        await loginPage.login(rejectMember.email, commonPassword);
        const error = await loginPage.getErrorMessage();
        expect(error.toLowerCase()).to.contain('reject');
    });

    it('12. Admin: Bulk Member Approval & Distinct Data Assignment', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        await driver.get(loginUrl);
        await loginPage.login(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 10000);

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

        // Approve Bulk Three
        await requestsPage.approveUser(`${bulkMembers[2].firstName} ${bulkMembers[2].lastName}`, {
            chapter: masterData.chapter,
            category: masterData.category,
            plan: masterData.plan
        });
    });

    it('13. Admin: Chapter Admin Authorization & Privilege Verification', async function () {
        await dashboard.navigateTo('createChapterAdmin');

        // Select Chapter 1
        await provisioningPage.authorizeChapterAdmin(bulkChapters[0], bulkMembers[0].firstName);

        // Finalize validation: check if listed in table
        const admins = await provisioningPage.getExistingAdmins();
        const found = admins.some(a => a.includes(bulkMembers[0].firstName));
        expect(found).to.be.true;
    });

    it('14. Member: Bulk Login & Final Access Validation', async function () {
        const capturedLink = globalState.getOrgUrl();
        const loginUrl = capturedLink.replace('/register-user', '/login');

        for (let i = 0; i < 3; i++) {
            await driver.get(loginUrl);
            await loginPage.setupPassword(bulkMembers[i].email, commonPassword);
            await driver.wait(until.urlContains('/userDashboard'), 10000);
            await dashboard.logout();
        }
    });
});
