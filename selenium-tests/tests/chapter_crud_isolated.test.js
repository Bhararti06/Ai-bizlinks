const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const assert = require('assert');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const MasterDataPage = require('../pages/MasterDataPage');
const OrganizationsPage = require('../pages/OrganizationsPage');
const fs = require('fs');
const path = require('path');

describe('Chapter CRUD Operations - Isolated Test Suite', function () {
    let driver;
    let loginPage;
    let dashboardPage;
    let masterDataPage;
    let organizationsPage;

    const timestamp = Date.now();
    const testOrgName = `ChapterCRUD_Org_${timestamp}`;
    const testOrgEmail = `chaptercrud_${timestamp}@example.com`;
    const testOrgDomain = `chaptercrud-${timestamp}`;
    const adminPassword = 'Password123!';
    const baseUrl = 'http://localhost:3000';

    let orgSignupUrl;
    let initialChapterCount = 0;

    // Test data for chapters
    const chapters = [
        {
            name: `Chapter A_${timestamp}`,
            phone: '9876543210',
            city: 'City A',
            state: 'State A'
        },
        {
            name: `Chapter B_${timestamp}`,
            phone: '9876543211',
            city: 'City B',
            state: 'State B'
        },
        {
            name: `Chapter C_${timestamp}`,
            phone: '9876543212',
            city: 'City C',
            state: 'State C'
        }
    ];

    before(async function () {
        console.log('\n========================================');
        console.log('CHAPTER CRUD ISOLATED TEST SUITE');
        console.log('========================================\n');

        const options = new chrome.Options();
        options.addArguments('--disable-gpu');
        options.addArguments('--no-sandbox');
        options.addArguments('--disable-dev-shm-usage');

        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        await driver.manage().window().maximize();

        loginPage = new LoginPage(driver);
        dashboardPage = new DashboardPage(driver);
        masterDataPage = new MasterDataPage(driver);
        organizationsPage = new OrganizationsPage(driver);
    });

    after(async function () {
        if (driver) {
            await driver.quit();
        }
    });

    async function takeScreenshot(name) {
        const screenshotDir = path.join(__dirname, '..', 'screenshots');
        if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir);
        const screenshot = await driver.takeScreenshot();
        const filePath = path.join(screenshotDir, `${name}_${Date.now()}.png`);
        fs.writeFileSync(filePath, screenshot, 'base64');
        console.log(`DEBUG: Screenshot saved to ${filePath}`);
        return filePath;
    }

    async function logConsoleErrors(testName) {
        try {
            const logs = await driver.manage().logs().get('browser');
            if (logs.length > 0) {
                const logDir = path.join(__dirname, '..', 'console_logs');
                if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
                const filePath = path.join(logDir, `${testName}_${Date.now()}.json`);
                fs.writeFileSync(filePath, JSON.stringify(logs, null, 2));
                console.log(`DEBUG: Console logs saved to ${filePath}`);
            }
        } catch (e) {
            console.log(`DEBUG: Failed to get console logs: ${e.message}`);
        }
    }

    describe('Setup: Organization and Admin', function () {

        it('Setup: Super Admin Login', async function () {
            try {
                const superAdminUrl = `${baseUrl}/super-admin/login`;
                console.log(`DEBUG: Navigating to Super Admin Login: ${superAdminUrl}`);
                await loginPage.goTo(superAdminUrl);
                await loginPage.login(
                    process.env.SUPER_ADMIN_EMAIL || 'superadmin@bizlinks.in',
                    process.env.SUPER_ADMIN_PASSWORD || 'Bizlinks@2024'
                );
                await driver.sleep(5000); // Wait for redirect to dashboard
                const currentUrl = await driver.getCurrentUrl();
                const title = await driver.getTitle();
                console.log(`DEBUG: Logged in. URL: ${currentUrl}, Title: ${title}`);
                if (currentUrl.includes('login')) {
                    console.log("DEBUG: Login likely failed, still on login page.");
                    await takeScreenshot('login_failure');
                }
            } catch (e) {
                await takeScreenshot('super_admin_login_error');
                throw e;
            }
        });

        it('Setup: Create Organization', async function () {
            try {
                console.log("DEBUG: Attempting to navigate to Organizations...");
                await dashboardPage.navigateTo('organizations');
                await driver.sleep(1000);

                await organizationsPage.createOrganization({
                    name: testOrgName,
                    owner: 'Chapter CRUD Test Owner',
                    contact: '9876543210',
                    email: testOrgEmail,
                    domain: testOrgDomain
                });
                await driver.sleep(2000);
                // Wait for success message or return to list
                await driver.wait(until.urlContains('organizations'), 10000);
                console.log("DEBUG: Organization creation flow completed.");
            } catch (e) {
                const currentUrl = await driver.getCurrentUrl();
                console.log(`DEBUG: Create Organization failed at URL: ${currentUrl}`);
                await takeScreenshot('create_org_failure');
                // Log page source to debug sidebar
                const source = await driver.getPageSource();
                fs.writeFileSync(path.join(__dirname, '..', 'debug_page_source.html'), source);
                console.log("DEBUG: Page source saved to debug_page_source.html");
                throw e;
            }
        });

        it('Setup: Capture Signup Link', async function () {
            try {
                orgSignupUrl = await organizationsPage.getCapturedUrl();
                console.log(`DEBUG: Captured Signup URL: ${orgSignupUrl}`);
                assert(orgSignupUrl && orgSignupUrl.includes('org='), 'Signup URL should contain org parameter');
                await organizationsPage.closeSuccessModal();
            } catch (e) {
                await takeScreenshot('capture_signup_error');
                throw e;
            }
        });

        it('Setup: Organization Admin First-Time Access', async function () {
            try {
                // Logout from Super Admin first to avoid session interference
                console.log("DEBUG: Logging out from Super Admin...");
                await dashboardPage.logout();
                await driver.sleep(2000);

                console.log(`DEBUG: Navigating to Signup URL: ${orgSignupUrl}`);
                if (!orgSignupUrl) throw new Error("Signup URL not captured!");
                await driver.get(orgSignupUrl);
                await driver.sleep(2000);

                await loginPage.setupPassword(testOrgEmail, adminPassword);
                await driver.sleep(5000); // Extended wait for redirection

                // Should land on dashboard
                await driver.wait(until.urlContains('dashboard'), 10000);
                console.log("DEBUG: Org Admin successfully set password and reached dashboard.");
                console.log('✓ Admin logged in - Ready for Chapter CRUD testing');
            } catch (e) {
                await takeScreenshot('org_admin_setup_error');
                throw e;
            }
        });
    });

    describe('Chapter CRUD Operations', function () {
        // Shared state for created chapter names to handle random suffixes
        let chapterAName, chapterBName, chapterCName;
        let chapterBUpdatedName;

        it('Step 1: Navigate to Master Data → Chapters', async function () {
            try {
                console.log('\n=== STEP 1: NAVIGATE TO CHAPTERS ===');

                await masterDataPage.navigateTo('chapters');
                await driver.sleep(2000);

                console.log('✓ Navigated to Chapters page');
            } catch (e) {
                await takeScreenshot('nav_to_chapters_error');
                throw e;
            }
        });

        it('Step 2: Capture Initial Chapter Count from Dashboard', async function () {
            try {
                console.log('\n=== STEP 2: CAPTURE INITIAL COUNT ===');

                // Navigate to dashboard using the page object's navigation
                await dashboardPage.navigateTo('dashboard');
                await driver.sleep(2000);

                // Get initial chapter count from dashboard card
                initialChapterCount = await dashboardPage.getChapterCardCount();
                console.log(`Initial chapter count on dashboard: ${initialChapterCount}`);

                // Navigate back to chapters
                await masterDataPage.navigateTo('chapters');
                await driver.sleep(2000);
            } catch (e) {
                await takeScreenshot('capture_initial_count_error');
                throw e;
            }
        });

        it('Step 3: Create Chapter A with Enhanced Debugging', async function () {
            chapterAName = chapters[0].name;
            console.log(`\n=== STEP 3: CREATE CHAPTER A ===\n\nCreating chapter 1/3: ${chapterAName}\n${'─'.repeat(60)}`);

            try {
                await createChapterWithDebug(chapters[0], 1);
                // Verification is now handled inside createChapterWithDebug using the improved POM
                console.log(`✔ Chapter "${chapterAName}" verified successfully.`);
            } catch (e) {
                await takeScreenshot('create_chapter_a_error');
                throw e;
            }
        });

        it('Step 4: Create Chapter B with Enhanced Debugging', async function () {
            chapterBName = chapters[1].name;
            console.log(`\n=== STEP 4: CREATE CHAPTER B ===\n\nCreating chapter 2/3: ${chapterBName}\n${'─'.repeat(60)}`);

            try {
                await createChapterWithDebug(chapters[1], 2);
                console.log(`✔ Chapter "${chapterBName}" verified successfully.`);
            } catch (e) {
                await takeScreenshot('create_chapter_b_error');
                throw e;
            }
        });

        it('Step 5: Create Chapter C with Enhanced Debugging', async function () {
            chapterCName = chapters[2].name;
            console.log(`\n=== STEP 5: CREATE CHAPTER C ===\n\nCreating chapter 3/3: ${chapterCName}\n${'─'.repeat(60)}`);

            try {
                await createChapterWithDebug(chapters[2], 3);
                console.log(`✔ Chapter "${chapterCName}" verified successfully.`);
            } catch (e) {
                await takeScreenshot('create_chapter_c_error');
                throw e;
            }
        });

        it('Step 6: Validate Dashboard Chapter Count Increased by 3', async function () {
            try {
                console.log('\n=== STEP 6: VALIDATE DASHBOARD COUNT ===');

                await dashboardPage.navigateTo('dashboard');
                await driver.sleep(2000);

                const currentCount = await dashboardPage.getChapterCardCount();
                const expectedCount = initialChapterCount + 3;

                console.log(`Initial count: ${initialChapterCount}`);
                console.log(`Current count: ${currentCount}`);
                console.log(`Expected count: ${expectedCount}`);

                assert.strictEqual(currentCount, expectedCount,
                    `Dashboard should show ${expectedCount} chapters, but shows ${currentCount}`);

                console.log('✓ Dashboard count increased correctly');
            } catch (e) {
                await takeScreenshot('step6_error');
                throw e;
            }
        });

        it('Step 7: View Chapter A Details', async function () {
            try {
                console.log('\n=== STEP 7: VIEW CHAPTER A ===');

                await masterDataPage.navigateTo('chapters');
                await driver.sleep(2000);

                console.log(`Viewing chapter: ${chapterAName}`);
                await masterDataPage.viewChapterDetails(chapterAName);
                await driver.sleep(2000);

                // Simple check for modal content
                const modalIsVisible = await masterDataPage.isModalOpen();
                if (!modalIsVisible) throw new Error("Details modal did not open!");

                // Note: Since MasterDataPage modal locators might vary,
                // the POM method closeModal will handle common buttons.
                await masterDataPage.closeModal();
                await driver.sleep(1000);
                console.log('✓ View operation completed');
            } catch (e) {
                await takeScreenshot('view_chapter_error');
                throw e;
            }
        });

        it('Step 8: Edit Chapter B', async function () {
            chapterBUpdatedName = `${chapterBName} Updated`;
            console.log(`\n=== STEP 8: EDIT CHAPTER B ===\nEditing chapter: ${chapterBName}\nNew name: ${chapterBUpdatedName}`);

            try {
                // Note: editChapter in POM takes (oldName, newData)
                await masterDataPage.editChapter(chapterBName, {
                    name: chapterBUpdatedName,
                    phone: '9999999999',
                    city: 'City B Updated',
                    state: 'State B Updated'
                });
                await driver.sleep(2000);

                // Verify updated name in list
                const isVisible = await masterDataPage.verifyChapterInList(chapterBUpdatedName);
                assert(isVisible, `Updated chapter "${chapterBUpdatedName}" should be visible in list`);
                console.log('✓ Chapter edited successfully');

                // Update our test data for the next steps
                chapters[1].name = chapterBUpdatedName;
            } catch (e) {
                await takeScreenshot('edit_chapter_error');
                throw e;
            }
        });

        it('Step 9: Delete Chapter C', async function () {
            console.log(`\n=== STEP 9: DELETE CHAPTER C ===\nDeleting chapter: ${chapterCName}`);

            try {
                await masterDataPage.deleteChapter(chapterCName);
                await driver.sleep(2000);

                // The POM method handles the confirmation popup.
                // Verify chapter removed from list
                const isVisible = await masterDataPage.verifyChapterInList(chapterCName);
                assert(!isVisible, `Deleted chapter "${chapterCName}" should NOT be visible in list`);
                console.log('✓ Chapter deleted successfully');
            } catch (e) {
                await takeScreenshot('delete_chapter_error');
                throw e;
            }
        });

        it('Step 10: Validate Dashboard Count Decreased by 1', async function () {
            try {
                console.log('\n=== STEP 10: VALIDATE FINAL COUNT ===');

                await dashboardPage.navigateTo('dashboard');
                await driver.sleep(2000);

                const finalCount = await dashboardPage.getChapterCardCount();
                const expectedCount = initialChapterCount + 2; // Created 3, deleted 1

                console.log(`Initial count: ${initialChapterCount}`);
                console.log(`Final count: ${finalCount}`);
                console.log(`Expected count: ${expectedCount}`);

                assert.strictEqual(finalCount, expectedCount,
                    `Dashboard should show ${expectedCount} chapters, but shows ${finalCount}`);

                console.log('✓ Dashboard count decreased correctly');
            } catch (e) {
                await takeScreenshot('final_count_error');
                throw e;
            }
        });
    });

    // Helper function to create chapter with enhanced debugging
    async function createChapterWithDebug(chapter, chapterNumber) {
        console.log(`\nCreating chapter ${chapterNumber}/3: ${chapter.name}`);
        console.log('─'.repeat(60));

        // Step 1: Click Establish Cluster button
        console.log('1️⃣  Clicking "Establish Cluster" button...');
        const establishBtn = By.xpath("//button[contains(., 'Establish Cluster')]");
        await driver.wait(until.elementLocated(establishBtn), 10000);
        await driver.findElement(establishBtn).click();
        await driver.sleep(1500);
        console.log('   ✓ Modal opened');

        // Step 2: Fill form fields
        console.log('2️⃣  Filling form fields...');
        const nameInput = By.xpath("//input[@placeholder='e.g. Pune Central']");
        const phoneInput = By.xpath("//input[@placeholder='+91 00000 00000']");
        const cityInput = By.xpath("//input[@placeholder='Pune']");
        const stateInput = By.xpath("//input[@placeholder='Maharashtra']");
        const zipInput = By.xpath("//input[@placeholder='411001']");
        const emailInput = By.xpath("//input[@placeholder='chapter@bizlinks.in']");

        await driver.wait(until.elementLocated(nameInput), 5000);

        const nameField = await driver.findElement(nameInput);
        await nameField.clear();
        await nameField.sendKeys(chapter.name);

        const phoneField = await driver.findElement(phoneInput);
        await phoneField.clear();
        await phoneField.sendKeys(chapter.phone);

        const cityField = await driver.findElement(cityInput);
        await cityField.clear();
        await cityField.sendKeys(chapter.city);

        const stateField = await driver.findElement(stateInput);
        await stateField.clear();
        await stateField.sendKeys(chapter.state);

        try {
            const zipField = await driver.findElement(zipInput);
            await zipField.clear();
            await zipField.sendKeys('411001');
            console.log('   ✓ Zip: 411001');
        } catch (e) { console.log('   ℹ️  Zip field not found'); }

        try {
            const emailField = await driver.findElement(emailInput);
            await emailField.clear();
            await emailField.sendKeys(`chapter_${chapterNumber}@example.com`);
            console.log(`   ✓ Email: chapter_${chapterNumber}@example.com`);
        } catch (e) { console.log('   ℹ️  Email field not found'); }

        console.log(`   ✓ Name: ${chapter.name}`);
        console.log(`   ✓ Phone: ${chapter.phone}`);
        console.log(`   ✓ City: ${chapter.city}`);
        console.log(`   ✓ State: ${chapter.state}`);

        // Step 3: Submit form
        console.log('3️⃣  Submitting form...');
        const submitBtn = By.xpath("//button[contains(., 'Save Changes') or contains(., 'Submit') or @type='submit']");
        await driver.findElement(submitBtn).click();
        await driver.sleep(3000);
        console.log('   ✓ Form submitted');

        // Step 4: Check for success toast
        console.log('4️⃣  Checking for success toast...');
        try {
            const toastLocator = By.xpath("//*[contains(@class, 'toast') or contains(@class, 'notification') or contains(@class, 'alert')]");
            const toasts = await driver.findElements(toastLocator);
            if (toasts.length > 0) {
                const toastText = await toasts[0].getText();
                console.log(`   ✓ Toast message: "${toastText}"`);
            } else {
                console.log('   ⚠️  No toast message found');
            }
        } catch (e) {
            console.log('   ⚠️  Could not find toast message');
        }

        // Step 5: Close modal if still open
        console.log('5️⃣  Closing modal...');
        try {
            const closeBtn = By.xpath("//button[contains(., 'Close') or contains(@aria-label, 'close') or contains(@class, 'close')]");
            const closeElements = await driver.findElements(closeBtn);
            if (closeElements.length > 0 && await closeElements[0].isDisplayed()) {
                await closeElements[0].click();
                await driver.sleep(500);
                console.log('   ✓ Modal closed');
            } else {
                console.log('   ✓ Modal auto-closed or not found');
            }
        } catch (e) {
            console.log('   ✓ Modal already closed');
        }

        // Step 6: Explicit page refresh
        console.log('6️⃣  Refreshing page to sync with backend...');
        await driver.navigate().refresh();
        await driver.sleep(3000);
        console.log('   ✓ Page refreshed');

        // Step 7: Check console errors
        console.log('7️⃣  Checking browser console for errors...');
        try {
            const logs = await driver.manage().logs().get('browser');
            const errors = logs.filter(log => log.level.name === 'SEVERE');
            if (errors.length > 0) {
                console.log('   ⚠️  Console errors found:');
                errors.forEach(error => {
                    console.log(`      - ${error.message}`);
                });
            } else {
                console.log('   ✓ No console errors');
            }
        } catch (e) {
            console.log('   ⚠️  Could not read console logs');
        }

        // Step 8: Inspect table DOM
        console.log('8️⃣  Inspecting table DOM structure...');
        try {
            const tableRows = await driver.findElements(By.xpath("//table//tr"));
            console.log(`   ℹ️  Total table rows found: ${tableRows.length}`);

            if (tableRows.length > 0) {
                // Get table headers
                const headers = await driver.findElements(By.xpath("//table//thead//th"));
                if (headers.length > 0) {
                    const headerTexts = await Promise.all(headers.map(h => h.getText()));
                    console.log(`   ℹ️  Table headers: ${headerTexts.join(' | ')}`);
                }

                // Get all table cell texts
                const cells = await driver.findElements(By.xpath("//table//tbody//td"));
                if (cells.length > 0) {
                    const cellTexts = await Promise.all(cells.map(c => c.getText().catch(() => '')));
                    const validTexts = cellTexts.filter(t => t.trim() !== '');
                    console.log(`   ℹ️  Table contains ${validTexts.length} non-empty cells`);
                    if (validTexts.length > 0) {
                        console.log(`   ℹ️  First few cell values: ${validTexts.slice(0, 10).join(', ')}`);
                    }
                }
            } else {
                console.log('   ⚠️  No table rows found!');
            }
        } catch (e) {
            console.log(`   ⚠️  Error inspecting table: ${e.message}`);
        }

        // Step 9: Verify chapter in list using POM
        console.log('9️⃣  Verifying chapter appears in list using POM...');
        await driver.sleep(2000); // Extra wait for table refresh

        const isVisible = await masterDataPage.verifyChapterInList(chapter.name);

        if (isVisible) {
            console.log(`   ✅ SUCCESS: Chapter "${chapter.name}" IS VISIBLE in table`);
        } else {
            console.log(`   ❌ FAILURE: Chapter "${chapter.name}" NOT VISIBLE in table`);

            // Take screenshot
            await takeScreenshot(`chapter_not_visible_${chapterNumber}`);

            // Get page source for debugging
            const pageSource = await driver.getPageSource();
            if (pageSource.toLowerCase().includes(chapter.name.toLowerCase())) {
                console.log(`   ⚠️  Chapter name FOUND in page source (case-insensitive) but NOT found by POM!`);
            } else {
                console.log(`   ⚠️  Chapter name NOT FOUND in page source!`);
            }

            // Fail the test
            assert.fail(`Chapter "${chapter.name}" was not found in the table after creation`);
        }

        console.log('─'.repeat(60));
        console.log(`✓ Chapter ${chapterNumber}/3 created and verified\n`);
    }
});
