const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class ChapterAdminPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.chapterSelect = By.xpath("//label[contains(., 'Select Operational Chapter')]/following-sibling::select");
        this.memberSelect = By.xpath("//label[contains(., 'Assign Member Identity')]/following-sibling::select");
        this.authorizeBtn = By.xpath("//button[contains(., 'Authorize Privilege')]");
        this.resetBtn = By.xpath("//button[contains(., 'Reset')]");
        this.adminsTable = By.xpath("//div[contains(@class, 'premium-card')]//table");
        this.activeAdminsSection = By.xpath("//h2[contains(., 'Active Chapter Admins')]");
    }

    async selectChapter(chapterName) {
        console.log(`DEBUG: Selecting chapter: ${chapterName}`);
        await this.selectByVisibleText(this.chapterSelect, chapterName);
        // Wait for potential filtering logic to settle
        await this.driver.sleep(1500);
    }

    async selectCandidate(candidateText) {
        console.log(`DEBUG: Selecting candidate: ${candidateText}`);
        await this.selectByVisibleText(this.memberSelect, candidateText);
    }

    async selectByVisibleText(locator, text) {
        console.log(`DEBUG: [SELECT] Waiting for select element ${locator}...`);
        const selectElement = await this.driver.wait(until.elementLocated(locator), 15000);
        await this.driver.wait(until.elementIsVisible(selectElement), 5000);

        console.log(`DEBUG: [SELECT] Clicking select element...`);
        await selectElement.click();

        // Use normalize-space() to be resilient to rendering quirks
        const optionXpath = `${locator.value}/option[contains(normalize-space(.), "${text}")]`;
        console.log(`DEBUG: [SELECT] Waiting for option: ${optionXpath}`);
        try {
            const option = await this.driver.wait(until.elementLocated(By.xpath(optionXpath)), 15000);
            await this.driver.wait(until.elementIsVisible(option), 5000);
            await option.click();
            console.log(`DEBUG: [SELECT] Option "${text}" clicked.`);
        } catch (e) {
            console.error(`DEBUG: [SELECT] Failed to find or click option "${text}": ${e.message}`);
            // Trace: Log all available options
            const allOptions = await selectElement.findElements(By.tagName('option'));
            const optionTexts = await Promise.all(allOptions.map(o => o.getText()));
            console.log(`DEBUG: [SELECT] Available options: ${JSON.stringify(optionTexts)}`);

            // Fallback: try to find by value if text is actually a value
            try {
                const altOption = await selectElement.findElement(By.xpath(`./option[@value="${text}"]`));
                await altOption.click();
                console.log(`DEBUG: [SELECT] Clicked option by value as fallback.`);
            } catch (e2) {
                throw new Error(`Could not select option "${text}" in ${locator.value}. Available: ${optionTexts.join(', ')}`);
            }
        }
    }

    async authorizePrivilege() {
        console.log(`DEBUG: Clicking Authorize Privilege`);
        const btn = await this.find(this.authorizeBtn);
        await this.driver.wait(until.elementIsEnabled(btn), 10000);
        await this.click(this.authorizeBtn);
    }

    async resetForm() {
        console.log(`DEBUG: Clicking Reset`);
        await this.click(this.resetBtn);
    }

    async revokeAdmin(email) {
        console.log(`DEBUG: Revoking admin: ${email}`);
        // The email may be in a nested span/div inside the td — use .//* to search all descendants
        const revokeBtn = By.xpath(`//tr[.//*[contains(normalize-space(.), "${email}")]]//button[contains(@title, "Remove") or contains(@title, "Revoke") or contains(translate(., 'REVOKE', 'revoke'), "revoke") or .//*[local-name()='svg']]`);
        const btn = await this.driver.wait(until.elementLocated(revokeBtn), 10000);
        // Force the button to be fully visible and in position so Selenium can click it natively
        await this.driver.executeScript("arguments[0].scrollIntoView({block:'center'}); arguments[0].style.opacity = '1'; arguments[0].style.transform = 'none'; arguments[0].style.visibility = 'visible';", btn);
        await this.driver.sleep(500);
        // Use standard Selenium click to ensure React's synthetic event handler fires
        await btn.click();
        // Page uses window.confirm, so test MUST handle alert
    }


    async getExistingAdmins() {
        const rows = await this.driver.findElements(By.xpath("//div[contains(@class, 'premium-card')]//tbody/tr"));
        const admins = [];
        for (const row of rows) {
            admins.push(await row.getText());
        }
        return admins;
    }

    async waitForCandidateListUpdate() {
        console.log("DEBUG: Waiting for member dropdown to populate...");
        await this.driver.wait(async () => {
            const options = await this.driver.findElements(By.xpath(`${this.memberSelect.value}/option`));
            const texts = await Promise.all(options.map(o => o.getText()));
            // Return true if we have more than 1 option and they aren't all placeholders
            return options.length > 1 && texts.some(t => t.trim() !== '' && !t.toLowerCase().includes('select'));
        }, 15000, "Member dropdown did not populate after chapter selection");
    }

    async isCandidateDropdownDisabled() {
        const el = await this.driver.findElement(this.memberSelect);
        return !(await el.isEnabled());
    }

    async isAuthorizeButtonDisabled() {
        const el = await this.driver.findElement(this.authorizeBtn);
        return !(await el.isEnabled());
    }
}

module.exports = ChapterAdminPage;
