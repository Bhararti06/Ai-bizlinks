const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class DashboardPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.totalOrgsCount = By.xpath("//div[p[contains(text(), 'Active Members')]]//h3");
        this.totalMembersCount = By.xpath("//div[p[contains(text(), 'Organization Members')]]//h3");
        this.logoutBtn = By.xpath("//button[contains(., 'Logout')]");
        this.chaptersHeader = By.xpath("//h2[contains(text(), 'Organization Overview')]");
    }

    async waitForDashboard() {
        console.log("DEBUG: Waiting for Organizations Overview header...");
        await this.driver.wait(until.elementLocated(this.chaptersHeader), 20000);
    }

    async getStatValue(statName) {
        const locator = statName === 'orgs' ? this.totalOrgsCount : this.totalMembersCount;
        await this.driver.wait(until.elementLocated(locator), 15000);
        return await this.getText(locator);
    }


    async getActiveMemberCount() {
        // Get the count of active members from admin dashboard
        // This looks for the "Active Members" or similar stat card
        try {
            await this.driver.sleep(1000); // Wait for dashboard to render
            const activeMemberLocator = By.xpath("//div[p[contains(text(), 'Active Members') or contains(text(), 'Total Members')]]//h3");
            await this.driver.wait(until.elementLocated(activeMemberLocator), 10000);
            const countText = await this.driver.findElement(activeMemberLocator).getText();
            const count = parseInt(countText, 10);
            console.log(`DEBUG: Active member count: ${count}`);
            return count;
        } catch (e) {
            console.log(`DEBUG: Active member count failed: ${e.message}`);
            return 0;
        }
    }

    async getChapterCardCount() {
        // Count the number of chapter items displayed in the Chapters summary section
        // Each chapter is displayed as a group with name and member count
        try {
            await this.driver.sleep(1000); // Wait for dashboard to render
            const chapters = await this.driver.findElements(By.xpath("//h3[contains(text(), 'Chapters')]/ancestor::div[contains(@class, 'premium-card')]//div[@class='group cursor-default']"));
            console.log(`DEBUG: Found ${chapters.length} chapters in dashboard summary`);
            return chapters.length;
        } catch (e) {
            console.log(`DEBUG: Chapter count failed: ${e.message}`);
            return 0;
        }
    }

    async getCategoryCardCount() {
        // Count the number of category items displayed in the Categories summary section
        try {
            await this.driver.sleep(1000); // Wait for dashboard to render

            // First check if "NO DATA" is displayed
            try {
                const noData = await this.driver.findElement(By.xpath("//h3[contains(text(), 'Categories')]/ancestor::div[contains(@class, 'premium-card')]//p[contains(text(), 'No Data')]"));
                if (noData) {
                    console.log('DEBUG: Categories section shows "NO DATA"');
                    return 0;
                }
            } catch (e) {
                // No "NO DATA" message, proceed to count categories
            }

            // Count category items
            const categories = await this.driver.findElements(By.xpath("//h3[contains(text(), 'Categories')]/ancestor::div[contains(@class, 'premium-card')]//div[@class='group']"));
            console.log(`DEBUG: Found ${categories.length} categories in dashboard summary`);
            return categories.length;
        } catch (e) {
            console.log(`DEBUG: Category count failed: ${e.message}`);
            return 0;
        }
    }

    async getPlanCardCount() {
        // Plans don't have a dashboard summary section
        console.log('DEBUG: Plans do not have a dashboard summary section');
        return 0;
    }

    async waitForCardUpdate(cardType, expectedValue, timeout = 10000) {
        console.log(`DEBUG: Waiting for ${cardType} to show ${expectedValue}`);
        const startTime = Date.now();

        while (Date.now() - startTime < timeout) {
            let currentValue;
            switch (cardType.toLowerCase()) {
                case 'chapter':
                    currentValue = await this.getChapterCardCount();
                    break;
                case 'category':
                    currentValue = await this.getCategoryCardCount();
                    break;
                case 'plan':
                    currentValue = await this.getPlanCardCount();
                    break;
                default:
                    throw new Error(`Unknown card type: ${cardType}`);
            }

            console.log(`DEBUG: Current ${cardType} count: ${currentValue}, expected: ${expectedValue}`);

            if (currentValue === expectedValue) {
                console.log(`DEBUG: ${cardType} count updated to ${expectedValue}`);
                return true;
            }

            await this.driver.sleep(1000); // Check every second
        }

        throw new Error(`Timeout waiting for ${cardType} to update to ${expectedValue}`);
    }
}

module.exports = DashboardPage;
