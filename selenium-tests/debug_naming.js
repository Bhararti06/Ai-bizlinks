const { createDriver } = require('./utils/driverFactory');
const { By, until } = require('selenium-webdriver');
require('dotenv').config();

async function run() {
    let driver = await createDriver();
    try {
        let orgId = 'naming-1771850363926';
        let loginUrl = `http://localhost:3000/login?org=${orgId}`;
        await driver.get(loginUrl);
        await driver.wait(until.elementLocated(By.name('email')), 10000);
        await driver.findElement(By.name('email')).sendKeys('naming_admin_1771850363926@example.com');
        await (await driver.findElement(By.xpath('//button[contains(., "Continue")]'))).click();
        await driver.wait(until.elementLocated(By.name('password')), 10000);
        await driver.findElement(By.name('password')).sendKeys('Password123!');

        const selectors = [By.xpath("//button[contains(., 'Sign In')]"), By.xpath("//button[@type='submit']")];
        for (let sel of selectors) {
            try {
                let btn = await driver.findElement(sel);
                if (await btn.isDisplayed()) { await btn.click(); break; }
            } catch (e) { }
        }
        await driver.wait(until.urlContains('/admin/dashboard'), 15000);
        console.log('LOGGED IN');

        console.log('Navigating to Naming Convention...');
        await (await driver.findElement(By.linkText('Naming Convention'))).click();
        await driver.sleep(3000);

        console.log('Current Values:');
        console.log('Chapter:', await (await driver.findElement(By.name('chapterLabel'))).getAttribute('value'));
        console.log('Category:', await (await driver.findElement(By.name('categoryLabel'))).getAttribute('value'));

        console.log('Setting new values: DistrictX, SegmentY...');
        let chap = await driver.findElement(By.name('chapterLabel'));
        await chap.sendKeys(require('selenium-webdriver').Key.CONTROL, "a", require('selenium-webdriver').Key.BACK_SPACE, 'DistrictX');
        let cat = await driver.findElement(By.name('categoryLabel'));
        await cat.sendKeys(require('selenium-webdriver').Key.CONTROL, "a", require('selenium-webdriver').Key.BACK_SPACE, 'SegmentY');

        await (await driver.findElement(By.xpath("//button[contains(., 'Create')]"))).click();
        await driver.sleep(3000);

        console.log('Navigating to Dashboard...');
        await driver.get(`http://localhost:3000/${orgId}/admin/dashboard`);
        await driver.sleep(3000);

        console.log('Refreshing...');
        await driver.navigate().refresh();
        await driver.sleep(5000);

        console.log('Navigating BACK to Naming Convention...');
        await driver.get(`http://localhost:3000/${orgId}/admin/naming-convention`);
        await driver.sleep(3000);

        console.log('Values after reload:');
        console.log('Chapter:', await (await driver.findElement(By.name('chapterLabel'))).getAttribute('value'));
        console.log('Category:', await (await driver.findElement(By.name('categoryLabel'))).getAttribute('value'));

    } catch (e) {
        console.log('ERROR:', e.message);
    } finally {
        await driver.quit();
    }
}

run();
