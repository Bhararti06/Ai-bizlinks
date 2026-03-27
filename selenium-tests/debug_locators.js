const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
require('dotenv').config({ path: './selenium-tests/.env' });

async function debugLocators() {
    let options = new chrome.Options();
    options.addArguments('--headless');
    let driver = await new Builder().forBrowser('chrome').setChromeOptions(options).build();
    try {
        console.log("Navigating to setup page...");
        // Use a known setup URL from previous logs if possible, or just hit the login page and trigger it.
        // Actually, it's easier to just list the inputs in the test itself.
        // I'll modify the test to print input names.
    } finally {
        await driver.quit();
    }
}
// Run it...
