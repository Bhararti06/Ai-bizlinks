const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class OrganizationsPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.createOrgBtn = By.xpath("//button[contains(text(), 'Create Organization')]");
        this.orgNameInput = By.name('organizationName');
        this.ownerNameInput = By.name('adminName');
        this.contactInput = By.name('contact');
        this.emailInput = By.name('adminEmail');
        this.domainInput = By.name('subDomain');
        this.submitBtn = By.xpath("//button[normalize-space(.)='Create' or normalize-space(.)='CREATE']");

        // Success Modal Selectors
        this.successModal = By.xpath("//h3[contains(., 'Registered Successfully') or contains(., 'REGISTERED SUCCESSFULLY') or contains(., 'Created Successfully') or contains(., 'created successfully')]");
        this.dynamicUrlText = By.xpath("//span[contains(., 'Organization URL')]/following-sibling::span");
        this.doneBtn = By.xpath("//button[normalize-space(.)='Done' or normalize-space(.)='DONE']");

        // List View Selectors
        this.searchTermInput = By.xpath("//input[@placeholder='Search...']");
        this.orgRow = (name) => By.xpath(`//tr[td//div[text()='${name}']]`);
        this.orgLinkInRow = (name) => By.xpath(`//tr[td//div[text()='${name}']]//td[4]//a`);
    }

    async createOrganization(orgData) {
        await this.click(this.createOrgBtn);
        await this.type(this.orgNameInput, orgData.name);
        await this.type(this.ownerNameInput, orgData.owner);
        await this.type(this.contactInput, orgData.contact);
        await this.type(this.emailInput, orgData.email);
        await this.type(this.domainInput, orgData.domain);
        await this.click(this.submitBtn);
    }

    async searchOrganization(name) {
        await this.type(this.searchTermInput, name);
    }

    async getLinkFromList(orgName) {
        const linkElem = await this.find(this.orgLinkInRow(orgName));
        return await linkElem.getAttribute('href');
    }

    async getCapturedUrl() {
        await this.driver.wait(until.elementLocated(this.successModal), 10000);
        const url = await this.getText(this.dynamicUrlText);
        return url;
    }

    async closeSuccessModal() {
        await this.click(this.doneBtn);
    }
}

module.exports = OrganizationsPage;
