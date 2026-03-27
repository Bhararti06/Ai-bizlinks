const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class AccountProvisioningPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.chapterSelect = By.xpath("//select[contains(., 'Choose Chapter')]");
        this.memberSelect = By.xpath("//select[contains(., 'Candidate')]");
        this.authorizeBtn = By.xpath("//button[contains(., 'Authorize Privilege')]");
        this.adminTable = By.xpath("//table");
        this.successToast = By.xpath("//div[contains(@class, 'Toastify__toast--success')]");
    }

    async authorizeChapterAdmin(chapterName, memberName) {
        // Select Chapter
        await this.driver.wait(until.elementLocated(this.chapterSelect), 10000);
        const chapterDropdown = await this.find(this.chapterSelect);
        await chapterDropdown.click();
        await chapterDropdown.findElement(By.xpath(`//option[text()='${chapterName}']`)).click();

        // Select Member
        await this.driver.wait(until.elementLocated(this.memberSelect), 10000);
        const memberDropdown = await this.find(this.memberSelect);

        // Wait for member list to potentially filter/load
        await this.driver.sleep(1000);

        // Find option that contains member name
        const memberOption = await memberDropdown.findElement(By.xpath(`//option[contains(text(), '${memberName}')]`));
        await memberOption.click();

        // Click Authorize
        await this.click(this.authorizeBtn);

        // Wait for success toast
        await this.driver.wait(until.elementLocated(this.successToast), 10000);
    }

    async getExistingAdmins() {
        if (!(await this.isVisible(this.adminTable, 5000))) {
            return [];
        }
        const table = await this.find(this.adminTable);
        const rows = await table.findElements(By.css('tbody tr'));
        const admins = [];
        for (const row of rows) {
            const text = await row.getText();
            admins.push(text);
        }
        return admins;
    }
}

module.exports = AccountProvisioningPage;
