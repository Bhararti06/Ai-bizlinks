const { By, until, Key } = require('selenium-webdriver');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const BasePage = require('./BasePage');

class LoginPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.emailInput = By.name('email');
        this.passwordInput = By.name('password');
        this.continueButton = By.xpath("//button[text()='Continue' or text()='Validating...']");
        this.loginButton = By.xpath("//button[text()='Sign in' or text()='Signing in...']");
        this.newPasswordInput = By.name('newPassword');
        this.confirmPasswordInput = By.name('confirmPassword');
        this.createPasswordButton = By.xpath("//button[contains(text(), 'Create Password')]");
    }

    async navigate() {
        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        const currentUrl = await this.driver.getCurrentUrl();
        if (currentUrl.includes('/dashboard') || currentUrl.includes('/admin')) {
            console.log("DEBUG: Already on a protected page. Skipping navigate to /login");
            return;
        }
        await this.driver.get(`${baseUrl}/login`);
    }

    /**
     * Powerful helper to ensure a button click triggers form submission in React.
     */
    async clickAndSubmit(locator, fallbackInputLocator = null) {
        console.log(`DEBUG: clickAndSubmit for ${locator}`);
        const btn = await this.driver.wait(until.elementLocated(locator), 15000);

        await this.driver.executeScript("arguments[0].scrollIntoView({block: 'center'});", btn);
        await this.driver.sleep(500);
        await this.driver.executeScript("arguments[0].focus();", btn);

        const initialUrl = await this.driver.getCurrentUrl();

        const checkSuccess = async (d) => {
            try {
                const currentUrl = await d.getCurrentUrl();
                const passFields = await d.findElements(this.passwordInput);
                const toast = await d.findElements(By.className('Toastify__toast'));

                if (currentUrl !== initialUrl || passFields.length > 0 || toast.length > 0) return true;

                const stillPresent = await d.findElements(locator);
                if (stillPresent.length === 0) return true;
                return !(await stillPresent[0].isDisplayed());
            } catch (e) {
                return false;
            }
        };

        // Try standard click
        try {
            await btn.click();
            const success = await this.driver.wait(checkSuccess, 3000).catch(() => false);
            if (success) return;
        } catch (e) { }

        // Try Action click
        try {
            console.log("DEBUG: Trying Action click...");
            await this.driver.actions().move({ origin: btn }).click().perform();
            const success = await this.driver.wait(checkSuccess, 3000).catch(() => false);
            if (success) return;
        } catch (e) { }

        // Try JS Dispatch
        console.log("DEBUG: Trying JS Dispatch (Form Submit)...");
        await this.driver.executeScript(`
            const btn = arguments[0];
            const form = btn.closest('form');
            if (form) {
                form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
            } else {
                btn.click();
            }
        `, btn);

        const finalSuccess = await this.driver.wait(checkSuccess, 5000).catch(() => false);
        if (!finalSuccess && fallbackInputLocator) {
            console.log("DEBUG: Using Enter key fallback...");
            const input = await this.driver.findElement(fallbackInputLocator);
            await input.sendKeys(Key.ENTER);
        }
    }

    async forceReactValue(locator, value) {
        const el = await this.driver.wait(until.elementLocated(locator), this.timeout);
        await this.driver.executeScript(`
            const el = arguments[0];
            const value = arguments[1];
            const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
            nativeInputValueSetter.call(el, value);
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        `, el, value);
    }

    async safeAction(locator, action) {
        try {
            const el = await this.driver.wait(until.elementLocated(locator), this.timeout);
            await this.driver.wait(until.elementIsVisible(el), 5000);
            return await action(el);
        } catch (e) {
            console.error(`DEBUG: Error during safeAction for ${locator}: ${e.message}`);
            const fs = require('fs');
            const path = require('path');
            const screenshot = await this.driver.takeScreenshot();
            const screenshotPath = path.join(process.cwd(), `error_safeaction_${Date.now()}.png`);
            fs.writeFileSync(screenshotPath, screenshot, 'base64');
            console.log(`DEBUG: Error screenshot saved to ${screenshotPath}`);
            throw e;
        }
    }

    async enterEmail(email) {
        console.log(`DEBUG: Entering email: ${email}`);
        await this.safeAction(this.emailInput, async (el) => {
            await el.click();
            await this.forceReactValue(this.emailInput, email);
        });
        // Take a screenshot after entering email for verification
        const screenshot = await this.driver.takeScreenshot();
        require('fs').writeFileSync('after_email_entry.png', screenshot, 'base64');
    }

    async clickContinue() {
        const buttons = await this.driver.findElements(this.continueButton);
        if (buttons.length > 0 && await buttons[0].isDisplayed()) {
            console.log("DEBUG: Clicking Continue...");
            await this.clickAndSubmit(this.continueButton, this.emailInput);
            // Take diagnostic screenshot
            const screenshot = await this.driver.takeScreenshot();
            require('fs').writeFileSync('after_click_continue.png', screenshot, 'base64');
            console.log("DEBUG: Screenshot after clickContinue saved.");
        } else {
            console.log("DEBUG: Continue button not present/visible, skipping.");
        }
    }

    async enterPassword(password) {
        console.log("DEBUG: Entering password...");
        await this.safeAction(this.passwordInput, async (el) => {
            await el.click();
            await this.forceReactValue(this.passwordInput, password);
        });
    }

    async clickSignIn() {
        await this.clickAndSubmit(this.loginButton, this.passwordInput);
    }

    // -----------------------------------------
    // PART 2: High-level Login Methods
    // -----------------------------------------

    async login(email, password) {
        console.log(`DEBUG: Legacy login called for ${email}, wrapping with loginSuccess...`);
        // Use a generic dashboard element for backward compatibility
        const defaultDashboard = By.xpath("//h3[contains(text(), 'Chapters')]");
        return await this.loginSuccess(email, password, defaultDashboard);
    }

    async superAdminLogin(email, password) {
        console.log(`DEBUG: Super Admin login calling for ${email}...`);
        const baseUrl = process.env.BASE_URL.replace(/\/$/, '');
        await this.driver.get(`${baseUrl}/super-admin/login`);
        console.log(`DEBUG: Current URL: ${await this.driver.getCurrentUrl()}`);

        try {
            await this.driver.wait(until.elementLocated(this.emailInput), this.timeout);
            console.log("DEBUG: Email input located.");
        } catch (e) {
            console.error("DEBUG: Failed to locate email input. Page source snippet:", (await this.driver.getPageSource()).substring(0, 500));
            throw e;
        }

        await this.type(this.emailInput, email);
        await this.type(this.passwordInput, password);
        await this.click(By.xpath("//button[text()='Sign in']"));
        await this.driver.wait(until.urlContains('/super-admin/dashboard'), this.timeout);
        console.log("DEBUG: Super Admin Login successful.");
    }

    async loginSuccess(email, password, dashboardLocator) {
        console.log(`DEBUG: Attempting successful login for ${email}...`);
        await this.navigate();

        // If navigate skipped or redirect happened, check if we're already "there"
        // Try multiple indicators for being logged in
        const dashIndicators = [
            dashboardLocator,
            By.xpath("//h2[contains(text(), 'Organization Overview')]"),
            By.xpath("//h3[contains(text(), 'Chapters')]"),
            By.xpath("//button[contains(., 'Logout')]"),
            By.xpath("//a[contains(@href, 'logout')]")
        ];

        for (const loc of dashIndicators) {
            if (!loc) continue;
            try {
                const els = await this.driver.findElements(loc);
                if (els.length > 0 && await els[0].isDisplayed()) {
                    console.log(`DEBUG: Already logged in (detected by ${loc}). loginSuccess early return.`);
                    return true;
                }
            } catch (e) { }
        }

        await this.enterEmail(email);
        await this.clickContinue();

        // Check for "No account found" or other errors immediately
        await this.checkErrorToasts();

        await this.driver.wait(async (d) => {
            const [pass, dash] = await Promise.all([
                d.findElements(this.passwordInput),
                d.findElements(dashboardLocator)
            ]);
            return pass.length > 0 || dash.length > 0;
        }, 20000);

        const passField = await this.driver.findElements(this.passwordInput);
        const createPassField = await this.driver.findElements(this.newPasswordInput); // Check for registration/setup field

        if (passField.length > 0 && await passField[0].isDisplayed()) {
            await this.enterPassword(password);
            await this.clickSignIn();
        } else if (createPassField.length > 0) {
            console.log("DEBUG: Redirected to Password Setup. Completing setup...");
            await this.forceReactValue(By.name('newPassword'), password);
            await this.forceReactValue(By.name('confirmPassword'), password);
            await this.clickAndSubmit(By.xpath("//button[contains(., 'Create Password')]"));
        } else {
            console.error("DEBUG: Neither login nor create password field appeared.");
            const screenshot = await this.driver.takeScreenshot();
            require('fs').writeFileSync('login_stall_error.png', screenshot, 'base64');
        }

        console.log("DEBUG: Waiting for dashboard element...");
        try {
            await this.driver.wait(until.elementLocated(dashboardLocator), 20000);
        } catch (e) {
            console.log("DEBUG: Primary dashboard locator failed, trying universal session check...");
            await this.driver.wait(async (d) => {
                const url = await d.getCurrentUrl();
                const source = await d.getPageSource();
                return url.includes('/dashboard') ||
                    url.includes('/admin') ||
                    source.includes('Logout') ||
                    source.includes('Dashboard');
            }, 10000);
        }
        return true;
    }

    /**
     * loginExpectError — handles both scenarios:
     *   1. Error at email step (e.g. revoked/inactive account → 403 from validate-email)
     *      → toast appears WITHOUT password field ever showing
     *   2. Error at password step (wrong password)
     *      → password field appears, we enter credentials, then error toast fires
     */
    async loginExpectError(email, password) {
        console.log(`DEBUG: loginExpectError called for ${email}...`);

        await this.enterEmail(email);
        await this.clickContinue();

        // 1. Race between "password field appearing" and "early error toast"
        let gotPasswordField = false;
        let earlyToastText = '';

        await this.driver.wait(async (d) => {
            const [passFields, toasts] = await Promise.all([
                d.findElements(this.passwordInput),
                d.findElements(By.className('Toastify__toast'))
            ]);

            // Check if password field is visible
            if (passFields.length > 0 && await passFields[0].isDisplayed()) {
                gotPasswordField = true;
                return true;
            }

            // Check for any toast text
            for (const t of toasts) {
                try {
                    const txt = await t.getText();
                    if (txt && txt.trim().length > 3) {
                        earlyToastText = txt.trim();
                        return true;
                    }
                } catch (e) { /* stale */ }
            }
            return false;
        }, 15000).catch(() => {
            console.warn("DEBUG: No early signal detected in loginExpectError.");
        });

        if (gotPasswordField) {
            console.log("DEBUG: password field appeared, continuing to password entry...");
            await this.enterPassword(password);
            await this.clickSignIn();
            // Wait for final error toast
            return await this.waitForToast('error', 15000);
        }

        if (earlyToastText) {
            console.log(`DEBUG: Caught early toast: "${earlyToastText}"`);
            return earlyToastText;
        }

        throw new Error("loginExpectError: No password field or error toast was detected.");
    }

    async setupPassword(email, password) {
        console.log(`DEBUG: Setting up password for ${email}`);
        const initialUrl = await this.driver.getCurrentUrl();

        await this.waitAndType(this.emailInput, email);
        console.log(`DEBUG: Entering email: ${email}`);
        await this.safeClick(this.continueButton);
        console.log(`DEBUG: Clicked continue.`);
        await this.waitAndType(this.newPasswordInput, password);
        await this.waitAndType(this.confirmPasswordInput, password);
        await this.safeClick(this.createPasswordButton);

        // Wait for redirect after password creation
        console.log("DEBUG: Waiting for post-password redirect...");
        try {
            await this.driver.wait(async (d) => {
                const currentUrl = await d.getCurrentUrl();
                return currentUrl !== initialUrl;
            }, 20000);
            console.log(`DEBUG: Redirected to: ${await this.driver.getCurrentUrl()}`);
        } catch (e) {
            const fs = require('fs');
            const screenshot = await this.driver.takeScreenshot();
            fs.writeFileSync('setup_password_timeout.png', screenshot, 'base64');
            console.log("DEBUG: Timeout waiting for redirect. Screenshot saved.");
            throw e;
        }
    }

    async checkErrorToasts() {
        try {
            const toasts = await this.driver.findElements(By.className('Toastify__toast--error'));
            if (toasts.length > 0) {
                const text = await toasts[0].getText();
                console.error(`DEBUG: Error toast detected: ${text}`);
                const screenshot = await this.driver.takeScreenshot();
                require('fs').writeFileSync(`error_toast_${Date.now()}.png`, screenshot, 'base64');
                throw new Error(`Authentication failed with error: ${text}`);
            }
        } catch (e) {
            if (e.message.includes('Authentication failed')) throw e;
        }
    }
}

module.exports = LoginPage;
