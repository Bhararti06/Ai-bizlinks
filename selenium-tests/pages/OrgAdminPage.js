const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class OrgAdminPage extends BasePage {
    constructor(driver) {
        super(driver);
        // Form Locators
        this.nameInput = By.id('name');
        this.emailInput = By.id('email');
        this.mobileInput = By.id('mobile');
        this.authorizeBtn = By.xpath("//button[contains(., 'Authorize Access')]");
        this.resetBtn = By.xpath("//button[contains(., 'Reset Form')]");

        // List Locators
        this.adminRows = By.css('tbody tr');
        this.adminTable = By.xpath("//table");

        // Modal Locators (Specific to the fixed modal container)
        this.editModal = By.xpath("//div[contains(@class, 'fixed')]//h3[contains(text(), 'Edit Administrator')]");
        const modalPrefix = "//div[contains(@class, 'fixed')]";
        this.editNameInput = By.xpath(`${modalPrefix}//input[@name='name']`);
        this.editEmailInput = By.xpath(`${modalPrefix}//input[@name='email']`);
        this.editMobileInput = By.xpath(`${modalPrefix}//input[@name='mobile']`);
        this.saveChangesBtn = By.xpath(`${modalPrefix}//button[contains(., 'Save Changes')]`);
        this.cancelEditBtn = By.xpath(`${modalPrefix}//button[contains(., 'Cancel')]`);

        // react-toastify v11 uses role="alert" on the toast element
        // and places text directly inside .Toastify__toast-body (no wrapper div)
        this.successToast = By.css(".Toastify__toast--success");
        this.errorToast = By.css(".Toastify__toast--error");
        this.anyToast = By.css(".Toastify__toast");
    }

    async authorizeAdmin(name, email, mobile) {
        if (name) await this.type(this.nameInput, name);
        if (email) await this.type(this.emailInput, email);
        if (mobile) await this.type(this.mobileInput, mobile);
        await this.click(this.authorizeBtn);
    }

    async getAdminList() {
        if (!(await this.isVisible(this.adminTable, 5000))) return [];
        const rows = await this.driver.findElements(this.adminRows);
        const admins = [];
        for (const row of rows) {
            const text = await row.getText();
            const email = (await row.findElement(By.xpath(".//span[contains(text(), '@')]"))).getText();
            admins.push({ text, email: await email });
        }
        return admins;
    }

    async findAdminRowByEmail(email) {
        const rows = await this.driver.findElements(this.adminRows);
        for (const row of rows) {
            // Be more specific: find the span that exactly contains the email
            const emailSpans = await row.findElements(By.xpath(`.//span[contains(text(), '${email}')]`));
            if (emailSpans.length > 0) return row;
        }
        return null;
    }

    async clickEdit(email) {
        console.log(`DEBUG: clickEdit for ${email}`);
        const row = await this.findAdminRowByEmail(email);
        if (!row) throw new Error(`Admin with email ${email} not found`);
        const editBtn = await row.findElement(By.xpath(".//button[contains(., 'Edit')]"));
        await this.driver.executeScript("arguments[0].scrollIntoView(true);", editBtn);
        await editBtn.click();
        await this.driver.wait(until.elementLocated(this.editModal), 5000);
    }

    async clickRevoke(email) {
        console.log(`DEBUG: clickRevoke for ${email}`);
        const row = await this.findAdminRowByEmail(email);
        if (!row) throw new Error(`Admin with email ${email} not found`);
        const revokeBtn = await row.findElement(By.xpath(".//button[contains(., 'Revoke')]"));
        await this.driver.executeScript("arguments[0].scrollIntoView(true);", revokeBtn);
        await revokeBtn.click();
    }

    async updateAdmin(name, email, mobile) {
        if (name) await this.type(this.editNameInput, name);
        if (email) await this.type(this.editEmailInput, email);
        if (mobile) await this.type(this.editMobileInput, mobile);
        await this.click(this.saveChangesBtn);
    }
}

module.exports = OrgAdminPage;
