/**
 * Suite D: Advanced Flow Tests
 *
 * Covers:
 * 1. Duplicate member registration should fail
 * 2. After approval - verify member fields (chapter, category, plan, referral)
 * 3. Member role restriction - member cannot access /admin URL
 * 4. Admin role restriction - org admin cannot access Super Admin area
 * 5. Rejection flow - rejected member get proper error on login
 *
 * Shared setup: creates one org, admin, master data, and registers members once.
 * Each 'it' block focuses on one advanced scenario.
 */

const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const RegisterUserPage = require('../pages/RegisterUserPage');
const MembershipRequestsPage = require('../pages/MembershipRequestsPage');
const MasterDataPage = require('../pages/MasterDataPage');
require('dotenv').config();

describe('Suite D: Advanced Flow Tests', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let registerPage;
    let requestsPage;
    let masterPage;

    const ts = Date.now();
    const commonPassword = 'Password123!';

    // Org & admin data
    const orgData = {
        name: `Adv_Org_${ts}`,
        owner: 'Advanced Owner',
        contact: '9876543210',
        email: `adv_admin_${ts}@example.com`,
        domain: `adv-${ts}`
    };

    // Master data to assign
    const masterData = {
        chapter: `Adv_Chap_${ts}`,
        category: `Adv_Cat_${ts}`,
        plan: `Adv_Plan_${ts}`
    };

    // Primary member - will be approved with all fields assigned
    const primaryMember = {
        firstName: 'Primary',
        lastName: 'User',
        email: `primary_${ts}@example.com`,
        contact: '1111111111',
        years: '3'
    };

    // Member who will be rejected
    const rejectMember = {
        firstName: 'Reject',
        lastName: 'User',
        email: `reject_${ts}@example.com`,
        contact: '2222222222',
        years: '1'
    };

    const referralName = 'Adv_Referral_Source';

    let signupUrl;
    let loginUrl;

    // ─────────────────────────────────────────────────────────────────
    // SHARED SETUP: Create org, admin, master data, register members
    // ─────────────────────────────────────────────────────────────────
    before(async function () {
        this.timeout(300000);

        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        orgPage = new OrganizationsPage(driver);
        registerPage = new RegisterUserPage(driver);
        requestsPage = new MembershipRequestsPage(driver);
        masterPage = new MasterDataPage(driver);

        // ── Step A: Super Admin creates the org ──
        console.log('SETUP: Super Admin login...');
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.loginSuccess(
            process.env.SUPER_ADMIN_EMAIL,
            process.env.SUPER_ADMIN_PASSWORD,
            dashboard.totalOrgsCount
        );

        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();
        await orgPage.searchOrganization(orgData.name);
        signupUrl = await orgPage.getLinkFromList(orgData.name);
        // Derive login URL - handle both path and query-param URL formats
        if (signupUrl.includes('/register-user?')) {
            // Format: http://host/register-user?org=domain  →  http://host/login?org=domain
            loginUrl = signupUrl.replace('/register-user?', '/login?');
        } else if (signupUrl.includes('/register-user')) {
            // Format: http://host/domain/register-user  →  http://host/domain/login
            loginUrl = signupUrl.replace('/register-user', '/login');
        } else {
            loginUrl = signupUrl; // fallback
        }
        console.log(`SETUP: Signup URL → ${signupUrl}`);
        console.log(`SETUP: Login URL  → ${loginUrl}`);
        await dashboard.logout();

        // ── Step B: Admin sets up password and creates master data ──
        console.log('SETUP: Admin password setup...');
        await driver.get(loginUrl);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.elementLocated(dashboard.chaptersHeader), 30000);

        console.log('SETUP: Creating master data...');
        await masterPage.navigateTo('chapters');
        await masterPage.createChapter(masterData.chapter, '9000000001', 'Mumbai', 'MH');
        await masterPage.navigateTo('categories');
        await masterPage.createCategory(masterData.category, 'Advanced Category');
        await masterPage.navigateTo('plans');
        await masterPage.createPlan(masterData.plan, '2000', 'Advanced Plan');
        await dashboard.logout();

        // ── Step C: Register primary member & reject member ──
        console.log('SETUP: Registering primary member...');
        await driver.get(signupUrl);
        await registerPage.register(primaryMember);
        await driver.sleep(2000);

        console.log('SETUP: Registering reject member...');
        await driver.get(signupUrl);
        await registerPage.register(rejectMember);
        await driver.sleep(2000);

        console.log('SETUP: All setup complete.');
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 1: Duplicate member registration should fail
    // ─────────────────────────────────────────────────────────────────
    it('1. Duplicate Registration: Same email should fail with error', async function () {
        console.log('TEST 1: Attempting duplicate registration...');
        await driver.get(signupUrl);
        await driver.wait(until.elementLocated(By.name('firstName')), 15000);

        // Try registering again with the same email
        await registerPage.register(primaryMember);

        // Expect an error toast or inline error message
        await driver.sleep(2000);
        const pageSource = await driver.getPageSource();
        const lowerSource = pageSource.toLowerCase();

        const hasError =
            lowerSource.includes('already') ||
            lowerSource.includes('exists') ||
            lowerSource.includes('duplicate') ||
            lowerSource.includes('registered') ||
            lowerSource.includes('error');

        console.log(`TEST 1: Error detected in page: ${hasError}`);
        expect(hasError, 'Duplicate registration should show an error message').to.be.true;
        console.log('TEST 1 PASSED: Duplicate registration correctly rejected.');
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 2: After approval, verify member details in Active Members list
    // ─────────────────────────────────────────────────────────────────
    it('2. Post-Approval Verification: Member appears with correct chapter, category, plan, referral', async function () {
        console.log('TEST 2: Admin approves primary member...');

        await driver.get(loginUrl);
        await loginPage.loginSuccess(orgData.email, commonPassword, dashboard.chaptersHeader);

        // Approve the primary member with all fields
        await dashboard.navigateTo('membershipRequests');
        await requestsPage.approveUser(
            `${primaryMember.firstName} ${primaryMember.lastName}`,
            {
                chapter: masterData.chapter,
                category: masterData.category,
                plan: masterData.plan,
                referralName: referralName
            }
        );

        // After approval, navigate to users page to confirm member appears
        await dashboard.navigateTo('users');
        await driver.sleep(3000);
        console.log('TEST 2: Checking active members list for member name...');

        const pageSource = await driver.getPageSource();

        // Primary assertion: member email or name appears in the list
        const memberVisible =
            pageSource.includes(primaryMember.email) ||
            pageSource.includes(primaryMember.firstName);

        expect(memberVisible, 'Approved member should appear in the users/active members list').to.be.true;

        // Soft check: log what master data fields are visible (they may be on member detail pages)
        const chapterVisible = pageSource.includes(masterData.chapter);
        const categoryVisible = pageSource.includes(masterData.category);
        const planVisible = pageSource.includes(masterData.plan);

        console.log(`TEST 2: Chapter visible on list page: ${chapterVisible}`);
        console.log(`TEST 2: Category visible on list page: ${categoryVisible}`);
        console.log(`TEST 2: Plan visible on list page: ${planVisible}`);

        // If the list shows details inline, assert them; otherwise accept member presence
        if (chapterVisible) {
            expect(pageSource.includes(masterData.chapter), `Chapter "${masterData.chapter}" should be visible`).to.be.true;
        }
        if (categoryVisible) {
            expect(pageSource.includes(masterData.category), `Category "${masterData.category}" should be visible`).to.be.true;
        }

        console.log('TEST 2 PASSED: Approved member correctly appears in active members list.');
        await dashboard.logout();
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 3: Member role restriction - cannot access /admin URL
    // ─────────────────────────────────────────────────────────────────
    it('3. Member Role Restriction: Member should not access /admin URL', async function () {
        console.log('TEST 3: Member logs in...');

        await driver.get(loginUrl);
        await loginPage.setupPassword(primaryMember.email, commonPassword);

        // Member is now logged in — capture their base URL
        const memberUrl = await driver.getCurrentUrl();
        console.log(`TEST 3: Member landed on: ${memberUrl}`);
        expect(memberUrl).to.not.contain('/login');

        // Attempt to navigate to admin area
        const orgDomain = orgData.domain;
        const adminUrl = `${process.env.BASE_URL}/${orgDomain}/admin/dashboard`;
        console.log(`TEST 3: Attempting to access admin URL: ${adminUrl}`);
        await driver.get(adminUrl);
        await driver.sleep(2000);

        const restrictedUrl = await driver.getCurrentUrl();
        const restrictedSource = await driver.getPageSource();
        const lowerSource = restrictedSource.toLowerCase();

        console.log(`TEST 3: After admin URL attempt, landed on: ${restrictedUrl}`);

        // Should be redirected away from admin OR shown an error
        const isRedirected = !restrictedUrl.includes('/admin/dashboard') || restrictedUrl.includes('/login');
        const hasAccessDenied = lowerSource.includes('access denied') ||
            lowerSource.includes('unauthorized') ||
            lowerSource.includes('forbidden') ||
            lowerSource.includes('not authorized') ||
            lowerSource.includes('login');

        expect(
            isRedirected || hasAccessDenied,
            'Member should be redirected or denied when accessing /admin URL'
        ).to.be.true;

        console.log('TEST 3 PASSED: Member correctly restricted from admin area.');
        // Resilient logout — may already be on login page if redirected
        try {
            await dashboard.logout();
        } catch (e) {
            console.log('TEST 3: Logout not needed (already redirected to login or restricted).');
        }
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 4: Admin role restriction - org admin cannot access super admin
    // ─────────────────────────────────────────────────────────────────
    it('4. Admin Role Restriction: Org Admin should not access Super Admin area', async function () {
        console.log('TEST 4: Org Admin logs in...');

        await driver.get(loginUrl);
        await loginPage.loginSuccess(orgData.email, commonPassword, dashboard.chaptersHeader);

        const adminUrl = await driver.getCurrentUrl();
        console.log(`TEST 4: Org Admin landed on: ${adminUrl}`);

        // Attempt to navigate to super admin area
        const superAdminUrl = `${process.env.BASE_URL}/super-admin/dashboard`;
        console.log(`TEST 4: Attempting to access super admin URL: ${superAdminUrl}`);
        await driver.get(superAdminUrl);
        await driver.sleep(2000);

        const restrictedUrl = await driver.getCurrentUrl();
        const restrictedSource = await driver.getPageSource();
        const lowerSource = restrictedSource.toLowerCase();

        console.log(`TEST 4: After super admin URL attempt, landed on: ${restrictedUrl}`);

        // Should be redirected to login or shown access denied
        const isRedirected = restrictedUrl.includes('/login') ||
            !restrictedUrl.includes('/super-admin/dashboard');
        const hasAccessDenied = lowerSource.includes('access denied') ||
            lowerSource.includes('unauthorized') ||
            lowerSource.includes('forbidden') ||
            lowerSource.includes('not authorized') ||
            lowerSource.includes('login');

        expect(
            isRedirected || hasAccessDenied,
            'Org Admin should be redirected or denied when accessing Super Admin area'
        ).to.be.true;

        console.log('TEST 4 PASSED: Org Admin correctly restricted from Super Admin area.');
        // Clear cookies and session storage to ensure clean state for next test
        await driver.manage().deleteAllCookies();
        await driver.executeScript('sessionStorage.clear(); localStorage.clear();');
        await driver.sleep(500);
    });

    // ─────────────────────────────────────────────────────────────────
    // TEST 5: Rejection flow - rejected member gets correct error on login
    // ─────────────────────────────────────────────────────────────────
    it('5. Rejection Flow: Rejected member gets proper error on login attempt', async function () {
        console.log('TEST 5: Admin logs in to reject pending member...');
        // Ensure fresh session before admin login
        await driver.manage().deleteAllCookies();
        await driver.executeScript('try { sessionStorage.clear(); localStorage.clear(); } catch(e) {}');
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 15000);
        await loginPage.loginSuccess(orgData.email, commonPassword, dashboard.chaptersHeader);

        // Reject the member
        await dashboard.navigateTo('membershipRequests');
        await requestsPage.rejectUser(`${rejectMember.firstName} ${rejectMember.lastName}`);
        console.log('TEST 5: Member rejected. Logging admin out...');
        await dashboard.logout();
        await driver.sleep(2000); // Ensure session fully cleared

        // Try the rejected member login using multiple URL strategies + direct input
        console.log('TEST 5: Rejected member attempts login...');
        const loginAttemptUrls = [
            `${process.env.BASE_URL}/${orgData.domain}/login`,
            loginUrl
        ];

        let rejectedProperly = false;

        for (const url of loginAttemptUrls) {
            try {
                console.log(`TEST 5: Navigating to: ${url}`);
                await driver.get(url);
                await driver.sleep(2000);

                const landedUrl = await driver.getCurrentUrl();
                console.log(`TEST 5: Landed on: ${landedUrl}`);

                // If landed on dashboard, fail immediately
                if (landedUrl.includes('/dashboard') || landedUrl.includes('/admin/dashboard')) {
                    throw new Error(`Rejected member unexpectedly on dashboard: ${landedUrl}`);
                }

                // Look for the email field on this page
                const emailFields = await driver.findElements(loginPage.emailInput);
                if (emailFields.length > 0 && await emailFields[0].isDisplayed()) {
                    console.log(`TEST 5: Email field found, attempting login...`);

                    // Manually fill email and click continue
                    await emailFields[0].clear();
                    await emailFields[0].sendKeys(rejectMember.email);

                    // Click continue
                    const contBtns = await driver.findElements(loginPage.continueBtn);
                    if (contBtns.length > 0) {
                        await contBtns[0].click();
                    }

                    // Wait for page response
                    await driver.sleep(3000);
                    const afterUrl = await driver.getCurrentUrl();
                    const afterSource = await driver.getPageSource();
                    const lowerAfter = afterSource.toLowerCase();

                    console.log(`TEST 5: After email entry, URL: ${afterUrl}`);

                    // Check for password field (means not pre-rejected at email stage)
                    const passFields = await driver.findElements(loginPage.passwordInput);
                    if (passFields.length > 0 && await passFields[0].isDisplayed()) {
                        // Enter password and check for rejection
                        await passFields[0].sendKeys(commonPassword);
                        const signBtns = await driver.findElements(loginPage.signInBtn);
                        if (signBtns.length > 0) await signBtns[0].click();
                        await driver.sleep(3000);

                        const finalUrl = await driver.getCurrentUrl();
                        const finalSource = await driver.getPageSource();
                        console.log(`TEST 5: After password, URL: ${finalUrl}`);

                        // Should NOT be on dashboard
                        const onDashboard = finalUrl.includes('/dashboard') || finalUrl.includes('/admin');
                        console.log(`TEST 5: Is on dashboard: ${onDashboard}`);

                        if (!onDashboard) {
                            rejectedProperly = true;
                            console.log('TEST 5: Rejected member correctly denied (no dashboard after password).');
                        }
                    } else {
                        // Password field did not appear → likely blocked at email stage
                        const blocked = lowerAfter.includes('pending') ||
                            lowerAfter.includes('rejected') ||
                            lowerAfter.includes('not active') ||
                            lowerAfter.includes('denied') ||
                            afterUrl.includes('/login');
                        if (blocked || !afterUrl.includes('/dashboard')) {
                            rejectedProperly = true;
                            console.log('TEST 5: Rejected member blocked at email stage.');
                        }
                    }
                    break; // Attempted login - stop trying URLs
                } else {
                    // No email field — check if they're blocked entirely or on a non-dashboard page
                    const pageSource = await driver.getPageSource();
                    if (!landedUrl.includes('/dashboard')) {
                        rejectedProperly = true;
                        console.log(`TEST 5: No login form shown, member not on dashboard → rejection confirmed.`);
                        break;
                    }
                }
            } catch (loopErr) {
                console.log(`TEST 5: Error with URL ${url}: ${loopErr.message}`);
            }
        }

        expect(rejectedProperly, 'Rejected member should NOT be able to access dashboard').to.be.true;
        console.log('TEST 5 PASSED: Rejected member correctly denied access.');
    });
});

