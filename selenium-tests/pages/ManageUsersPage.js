const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class ManageUsersPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.addUserBtn = By.xpath("//button[contains(text(), 'Add User')]");
        this.userTableRows = By.xpath("//table/tbody/tr");
        this.statusSelect = By.id('status');
        this.saveBtn = By.xpath("//button[contains(text(), 'Save')]");
    }

    async approveUser(userName) {
        const row = By.xpath(`//tr[contains(., '${userName}')]`);
        const editBtn = By.xpath(`//tr[contains(., '${userName}')]//button[contains(@title, 'Edit')]`);
        await this.click(editBtn);
        await this.type(this.statusSelect, 'approved');
        await this.click(this.saveBtn);
    }

    async isUserInList(userName) {
        return await this.isVisible(By.xpath(`//tr[contains(., '${userName}')]`));
    }
}

module.exports = ManageUsersPage;
