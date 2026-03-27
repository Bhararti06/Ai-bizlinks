const { By, until, Key } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class RegisterUserPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.firstNameInput = By.name('firstName');
        this.lastNameInput = By.name('lastName');
        this.emailInput = By.name('email');
        this.contactInput = By.name('contactNumber');
        this.businessYearsInput = By.name('yearsInBusiness');
        this.registerBtn = By.xpath("//button[contains(., 'Complete Registration')]");
        this.successToast = By.className('Toastify__toast-body');
    }

    async forceReactValue(locator, value) {
        const el = await this.driver.wait(until.elementLocated(locator), 10000);
        await this.driver.executeScript(`
            const el = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        `, el, value);
    }

    /**
     * Powerful helper to ensure a button click triggers form submission in React.
     */
    async clickAndSubmit(locator, fallbackInputLocator = null) {
        console.log(`DEBUG: Aggressive click/submit for ${locator.toString()}...`);
        const btn = await this.driver.wait(until.elementLocated(locator), 15000);

        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", btn);
        await this.driver.sleep(1000);
        await this.driver.executeScript("arguments[0].focus();", btn);

        await this.driver.executeScript(`
            const btn = arguments[0];
            const mouseEvent = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
            btn.dispatchEvent(mouseEvent);
            if (btn.form) {
                if (typeof btn.form.requestSubmit === 'function') {
                    btn.form.requestSubmit();
                } else {
                    const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                    btn.form.dispatchEvent(submitEvent);
                }
            }
        `, btn);

        try {
            await btn.click();
        } catch (e) { }

        if (fallbackInputLocator) {
            try {
                const input = await this.driver.findElement(fallbackInputLocator);
                await input.sendKeys(Key.ENTER);
            } catch (e) { }
        } else {
            try {
                await btn.sendKeys(Key.ENTER);
            } catch (e) { }
        }
    }

    async register(userData) {
        console.log(`DEBUG: Filling registration form for ${userData.email}`);
        await this.driver.wait(until.elementLocated(this.firstNameInput), 15000);

        await this.forceReactValue(this.firstNameInput, userData.firstName);
        await this.forceReactValue(this.lastNameInput, userData.lastName);
        await this.forceReactValue(this.emailInput, userData.email);
        await this.forceReactValue(this.contactInput, userData.contact || '1234567890');
        await this.forceReactValue(this.businessYearsInput, userData.years || '1');

        await this.driver.sleep(1000);

        console.log("DEBUG: Clicking Complete Registration (Aggressive)...");
        await this.clickAndSubmit(this.registerBtn, this.businessYearsInput);
    }

    async getSuccessMessage() {
        console.log("DEBUG: Waiting for success message...");
        const toast = await this.driver.wait(until.elementLocated(this.successToast), 20000);
        return await toast.getText();
    }
}

module.exports = RegisterUserPage;
