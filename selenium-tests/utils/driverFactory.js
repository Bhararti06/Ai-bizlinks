const { Builder } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');

async function createDriver(browser = 'chrome') {
    let driver;

    if (browser === 'chrome') {
        const options = new chrome.Options();
        // options.addArguments('--headless'); // Uncomment for CI/CD
        driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
    } else {
        throw new Error(`Browser ${browser} not supported`);
    }

    await driver.manage().setTimeouts({ implicit: 5000 });
    return driver;
}

module.exports = { createDriver };
