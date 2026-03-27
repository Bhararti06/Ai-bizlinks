const { Builder, By, until, Key } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

class BasePage {
    constructor(driver) {
        this.driver = driver;
        this.timeout = 30000;
        this.sidebarLinks = {
            dashboard: By.xpath("//a[contains(@href, 'dashboard')]"),
            organizations: By.xpath("//a[contains(@href, 'organizations')]"),
            users: By.xpath("//a[contains(@href, 'users')]"),
            posts: By.xpath("//a[contains(@href, 'posts')]"),
            referrals: By.xpath("//a[contains(@href, 'referrals')]"),
            membershipRequests: By.xpath("//a[contains(@href, 'membership-requests')]"),
            createChapterAdmin: By.xpath("//a[contains(@href, 'create-chapter-admin')]"),
            masterDataDropdown: By.xpath("//button[contains(., 'Master Data')]"),
            chapters: By.xpath("//a[contains(@href, 'master/chapters')]"),
            categories: By.xpath("//a[contains(@href, 'master/categories')]"),
            plans: By.xpath("//a[contains(@href, 'master/membership-plan')]")
        };
        this.logoutBtn = By.xpath("//button[contains(., 'Logout')] | //a[contains(., 'Logout')]");
    }

    async logout() {
        console.log("DEBUG: Attempting logout (Navigate to /login then clear)...");
        try {
            await this.driver.get(`${process.env.BASE_URL}/login`);
            await this.driver.executeScript('window.localStorage.clear(); window.sessionStorage.clear();');
            await this.driver.manage().deleteAllCookies();
            await this.driver.navigate().refresh();
            await this.driver.wait(until.urlContains('/login'), 10000);
            console.log("DEBUG: Logout confirmed, on /login page.");
        } catch (e) {
            console.error("DEBUG: Logout flow failed:", e.message);
        }
    }

    async goTo(url) {
        await this.driver.get(url);
    }

    async find(locator) {
        await this.driver.wait(until.elementLocated(locator), this.timeout);
        return this.driver.findElement(locator);
    }

    async type(locator, text) {
        const element = await this.find(locator);
        // Standard .clear() is often ignored or bypassed by React controlled components.
        // Clicking + Ctrl+A + Backspace is more robust for triggering state updates.
        await element.click();
        await element.sendKeys(Key.CONTROL, 'a');
        await element.sendKeys(Key.BACK_SPACE);
        await element.sendKeys(text);
    }

    async click(locator) {
        const element = await this.find(locator);
        await this.driver.wait(until.elementIsEnabled(element), this.timeout);
        try {
            await element.click();
        } catch (e) {
            if (e.name === 'ElementClickInterceptedError' || e.name === 'ElementNotInteractableError') {
                console.log(`DEBUG: Standard click failed for ${locator}, attempting JS click`);
                await this.driver.executeScript("arguments[0].click();", element);
            } else {
                throw e;
            }
        }
    }

    async safeClick(locator) {
        await this.click(locator);
    }

    async waitAndType(locator, text) {
        await this.type(locator, text);
    }

    async getText(locator) {
        const element = await this.find(locator);
        return await element.getText();
    }

    async isVisible(locator, timeout = this.timeout) {
        try {
            await this.driver.wait(until.elementLocated(locator), timeout);
            const element = await this.driver.findElement(locator);
            return await element.isDisplayed();
        } catch (error) {
            return false;
        }
    }

    async setViewport(size) {
        const viewports = {
            mobile: { width: 375, height: 812 },
            tablet: { width: 768, height: 1024 },
            desktop: { width: 1440, height: 900 }
        };
        const { width, height } = viewports[size] || viewports.desktop;
        await this.driver.manage().window().setRect({ width, height });
    }

    async waitForUrlChange(currentUrl) {
        await this.driver.wait(async () => {
            const url = await this.driver.getCurrentUrl();
            return url !== currentUrl;
        }, this.timeout);
    }

    async waitForURLToContain(text, timeout = this.timeout) {
        await this.driver.wait(until.urlContains(text), timeout);
    }

    async waitForTextInElement(locator, text, timeout = this.timeout) {
        console.log(`DEBUG: Waiting for text "${text}" in element ${locator}...`);
        await this.driver.wait(async () => {
            try {
                const element = await this.driver.findElement(locator);
                const currentText = await element.getText();
                const matched = currentText.toLowerCase().includes(text.toLowerCase());
                if (matched) console.log(`DEBUG: Matched text "${text}". Current: "${currentText}"`);
                return matched;
            } catch (e) {
                return false;
            }
        }, timeout);
    }

    /**
     * waitForToast — works with react-toastify v11+
     * @param {'success'|'error'|'any'} type
     * @param {number} timeout
     * @returns {string} the toast message text
     */
    async waitForToast(type = 'any', timeout = 20000) {
        const cssClass = type === 'success' ? '.Toastify__toast--success'
            : type === 'error' ? '.Toastify__toast--error'
                : '.Toastify__toast';
        console.log(`DEBUG: [TOAST] Waiting for ${type} toast (${cssClass})...`);
        let toastText = '';
        await this.driver.wait(async () => {
            try {
                const toasts = await this.driver.findElements(By.css(cssClass));
                for (const t of toasts) {
                    try {
                        const text = await t.getText();
                        if (text && text.trim().length > 3) {
                            toastText = text.trim();
                            console.log(`DEBUG: [TOAST] Found: "${toastText}"`);
                            return true;
                        }
                    } catch (e) { /* stale, keep polling */ }
                }
                return false;
            } catch (e) {
                return false;
            }
        }, timeout);
        return toastText;
    }

    async waitForNonEmptyText(locator, timeout = this.timeout) {
        console.log(`DEBUG: [POLL] Waiting for non-empty text in ${locator}...`);
        await this.driver.wait(async () => {
            try {
                const elements = await this.driver.findElements(locator);
                if (elements.length === 0) return false;
                const tagName = await elements[0].getTagName();
                if (tagName === 'button') return false;
                const text = await elements[0].getText();
                const valid = text.trim().length > 3;
                if (valid) console.log(`DEBUG: [POLL] Found: "${text}"`);
                return valid;
            } catch (e) {
                return false;
            }
        }, timeout);
    }

    async waitForElementToDisappear(locator, timeout = this.timeout) {
        await this.driver.wait(async () => {
            const elements = await this.driver.findElements(locator);
            if (elements.length === 0) return true;
            return !(await elements[0].isDisplayed());
        }, timeout);
    }

    async navigateTo(module) {
        const masterModules = ['chapters', 'categories', 'plans'];
        if (masterModules.includes(module)) {
            const dropdown = await this.find(this.sidebarLinks.masterDataDropdown);
            const isExpanded = await dropdown.getAttribute('aria-expanded') === 'true';
            // In our Sidebar.jsx, the dropdown toggle is just a button. 
            // We check if the children are visible or if the icon is rotated.
            // Simplified: always try to click if the sub-item isn't visible.
            if (!(await this.isVisible(this.sidebarLinks[module], 2000))) {
                await dropdown.click();
            }
        }
        await this.click(this.sidebarLinks[module]);
    }
}

module.exports = BasePage;
