const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class MembershipRequestsPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.processBtn = (userName) => By.xpath(`(//tr[contains(., '${userName}')]//button[@title='Process'] | //div[contains(@class, 'group') and contains(., '${userName}')]//button[contains(., 'Edit & Process')])`);
        this.modalDialog = By.xpath("//div[contains(@class, 'modal-content')]");
        this.chapterSelect = By.xpath("//select[contains(@class, 'form-select') or contains(., 'Select Chapter')]");
        this.categorySelect = By.xpath("//select[contains(@class, 'form-select') or contains(., 'Select Category')]");
        this.planSelect = By.xpath("//select[contains(option, 'Plan')]");
        this.referralSelect = By.xpath("//select[contains(option, 'Referral')]");
        this.referralOtherInput = By.xpath("//input[@placeholder='Enter name']");
        this.approveBtn = By.xpath("//button[contains(., 'Approve')]");
        this.rejectBtn = By.xpath("//button[contains(., 'Reject')]");
    }

    async approveUser(userName, { chapter, category, plan, referralName }) {
        console.log(`DEBUG: Attempting to approve user: ${userName}...`);

        // Wait for list item and click Process
        const btn = await this.driver.wait(until.elementLocated(this.processBtn(userName)), 15000);
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", btn);
        await this.driver.sleep(1000);
        await btn.click();

        console.log("DEBUG: Waiting for approval modal...");
        await this.driver.wait(until.elementLocated(this.chapterSelect), 15000);
        const chapterElem = await this.driver.findElement(this.chapterSelect);
        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", chapterElem);

        // Select specific chapter
        console.log(`DEBUG: Selecting chapter: ${chapter}`);
        await chapterElem.click();
        const chapOption = await this.driver.wait(until.elementLocated(By.xpath(`//option[text()='${chapter}']`)), 5000);
        await chapOption.click();

        // Select specific category
        console.log(`DEBUG: Selecting category: ${category}`);
        const categoryElem = await this.driver.findElement(this.categorySelect);
        await categoryElem.click();
        const catOption = await this.driver.wait(until.elementLocated(By.xpath(`//option[text()='${category}']`)), 5000);
        await catOption.click();

        // Select specific plan
        console.log(`DEBUG: Selecting plan: ${plan}`);
        const planElem = await this.driver.findElement(this.planSelect);
        await planElem.click();
        const planOption = await this.driver.wait(until.elementLocated(By.xpath(`//option[text()='${plan}']`)), 5000);
        await planOption.click();

        // Handle referral
        if (referralName) {
            console.log(`DEBUG: Setting referral: ${referralName}`);
            const refElem = await this.driver.findElement(this.referralSelect);
            await refElem.click();
            const refOther = await this.driver.wait(until.elementLocated(By.xpath("//option[@value='other']")), 5000);
            await refOther.click();
            const otherInput = await this.driver.wait(until.elementLocated(this.referralOtherInput), 5000);
            await otherInput.sendKeys(referralName);
        }

        // Finalize
        console.log("DEBUG: Clicking Approve...");
        const approve = await this.driver.findElement(this.approveBtn);
        await approve.click();

        // Wait for modal to close
        await this.driver.wait(until.stalenessOf(approve), 10000).catch(() => {
            console.log("DEBUG: Approve button still present, likely waiting for success toast.");
        });
        await this.driver.sleep(2000);
    }

    async rejectUser(userName) {
        // Wait for list to load
        await this.driver.wait(until.elementLocated(this.processBtn(userName)), 10000);
        await this.click(this.processBtn(userName));

        // Wait for modal
        await this.driver.wait(until.elementLocated(this.rejectBtn), 10000);

        // Click Reject
        await this.click(this.rejectBtn);

        // Handle browser alert confirmation
        await this.driver.wait(until.alertIsPresent(), 5000);
        const alert = await this.driver.switchTo().alert();
        await alert.accept();

        // Wait for success toast or modal close
        await this.driver.sleep(2000);
    }
}

module.exports = MembershipRequestsPage;
