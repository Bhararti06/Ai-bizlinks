const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class MasterDataPage extends BasePage {
    constructor(driver) {
        super(driver);

        // Chapters
        this.establishClusterBtn = By.xpath("//button[contains(translate(., 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'ESTABLISH CLUSTER')]");
        this.chapterNameInput = By.xpath("//input[@placeholder='e.g. Pune Central']");
        this.phoneNumberInput = By.xpath("//input[@placeholder='+91 00000 00000']");
        this.cityInput = By.xpath("//input[@placeholder='Pune']");
        this.stateInput = By.xpath("//input[@placeholder='Maharashtra']");
        this.chapterModal = By.xpath("//div[div[h2[contains(text(), 'Chapter')]]]");

        // Member Categories
        this.createClassificationBtn = By.xpath("//button[contains(translate(., 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'CREATE CLASSIFICATION')]");
        this.categoryNameInput = By.xpath("//input[@placeholder='e.g. Real Estate']");
        this.categoryDescInput = By.xpath("//textarea[@placeholder='Describe the scope of this category...']");

        // Membership Plans
        this.addGlobalPlanBtn = By.xpath("//button[contains(translate(., 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'ADD GLOBAL PLAN')]");
        this.planNameInput = By.xpath("//input[@placeholder='e.g. Gold']");
        this.planFeesInput = By.xpath("//input[@placeholder='0.00']");
        this.planDescInput = By.xpath("//textarea[@placeholder='Briefly describe what this plan covers...']");

        // Common
        this.submitBtn = By.xpath("//button[contains(translate(., 'abcdefghijklmnopqrstuvwxyz', 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'), 'SAVE CHANGES')]");
    }

    async createChapter(name, phone, city, state) {
        console.log(`DEBUG: Starting chapter creation for: ${name}`);

        // Click the Establish Cluster button
        await this.driver.wait(until.elementLocated(this.establishClusterBtn), 10000);
        await this.click(this.establishClusterBtn);
        await this.driver.sleep(1500); // Wait for modal to fully open
        console.log('DEBUG: Establish Cluster button clicked, modal should be open');

        // Wait for form fields to be visible
        await this.driver.wait(until.elementLocated(this.chapterNameInput), 5000);

        // Clear and fill form fields
        const nameField = await this.driver.findElement(this.chapterNameInput);
        await nameField.clear();
        await this.type(this.chapterNameInput, name);

        const phoneField = await this.driver.findElement(this.phoneNumberInput);
        await phoneField.clear();
        await this.type(this.phoneNumberInput, phone);

        const cityField = await this.driver.findElement(this.cityInput);
        await cityField.clear();
        await this.type(this.cityInput, city);

        const stateField = await this.driver.findElement(this.stateInput);
        await stateField.clear();
        await this.type(this.stateInput, state);

        console.log('DEBUG: All fields filled, clicking submit');
        await this.click(this.submitBtn);

        // Wait for success toast and modal close
        console.log('DEBUG: Submit clicked, waiting for modal to close...');
        try {
            // Wait for the modal to either be removed from DOM or become hidden
            await this.driver.wait(async () => {
                const modals = await this.driver.findElements(this.chapterModal);
                if (modals.length === 0) return true;
                return !(await modals[0].isDisplayed());
            }, 10000);
            console.log('DEBUG: Modal closed automatically.');
        } catch (e) {
            console.log(`DEBUG: Modal did not close automatically, attempting explicit close: ${e.message}`);
            await this.closeModal();
        }

        // Navigate back or refresh to ensure state is clean for next chapter
        await this.driver.sleep(1500);
        console.log(`DEBUG: Chapter creation completed for: ${name}`);
    }

    async createCategory(name, description) {
        console.log(`DEBUG: Creating Category: ${name}`);
        await this.click(this.createClassificationBtn);
        await this.driver.sleep(1500); // Wait for modal
        await this.type(this.categoryNameInput, name);
        await this.type(this.categoryDescInput, description);
        await this.click(this.submitBtn);
        await this.driver.sleep(2000); // Wait for submission
        console.log(`DEBUG: Category ${name} created.`);
    }

    async createPlan(name, fees, description) {
        console.log(`DEBUG: Creating Plan: ${name}`);
        await this.click(this.addGlobalPlanBtn);
        await this.driver.sleep(1500); // Wait for modal
        await this.type(this.planNameInput, name);
        await this.type(this.planFeesInput, fees);
        await this.type(this.planDescInput, description);
        await this.click(this.submitBtn);
        await this.driver.sleep(2000); // Wait for submission
        console.log(`DEBUG: Plan ${name} created.`);
    }

    // Validation Methods
    async verifyChapterInList(name) {
        console.log(`DEBUG: Verifying chapter in list: ${name}`);
        // Wait a bit for the list to refresh after creation
        await this.driver.sleep(1000);

        return await this.isChapterInTable(name);
    }

    async isChapterInTable(chapterName) {
        try {
            const rows = await this.driver.findElements(By.xpath("//table//tbody//tr"));
            console.log(`DEBUG: Checking ${rows.length} rows for chapter: ${chapterName}`);

            for (const row of rows) {
                const cells = await row.findElements(By.tagName("td"));
                if (cells.length > 0) {
                    const nameInTable = (await cells[0].getText()).trim().toUpperCase();
                    const searchName = chapterName.toUpperCase();

                    if (nameInTable === searchName || nameInTable.includes(searchName)) {
                        console.log(`DEBUG: Found chapter match in table: ${nameInTable}`);
                        return true;
                    }
                }
            }
            return false;
        } catch (e) {
            console.log(`DEBUG: Error checking chapter in table: ${e.message}`);
            return false;
        }
    }

    async verifyCategoryInList(name) {
        const locator = By.xpath(`//table//td[contains(text(), '${name}')]`);
        return await this.isVisible(locator, 5000);
    }

    async verifyPlanInList(name) {
        const locator = By.xpath(`//table//td[contains(text(), '${name}')]`);
        return await this.isVisible(locator, 5000);
    }

    async getChapterCount() {
        const rows = await this.driver.findElements(By.xpath("//table//tbody//tr"));
        return rows.length;
    }

    async getCategoryCount() {
        const rows = await this.driver.findElements(By.xpath("//table//tbody//tr"));
        return rows.length;
    }

    async getPlanCount() {
        const rows = await this.driver.findElements(By.xpath("//table//tbody//tr"));
        return rows.length;
    }

    // ========== VIEW OPERATIONS ==========
    async viewChapterDetails(chapterName) {
        console.log(`DEBUG: Viewing chapter details for: ${chapterName}`);
        const upperName = chapterName.toUpperCase();
        // Find the row containing the chapter name and click the first action button (View - EyeIcon)
        const viewBtn = By.xpath(`//table//tr[.//td[contains(text(), '${upperName}')]]//button[1]`);
        await this.click(viewBtn);
        await this.driver.sleep(1500); // Wait for modal to open
        console.log(`DEBUG: View modal opened for chapter: ${upperName}`);
        return true;
    }

    async viewCategoryDetails(categoryName) {
        console.log(`DEBUG: Viewing category details for: ${categoryName}`);
        const viewBtn = By.xpath(`//table//tr[.//td[contains(text(), '${categoryName}')]]//button[1]`);
        await this.click(viewBtn);
        await this.driver.sleep(1500);
        console.log(`DEBUG: View modal opened for category: ${categoryName}`);
        return true;
    }

    async closeModal() {
        // Close modal by clicking the X button or Close button
        try {
            const closeBtn = By.xpath("//button[contains(., 'Close') or contains(@aria-label, 'close')]");
            await this.click(closeBtn);
            await this.driver.sleep(500);
            console.log('DEBUG: Modal closed');
        } catch (e) {
            // Try clicking outside the modal or pressing ESC
            const body = await this.driver.findElement(By.css('body'));
            await body.sendKeys('\uE00C'); // ESC key
            await this.driver.sleep(500);
            console.log('DEBUG: Modal closed via ESC');
        }
    }

    // ========== EDIT OPERATIONS ==========
    async editChapter(oldName, newData) {
        console.log(`DEBUG: Editing chapter: ${oldName}`);
        const upperOldName = oldName.toUpperCase();
        // Find the row and click edit icon (PencilSquareIcon - second button)
        const editBtn = By.xpath(`//table//tr[.//td[contains(text(), '${upperOldName}')]]//button[2]`);
        await this.click(editBtn);
        await this.driver.sleep(1500); // Wait for edit modal

        // Clear and update fields
        if (newData.name) {
            const nameInput = await this.driver.findElement(this.chapterNameInput);
            await nameInput.clear();
            await this.type(this.chapterNameInput, newData.name);
        }
        if (newData.phone) {
            const phoneInput = await this.driver.findElement(this.phoneNumberInput);
            await phoneInput.clear();
            await this.type(this.phoneNumberInput, newData.phone);
        }
        if (newData.city) {
            const cityInput = await this.driver.findElement(this.cityInput);
            await cityInput.clear();
            await this.type(this.cityInput, newData.city);
        }
        if (newData.state) {
            const stateInput = await this.driver.findElement(this.stateInput);
            await stateInput.clear();
            await this.type(this.stateInput, newData.state);
        }

        // Click save
        await this.click(this.submitBtn);
        await this.driver.sleep(2000); // Wait for save and toast
        console.log(`DEBUG: Chapter edited successfully`);
        return true;
    }

    async editCategory(oldName, newData) {
        console.log(`DEBUG: Editing category: ${oldName}`);
        const editBtn = By.xpath(`//table//tr[.//td[contains(text(), '${oldName}')]]//button[2]`);
        await this.click(editBtn);
        await this.driver.sleep(1500);

        if (newData.name) {
            const nameInput = await this.driver.findElement(this.categoryNameInput);
            await nameInput.clear();
            await this.type(this.categoryNameInput, newData.name);
        }
        if (newData.description) {
            const descInput = await this.driver.findElement(this.categoryDescInput);
            await descInput.clear();
            await this.type(this.categoryDescInput, newData.description);
        }

        await this.click(this.submitBtn);
        await this.driver.sleep(2000);
        console.log(`DEBUG: Category edited successfully`);
        return true;
    }

    // ========== DELETE OPERATIONS ==========
    async deleteChapter(chapterName) {
        console.log(`DEBUG: Deleting chapter: ${chapterName}`);
        const upperName = chapterName.toUpperCase();
        // Find the row and click delete icon (TrashIcon - third button)
        const deleteBtn = By.xpath(`//table//tr[.//td[contains(text(), '${upperName}')]]//button[3]`);
        await this.click(deleteBtn);
        await this.driver.sleep(1000); // Wait for browser alert
        console.log(`DEBUG: Delete confirmation alert appeared`);

        // Confirm deletion via browser alert
        await this.confirmDeleteAlert();
        return true;
    }

    async deleteCategory(categoryName) {
        console.log(`DEBUG: Deleting category: ${categoryName}`);
        const deleteBtn = By.xpath(`//table//tr[.//td[contains(text(), '${categoryName}')]]//button[3]`);
        await this.click(deleteBtn);
        await this.driver.sleep(1000);
        console.log(`DEBUG: Delete confirmation alert appeared`);

        await this.confirmDeleteAlert();
        return true;
    }

    async confirmDeleteAlert() {
        // Handle browser alert (window.confirm)
        try {
            const alert = await this.driver.switchTo().alert();
            const alertText = await alert.getText();
            console.log(`DEBUG: Alert text: ${alertText}`);
            await alert.accept(); // Click OK/Yes
            await this.driver.sleep(2000); // Wait for deletion and toast
            console.log('DEBUG: Deletion confirmed via alert');
        } catch (e) {
            console.log(`DEBUG: No alert found or already dismissed: ${e.message}`);
        }
    }

    async confirmDelete() {
        // Deprecated: Use confirmDeleteAlert() instead
        // This method is kept for backward compatibility
        await this.confirmDeleteAlert();
    }
}

module.exports = MasterDataPage;
