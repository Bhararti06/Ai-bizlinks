const { createDriver } = require('../utils/driverFactory');
const { By, until, Key } = require('selenium-webdriver');
const LoginPage = require('../pages/LoginPage');
const MasterDataPage = require('../pages/MasterDataPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const DashboardPage = require('../pages/DashboardPage');
const ChapterAdminPage = require('../pages/ChapterAdminPage');
const globalState = require('../utils/GlobalState');
const { expect } = require('chai');
require('dotenv').config();

describe('Suite H: Create Chapter Admin Flow', function () {
    this.timeout(400000);
    let driver;
    let loginPage;
    let masterPage;
    let registerPage;
    let dashboardPage;
    let chapterAdminPage;

    // Use shared state if available, else generate new
    const ts = globalState.get('suite_h_ts') || Date.now();
    if (!globalState.get('suite_h_ts')) globalState.set('suite_h_ts', ts);

    const orgData = {
        name: globalState.get('orgName') || `ChapterRoleFlow_${ts}`,
        domain: globalState.get('orgDomain') || `chap-role-${ts}`
    };

    const superEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@bizlinks.in';
    const superPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin1';

    const chapters = [
        { name: 'Nashik', city: 'Nashik', state: 'Maharashtra', phone: '9000000001' },
        { name: 'Pune', city: 'Pune', state: 'Maharashtra', phone: '9000000002' },
        { name: 'Mumbai', city: 'Mumbai', state: 'Maharashtra', phone: '9000000003' }
    ];

    const members = {
        'Nashik': [
            { firstName: 'Nashik', lastName: 'MemberA', email: `nashik_a_${ts}@example.com` },
            { firstName: 'Nashik', lastName: 'MemberB', email: `nashik_b_${ts}@example.com` }
        ],
        'Pune': [
            { firstName: 'Pune', lastName: 'MemberA', email: `pune_a_${ts}@example.com` },
            { firstName: 'Pune', lastName: 'MemberB', email: `pune_b_${ts}@example.com` }
        ],
        'Mumbai': [
            { firstName: 'Mumbai', lastName: 'MemberA', email: `mumbai_a_${ts}@example.com` },
            { firstName: 'Mumbai', lastName: 'MemberB', email: `mumbai_b_${ts}@example.com` }
        ]
    };

    let orgAdminEmail = globalState.get('orgAdminEmail') || `org_admin_${ts}@example.com`;
    let commonPassword = 'Password123!';

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        masterPage = new MasterDataPage(driver);
        registerPage = new RegisterUserPage(driver);
        dashboardPage = new DashboardPage(driver);
        chapterAdminPage = new ChapterAdminPage(driver);
    });

    afterEach(async function () {
        if (this.currentTest.state === 'failed') {
            const screenshot = await driver.takeScreenshot();
            const fs = require('fs');
            const path = require('path');
            const sanitizedTitle = this.currentTest.title.replace(/[^a-z0-9]/gi, '_');
            const screenshotName = `fail_${sanitizedTitle}_${Date.now()}.png`;
            const screenshotPath = path.join(__dirname, '..', 'screenshots', screenshotName);

            if (!fs.existsSync(path.join(__dirname, '..', 'screenshots'))) {
                fs.mkdirSync(path.join(__dirname, '..', 'screenshots'));
            }
            fs.writeFileSync(screenshotPath, screenshot, 'base64');
            console.log(`DEBUG: Screenshot saved for failed test: ${screenshotName}`);
        }
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    async function ensureOrgAdmin() {
        // Must have domain and URL in state
        const domain = globalState.getOrgDomain();
        if (!domain) {
            console.error("DEBUG: Cannot ensure login without domain. Setup test might have failed.");
            throw new Error("Missing Domain Context");
        }

        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        const targetUrl = `${baseUrl}/login?org=${domain}`;
        console.log(`DEBUG: Ensuring Org Admin login for ${orgAdminEmail} on ${domain}...`);
        await loginPage.logout();
        await driver.get(targetUrl);
        await loginPage.loginSuccess(orgAdminEmail, commonPassword, dashboardPage.chaptersHeader);
    }

    async function navigateToCreateAdmin() {
        await ensureOrgAdmin();
        await dashboardPage.navigateTo('createChapterAdmin');
        // Wait for a key element on the target page
        await driver.wait(until.elementLocated(chapterAdminPage.chapterSelect), 20000);
    }

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: SETUP
    // ─────────────────────────────────────────────────────────────────
    it('1. Setup: Seed Data (Chapters & Members)', async function () {
        // Skip setup if already completed in a previous run (GlobalState check)
        if (globalState.get('suite_h_setup_done')) {
            console.log("DEBUG: Setup already marked as done in GlobalState. Skipping seeding.");
            return;
        }

        console.log("DEBUG: STEP 1 - Creating Organization...");
        // 1. Create Org
        await loginPage.superAdminLogin(superEmail, superPassword);
        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        await driver.get(`${baseUrl}/super-admin/organizations`);
        const OrganizationsPage = require('../pages/OrganizationsPage');
        const orgPage = new OrganizationsPage(driver);
        await orgPage.createOrganization({
            name: orgData.name,
            owner: 'Org Admin',
            contact: '9876543210',
            email: orgAdminEmail,
            domain: orgData.domain
        });
        const signupUrl = await orgPage.getCapturedUrl();
        console.log(`DEBUG: Signup URL captured: ${signupUrl}`);

        // SAVE TO GLOBAL STATE
        globalState.setOrgUrl(signupUrl);
        globalState.setOrgAdmin(orgAdminEmail, commonPassword);
        globalState.set('orgName', orgData.name);

        await loginPage.logout();

        console.log("DEBUG: STEP 2 - Setting Admin Password...");
        // 2. Set Password
        await driver.get(signupUrl);
        const SetPasswordPage = require('../pages/SetPasswordPage');
        const setPwPage = new SetPasswordPage(driver);
        await setPwPage.setPassword(orgAdminEmail, commonPassword);

        console.log("DEBUG: STEP 3 - Seeding Chapters...");
        // 3. Create Chapters
        await loginPage.navigate();
        await loginPage.loginSuccess(orgAdminEmail, commonPassword, dashboardPage.chaptersHeader);
        for (const chap of chapters) {
            console.log(`DEBUG: Creating Chapter ${chap.name}...`);
            await dashboardPage.navigateTo('chapters');
            await masterPage.createChapter(chap.name, chap.phone, chap.city, chap.state);
            await driver.sleep(1000); // Small breath between creations
        }

        // 3.1 Create Categories
        console.log("DEBUG: Creating Category Individual...");
        await dashboardPage.navigateTo('categories');
        await masterPage.createCategory('Individual', 'Default membership category');

        // 3.2 Create Plans
        console.log("DEBUG: Creating Plan Standard Plan...");
        await dashboardPage.navigateTo('plans');
        await masterPage.createPlan('Standard Plan', '1000', 'Standard membership plan');

        await loginPage.logout();
        console.log("DEBUG: STEP 4 - Registering Members...");
        // 4. Register Members
        for (const [chapName, chapMembers] of Object.entries(members)) {
            for (const member of chapMembers) {
                console.log(`DEBUG: Registering Member ${member.email} for chapter ${chapName}...`);
                const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
                await driver.get(`${baseUrl}/register-user?org=${orgData.domain}`);
                await registerPage.register({ ...member, contact: '9999999999', years: '2' });
                await driver.wait(until.urlContains('/login'), 15000);
                console.log(`DEBUG: Member ${member.email} registered.`);
            }
        }

        console.log("DEBUG: STEP 5 - Approving Members...");
        // 5. Approve Members
        await loginPage.navigate();
        await loginPage.loginSuccess(orgAdminEmail, commonPassword, dashboardPage.chaptersHeader);
        await dashboardPage.navigateTo('membershipRequests');
        const MembershipRequestsPage = require('../pages/MembershipRequestsPage');
        const reqPage = new MembershipRequestsPage(driver);
        for (const [chapName, chapMembers] of Object.entries(members)) {
            for (const member of chapMembers) {
                console.log(`DEBUG: Approving Member ${member.email} in chapter ${chapName}...`);
                await reqPage.approveUser(`${member.firstName} ${member.lastName}`, {
                    chapter: chapName,
                    category: 'Individual',
                    plan: 'Standard Plan',
                    referralName: 'Self'
                });
                await driver.sleep(1000); // Allow Toast to clear
            }
        }

        console.log("DEBUG: STEP 6 - Setting Member Passwords...");
        // 6. Set passwords for each approved member
        await loginPage.logout(); // ensure we are logged out before member logins
        for (const chapMembers of Object.values(members)) {
            for (const member of chapMembers) {
                console.log(`DEBUG: Setting password for ${member.email}...`);
                await driver.get(`${baseUrl}/login`);
                await loginPage.setupPassword(member.email, commonPassword);
                // Log out member so the next iteration starts fresh
                await loginPage.logout();
                console.log(`DEBUG: Password set for ${member.email}.`);
            }
        }

        globalState.set('suite_h_setup_done', true);
        console.log("DEBUG: Setup Finished Successfully.");
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 2-13
    // ─────────────────────────────────────────────────────────────────
    it('2. Admin: Verify Default UI State', async function () {
        await navigateToCreateAdmin();
        expect(await chapterAdminPage.isVisible(chapterAdminPage.chapterSelect)).to.be.true;
        expect(await chapterAdminPage.isCandidateDropdownDisabled()).to.be.true;
        expect(await chapterAdminPage.isAuthorizeButtonDisabled()).to.be.true;
    });

    it('3. Admin: Verify Chapter Dropdown Population', async function () {
        await navigateToCreateAdmin();
        const options = await driver.findElements(By.xpath(`${chapterAdminPage.chapterSelect.value}/option`));
        const texts = [];
        for (const opt of options) {
            const txt = await opt.getText();
            if (txt && !txt.toLowerCase().includes('choose')) texts.push(txt.trim());
        }
        expect(texts).to.include('Nashik');
        expect(texts).to.include('Pune');
        expect(texts).to.include('Mumbai');
    });

    it('4. Admin: Dependent Candidate Filtering', async function () {
        await navigateToCreateAdmin();
        const chapter = 'Nashik';
        await chapterAdminPage.selectChapter(chapter);
        await chapterAdminPage.waitForCandidateListUpdate();

        const options = await driver.findElements(By.xpath(`${chapterAdminPage.memberSelect.value}/option`));
        const texts = [];
        for (const opt of options) {
            const txt = await opt.getText();
            if (txt && !txt.toLowerCase().includes('select candidate')) texts.push(txt);
        }

        for (const em of members[chapter]) {
            expect(texts.some(t => t.includes(em.email))).to.be.true;
        }
    });

    it('5. Admin: Authorize Nashik Member A as Chapter Admin', async function () {
        await navigateToCreateAdmin();
        const chapter = 'Nashik';
        const member = members[chapter][0];

        await chapterAdminPage.selectChapter(chapter);
        await chapterAdminPage.waitForCandidateListUpdate();
        await chapterAdminPage.selectCandidate(`${member.firstName} ${member.lastName} (${member.email})`);
        await chapterAdminPage.authorizePrivilege();
        await chapterAdminPage.waitForToast('success');

        const admins = await chapterAdminPage.getExistingAdmins();
        expect(admins.some(a => a.includes(member.email))).to.be.true;
    });

    it('6. Admin: Prevent Duplicate Assignment', async function () {
        await navigateToCreateAdmin();
        const member = members['Nashik'][0];
        await chapterAdminPage.selectChapter('Nashik');
        const options = await driver.findElements(By.xpath(`${chapterAdminPage.memberSelect.value}/option`));
        const texts = [];
        for (const opt of options) texts.push(await opt.getText());
        expect(texts.some(t => t.includes(member.email))).to.be.false;
    });

    it('7. Admin: Verify List Updates when Switching Chapters', async function () {
        await navigateToCreateAdmin();
        await chapterAdminPage.selectChapter('Pune');
        let admins = await chapterAdminPage.getExistingAdmins();
        expect(admins.length).to.equal(0);

        const member = members['Pune'][0];
        await chapterAdminPage.selectCandidate(`${member.firstName} ${member.lastName} (${member.email})`);
        await chapterAdminPage.authorizePrivilege();
        await chapterAdminPage.waitForToast('success');

        await chapterAdminPage.selectChapter('Nashik');
        admins = await chapterAdminPage.getExistingAdmins();
        expect(admins.some(a => a.includes(members['Nashik'][0].email))).to.be.true;
    });

    it('8. Admin: Verify Reset Button Functionality', async function () {
        await navigateToCreateAdmin();
        await chapterAdminPage.selectChapter('Mumbai');
        await chapterAdminPage.waitForCandidateListUpdate();
        const member = members['Mumbai'][0];
        await chapterAdminPage.selectCandidate(`${member.firstName} ${member.lastName} (${member.email})`);
        await chapterAdminPage.resetForm();
        expect(await chapterAdminPage.isCandidateDropdownDisabled()).to.be.true;
    });

    it('9. Admin: Revoke Nashik Member A and Verify Removal', async function () {
        await navigateToCreateAdmin();
        const member = members['Nashik'][0];
        await chapterAdminPage.selectChapter('Nashik');
        await chapterAdminPage.revokeAdmin(member.email);
        await driver.wait(until.alertIsPresent(), 10000);
        await (await driver.switchTo().alert()).accept();
        await chapterAdminPage.waitForToast('success');

        const admins = await chapterAdminPage.getExistingAdmins();
        expect(admins.some(a => a.includes(member.email))).to.be.false;
    });

    it('10. Security: Verify Revoked User Redirected to Member Portal', async function () {
        const member = members['Nashik'][0];
        const domain = globalState.getOrgDomain();
        await loginPage.logout();
        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        await driver.get(`${baseUrl}/login?org=${domain}`);
        await loginPage.loginSuccess(member.email, commonPassword, By.xpath("//h2[contains(text(), 'Dashboard')]"));

        expect(await driver.getCurrentUrl()).to.not.contain('/admin/');
        const sidebarText = await driver.findElement(By.css('aside')).getText();
        expect(sidebarText.toLowerCase()).to.not.contain('master data');
    });

    it('11. Security: Verify Newly Assigned Chapter Admin Access', async function () {
        const member = members['Pune'][0];
        const domain = globalState.getOrgDomain();
        await loginPage.logout();
        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        await driver.get(`${baseUrl}/login?org=${domain}`);
        await loginPage.loginSuccess(member.email, commonPassword, dashboardPage.chaptersHeader);

        expect(await driver.getCurrentUrl()).to.contain('/admin/dashboard');
        const sidebar = await driver.findElement(By.css('aside')).getText();
        expect(sidebar).to.contain('Dashboard');

        await driver.get(`${baseUrl}/${domain}/admin/naming-convention`);
        await driver.sleep(2000);
        expect(await driver.getCurrentUrl()).to.not.contain('/naming-convention');
    });

    it('12. Admin: Negative Cases (Validation)', async function () {
        await navigateToCreateAdmin();
        expect(await chapterAdminPage.isAuthorizeButtonDisabled()).to.be.true;
    });

    it('13. Admin: Edge Case (Stability Check)', async function () {
        await navigateToCreateAdmin();
        await chapterAdminPage.selectChapter('Nashik');
        const admins = await chapterAdminPage.getExistingAdmins();
        expect(admins).to.be.an('array');
    });
});
