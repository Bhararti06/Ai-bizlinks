const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class ReferralsPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.sendReferralBtn = By.xpath("//button[contains(text(), 'Send Referral')]");
        this.memberDropdown = By.id('referredToMember');
        this.clientNameInput = By.id('clientFullName');
        this.submitBtn = By.xpath("//button[@type='submit' and contains(text(), 'Send')]");
        this.referralRows = By.xpath("//table/tbody/tr");
    }

    async sendReferral(memberName, clientName) {
        await this.click(this.sendReferralBtn);
        await this.type(this.memberDropdown, memberName);
        await this.type(this.clientNameInput, clientName);
        await this.click(this.submitBtn);
    }

    async getMemberCountInDropdown() {
        await this.click(this.sendReferralBtn);
        const options = await this.driver.findElements(By.css('#referredToMember option'));
        return options.length;
    }
}

module.exports = ReferralsPage;
