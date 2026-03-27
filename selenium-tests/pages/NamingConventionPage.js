const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class NamingConventionPage extends BasePage {
    constructor(driver) {
        super(driver);

        // Navigation
        this.namingConventionNavLink = By.linkText("Naming Convention");

        // Form Elements
        this.chapterInput = By.xpath("//input[@name='chapterLabel' or contains(@placeholder, 'Branch')]");
        this.categoryInput = By.xpath("//input[@name='categoryLabel' or contains(@placeholder, 'Industry')]");
        this.planInput = By.xpath("//input[@name='planLabel' or contains(@placeholder, 'Subscription')]");
        this.meetingsInput = By.xpath("//input[@name='meetingLabel' or contains(@placeholder, 'Session')]");

        // Buttons
        this.saveButton = By.xpath("//button[contains(., 'Save') or contains(., 'Update') or contains(., 'Create')]");
        this.resetButton = By.xpath("//button[contains(., 'Reset') or contains(., 'Delete')]");

        // Verification Elements
        this.pageTitle = By.xpath("//h1 | //h2 | //h3 | //h4[contains(., 'Naming')]");
        this.sidebarMenu = By.xpath("//nav | //aside");
    }

    async navigateToNamingConvention() {
        console.log('DEBUG: Navigating to Naming Convention');
        await this.click(this.namingConventionNavLink);
        await this.driver.sleep(3000);
        console.log(`DEBUG: Current URL after Naming click: ${await this.driver.getCurrentUrl()}`);
    }

    async setCustomName(field, value) {
        console.log(`DEBUG: Setting custom name for ${field}: ${value}`);
        let inputLocator;

        switch (field.toLowerCase()) {
            case 'chapter':
                inputLocator = this.chapterInput;
                break;
            case 'category':
                inputLocator = this.categoryInput;
                break;
            case 'plan':
                inputLocator = this.planInput;
                break;
            case 'meetings':
                inputLocator = this.meetingsInput;
                break;
            default:
                throw new Error(`Unknown field: ${field}`);
        }

        try {
            await this.driver.wait(until.elementLocated(inputLocator), 10000);
        } catch (e) {
            console.log(`DEBUG: Failed to find ${field} input. URL: ${await this.driver.getCurrentUrl()}`);
            const inputs = await this.driver.findElements(By.tagName('input'));
            console.log(`DEBUG: Found ${inputs.length} inputs on page.`);
            for (let inp of inputs) {
                const name = await inp.getAttribute('name');
                const placeholder = await inp.getAttribute('placeholder');
                console.log(`DEBUG: - Input name='${name}', placeholder='${placeholder}'`);
            }
            throw e;
        }

        await this.clear(inputLocator);
        await this.forceReactValue(inputLocator, value);
    }

    async saveNamingConvention() {
        console.log('DEBUG: Saving naming convention');
        await this.click(this.saveButton);
        await this.driver.sleep(3000); // Wait for save and UI update
    }

    async resetNamingConvention() {
        console.log('DEBUG: Resetting naming convention');
        await this.click(this.resetButton);

        // Confirm if there's a confirmation dialog
        try {
            const confirmBtn = By.xpath("//button[contains(., 'Confirm') or contains(., 'Yes')]");
            const confirmExists = await this.isVisible(confirmBtn, 2000);
            if (confirmExists) {
                await this.click(confirmBtn);
            }
        } catch (e) {
            // No confirmation dialog
        }

        await this.driver.sleep(3000);
    }

    async verifyTabName(expectedName) {
        console.log(`DEBUG: Verifying tab name: ${expectedName}`);
        // Broad search for any element containing the text (case-insensitive)
        const lowerName = expectedName.toLowerCase();
        const tabLocator = By.xpath(`//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lowerName}')]`);
        return await this.isVisible(tabLocator, 10000);
    }

    async verifySidebarLabel(expectedName) {
        console.log(`DEBUG: Verifying sidebar label: ${expectedName}`);
        const lowerName = expectedName.toLowerCase();
        const labelLocator = By.xpath(`//aside//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lowerName}')] | //nav//*[contains(translate(text(), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), '${lowerName}')]`);
        return await this.isVisible(labelLocator, 5000);
    }

    async verifyPageTitle(expectedTitle) {
        console.log(`DEBUG: Verifying page title: ${expectedTitle}`);
        try {
            await this.driver.wait(until.elementLocated(this.pageTitle), 10000);
            const title = await this.find(this.pageTitle);
            const titleText = await title.getText();
            return titleText.toLowerCase().includes(expectedTitle.toLowerCase());
        } catch (e) {
            return false;
        }
    }

    async verifyDefaultNames() {
        console.log('DEBUG: Verifying default names restored');
        // On the dashboard, only Chapters and Categories usually appear as summary cards
        const defaultNames = ['Chapters', 'Categories'];

        for (const name of defaultNames) {
            const exists = await this.verifyTabName(name);
            if (!exists) {
                console.log(`DEBUG: Default name NOT found on dashboard: ${name}`);
                return false;
            }
        }

        return true;
    }

    async forceReactValue(locator, value) {
        const element = await this.find(locator);
        await this.driver.executeScript((el, val) => {
            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
            setter.call(el, val);
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }, element, value);
    }

    async clear(locator) {
        const element = await this.find(locator);
        // Sometimes .clear() doesn't work well with React, so we use a keyboard combination
        await element.click();
        await element.sendKeys(require('selenium-webdriver').Key.CONTROL, "a");
        await element.sendKeys(require('selenium-webdriver').Key.BACK_SPACE);
    }
}

module.exports = NamingConventionPage;
