const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class SetPasswordPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.emailInput = By.name('email');
        this.passwordInput = By.name('newPassword');
        this.confirmPasswordInput = By.name('confirmPassword');
        this.submitBtn = By.xpath("//button[contains(., 'Create Password')]");
        this.successToast = By.css(".Toastify__toast--success");
    }

    async setPassword(email, password) {
        const LoginPage = require('./LoginPage');
        const login = new LoginPage(this.driver);

        console.log(`DEBUG: Setting password for ${email}...`);
        await login.enterEmail(email);
        await login.clickContinue();

        // Wait for password fields to appear
        await this.driver.wait(until.elementLocated(this.passwordInput), 10000);

        await login.forceReactValue(this.passwordInput, password);
        await login.forceReactValue(this.confirmPasswordInput, password);

        console.log("DEBUG: Submitting password setup...");
        await login.clickAndSubmit(this.submitBtn);
        // Wait for potential toast or redirect
        await this.driver.sleep(2000);
    }
}

module.exports = SetPasswordPage;
