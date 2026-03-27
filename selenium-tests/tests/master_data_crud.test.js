const { By, until } = require('selenium-webdriver');
const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const MasterDataPage = require('../pages/MasterDataPage');
const globalState = require('../utils/GlobalState');
require('dotenv').config();

describe('Master Data CRUD Operations - Full Lifecycle', function () {
    let driver;
    let loginPage;
    let dashboard;
    let orgPage;
    let masterPage;

    // Test Data
    const ts = Date.now();
    const orgData = {
        name: `MasterCRUD_Org_${ts}`,
        owner: 'Master CRUD Test',
        contact: '9998887776',
        email: `mastercrud_${ts}@example.com`,
        domain: `mastercrud-${ts}`
    };

    const chapterData = {
        original: [
            { name: `Pune Chapter_${ts}`, phone: '9876543210', city: 'Pune', state: 'Maharashtra' },
            { name: `Mumbai Chapter_${ts}`, phone: '9876543211', city: 'Mumbai', state: 'Maharashtra' },
            { name: `Bangalore Chapter_${ts}`, phone: '9876543212', city: 'Bangalore', state: 'Karnataka' }
        ],
        edited: { name: `Pune Chapter - Updated_${ts}`, phone: '9999999999', city: 'Pune Central', state: 'Maharashtra' }
    };

    const categoryData = {
        original: [
            { name: `Gold Category_${ts}`, description: 'Premium membership tier with exclusive benefits' },
            { name: `Silver Category_${ts}`, description: 'Standard membership tier with core benefits' },
            { name: `Platinum Category_${ts}`, description: 'Elite membership tier with all benefits' }
        ],
        edited: { name: `Gold Category - Premium_${ts}`, description: 'Updated premium membership tier' }
    };

    const commonPassword = 'Password123!';

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        orgPage = new OrganizationsPage(driver);
        masterPage = new MasterDataPage(driver);
    });

    after(async function () {
        if (driver) await driver.quit();
    });

    // ========== SETUP ==========
    it('Setup: Super Admin Login', async function () {
        await loginPage.goTo(`${process.env.BASE_URL}/super-admin/login`);
        await loginPage.login(process.env.SUPER_ADMIN_EMAIL, process.env.SUPER_ADMIN_PASSWORD);
        await driver.wait(until.urlContains('/super-admin/dashboard'), 10000);
    });

    it('Setup: Create Organization', async function () {
        await orgPage.navigateTo('organizations');
        await orgPage.createOrganization(orgData);
        await orgPage.closeSuccessModal();
    });

    it('Setup: Capture Signup Link', async function () {
        await orgPage.navigateTo('organizations');
        await orgPage.searchOrganization(orgData.name);
        const captiveLink = await orgPage.getLinkFromList(orgData.name);
        expect(captiveLink).to.contain('org=');
        globalState.setOrgUrl(captiveLink);
        await dashboard.logout();
    });

    it('Setup: Organization Admin First-Time Access', async function () {
        const orgUrl = globalState.getOrgUrl();
        const loginUrl = orgUrl.replace('/register-user', '/login');
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(loginPage.emailInput), 10000);
        await loginPage.setupPassword(orgData.email, commonPassword);
        await driver.wait(until.urlContains('/admin/dashboard'), 10000);
        console.log('✓ Admin logged in - Ready for CRUD testing');
    });

    // ========== CREATE OPERATIONS ==========
    it('CRUD: Create 3 Chapters', async function () {
        console.log('\n=== CREATE: CHAPTERS ===');
        await masterPage.navigateTo('chapters');
        await driver.sleep(2000);

        for (let i = 0; i < chapterData.original.length; i++) {
            const chapter = chapterData.original[i];
            console.log(`\nCreating chapter ${i + 1}/3: ${chapter.name}`);

            await masterPage.createChapter(chapter.name, chapter.phone, chapter.city, chapter.state);

            const inList = await masterPage.verifyChapterInList(chapter.name);
            expect(inList, `Chapter "${chapter.name}" should appear in list`).to.be.true;
            console.log(`  ✓ Chapter created and verified`);
        }

        // Validate dashboard
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);
        const chapterCount = await dashboard.getChapterCardCount();
        console.log(`\n✓ Dashboard shows ${chapterCount} chapters`);
        expect(chapterCount).to.equal(3, 'Dashboard should show 3 chapters');
    });

    it('CRUD: Create 3 Categories', async function () {
        console.log('\n=== CREATE: CATEGORIES ===');
        await masterPage.navigateTo('categories');
        await driver.sleep(2000);

        for (let i = 0; i < categoryData.original.length; i++) {
            const category = categoryData.original[i];
            console.log(`\nCreating category ${i + 1}/3: ${category.name}`);

            await masterPage.createCategory(category.name, category.description);

            const inList = await masterPage.verifyCategoryInList(category.name);
            expect(inList, `Category "${category.name}" should appear in list`).to.be.true;
            console.log(`  ✓ Category created and verified`);
        }

        // Validate dashboard
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);
        const categoryCount = await dashboard.getCategoryCardCount();
        console.log(`\n✓ Dashboard shows ${categoryCount} categories`);
        expect(categoryCount).to.equal(3, 'Dashboard should show 3 categories');
    });

    // ========== VIEW OPERATIONS ==========
    it('CRUD: View Chapter Details', async function () {
        console.log('\n=== VIEW: CHAPTER DETAILS ===');
        await masterPage.navigateTo('chapters');
        await driver.sleep(2000);

        const chapterToView = chapterData.original[0].name;
        console.log(`Viewing chapter: ${chapterToView}`);

        const viewed = await masterPage.viewChapterDetails(chapterToView);
        expect(viewed, 'Should open chapter details modal').to.be.true;
        console.log('✓ Chapter details modal opened');

        // Close modal
        await masterPage.closeModal();
        console.log('✓ Modal closed');
    });

    it('CRUD: View Category Details', async function () {
        console.log('\n=== VIEW: CATEGORY DETAILS ===');
        await masterPage.navigateTo('categories');
        await driver.sleep(2000);

        const categoryToView = categoryData.original[0].name;
        console.log(`Viewing category: ${categoryToView}`);

        const viewed = await masterPage.viewCategoryDetails(categoryToView);
        expect(viewed, 'Should open category details modal').to.be.true;
        console.log('✓ Category details modal opened');

        await masterPage.closeModal();
        console.log('✓ Modal closed');
    });

    // ========== EDIT OPERATIONS ==========
    it('CRUD: Edit Chapter and Verify Dashboard', async function () {
        console.log('\n=== EDIT: CHAPTER ===');
        await masterPage.navigateTo('chapters');
        await driver.sleep(2000);

        const oldName = chapterData.original[0].name;
        console.log(`Editing chapter: ${oldName}`);
        console.log(`New name: ${chapterData.edited.name}`);

        await masterPage.editChapter(oldName, chapterData.edited);
        console.log('✓ Chapter edit submitted');

        // Verify in list
        const inList = await masterPage.verifyChapterInList(chapterData.edited.name);
        expect(inList, 'Edited chapter should appear in list with new name').to.be.true;
        console.log('✓ Edited chapter verified in list');

        // Verify dashboard reflects change
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);

        // Check if updated name appears in dashboard
        const dashboardHtml = await driver.getPageSource();
        const hasUpdatedName = dashboardHtml.includes(chapterData.edited.name);
        expect(hasUpdatedName, 'Dashboard should show updated chapter name').to.be.true;
        console.log('✓ Dashboard reflects updated chapter name');
    });

    it('CRUD: Edit Category and Verify Dashboard', async function () {
        console.log('\n=== EDIT: CATEGORY ===');
        await masterPage.navigateTo('categories');
        await driver.sleep(2000);

        const oldName = categoryData.original[0].name;
        console.log(`Editing category: ${oldName}`);
        console.log(`New name: ${categoryData.edited.name}`);

        await masterPage.editCategory(oldName, categoryData.edited);
        console.log('✓ Category edit submitted');

        // Verify in list
        const inList = await masterPage.verifyCategoryInList(categoryData.edited.name);
        expect(inList, 'Edited category should appear in list with new name').to.be.true;
        console.log('✓ Edited category verified in list');

        // Verify dashboard reflects change
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);

        const dashboardHtml = await driver.getPageSource();
        const hasUpdatedName = dashboardHtml.includes(categoryData.edited.name);
        expect(hasUpdatedName, 'Dashboard should show updated category name').to.be.true;
        console.log('✓ Dashboard reflects updated category name');
    });

    // ========== DELETE OPERATIONS ==========
    it('CRUD: Delete Chapter and Verify Dashboard Count', async function () {
        console.log('\n=== DELETE: CHAPTER ===');
        await masterPage.navigateTo('chapters');
        await driver.sleep(2000);

        const chapterToDelete = chapterData.original[2].name; // Bangalore Chapter
        console.log(`Deleting chapter: ${chapterToDelete}`);

        await masterPage.deleteChapter(chapterToDelete);
        console.log('✓ Chapter deletion confirmed');

        // Verify removed from list
        await driver.sleep(2000);
        const stillInList = await masterPage.verifyChapterInList(chapterToDelete);
        expect(stillInList, 'Deleted chapter should not appear in list').to.be.false;
        console.log('✓ Chapter removed from list');

        // Verify dashboard count decreased
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);

        const chapterCount = await dashboard.getChapterCardCount();
        console.log(`Dashboard chapter count: ${chapterCount}`);
        expect(chapterCount).to.equal(2, 'Dashboard should show 2 chapters after deletion');
        console.log('✓ Dashboard count decreased: 3 → 2');
    });

    it('CRUD: Delete Category and Verify Dashboard Count', async function () {
        console.log('\n=== DELETE: CATEGORY ===');
        await masterPage.navigateTo('categories');
        await driver.sleep(2000);

        const categoryToDelete = categoryData.original[2].name; // Platinum Category
        console.log(`Deleting category: ${categoryToDelete}`);

        await masterPage.deleteCategory(categoryToDelete);
        console.log('✓ Category deletion confirmed');

        // Verify removed from list
        await driver.sleep(2000);
        const stillInList = await masterPage.verifyCategoryInList(categoryToDelete);
        expect(stillInList, 'Deleted category should not appear in list').to.be.false;
        console.log('✓ Category removed from list');

        // Verify dashboard count decreased
        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);

        const categoryCount = await dashboard.getCategoryCardCount();
        console.log(`Dashboard category count: ${categoryCount}`);
        expect(categoryCount).to.equal(2, 'Dashboard should show 2 categories after deletion');
        console.log('✓ Dashboard count decreased: 3 → 2');
    });

    // ========== FINAL VALIDATION ==========
    it('CRUD: Final State Validation', async function () {
        console.log('\n=== FINAL VALIDATION ===');

        await dashboard.navigateTo('dashboard');
        await driver.sleep(3000);

        const finalChapterCount = await dashboard.getChapterCardCount();
        const finalCategoryCount = await dashboard.getCategoryCardCount();

        console.log(`\nFinal Dashboard State:`);
        console.log(`  Chapters: ${finalChapterCount} (expected: 2)`);
        console.log(`  Categories: ${finalCategoryCount} (expected: 2)`);

        expect(finalChapterCount).to.equal(2, 'Final chapter count should be 2');
        expect(finalCategoryCount).to.equal(2, 'Final category count should be 2');

        // Refresh and verify persistence
        console.log('\nVerifying persistence after refresh...');
        await driver.navigate().refresh();
        await driver.sleep(3000);

        const persistedChapterCount = await dashboard.getChapterCardCount();
        const persistedCategoryCount = await dashboard.getCategoryCardCount();

        expect(persistedChapterCount).to.equal(2, 'Chapter count should persist');
        expect(persistedCategoryCount).to.equal(2, 'Category count should persist');
        console.log('✓ All data persists after refresh');

        console.log('\n✅ CRUD OPERATIONS TEST COMPLETE!');
        console.log('  ✓ Create: 3 chapters, 3 categories');
        console.log('  ✓ View: Chapter and category details');
        console.log('  ✓ Edit: 1 chapter, 1 category (names updated)');
        console.log('  ✓ Delete: 1 chapter, 1 category (counts decreased)');
        console.log('  ✓ Dashboard: All changes reflected correctly');
        console.log('  ✓ Persistence: All data persists after refresh');
    });
});
