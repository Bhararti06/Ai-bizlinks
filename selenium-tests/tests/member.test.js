const { expect } = require('chai');
const { createDriver } = require('../utils/driverFactory');
const LoginPage = require('../pages/LoginPage');
const DashboardPage = require('../pages/DashboardPage');
const ReferralsPage = require('../pages/ReferralsPage');
const PostsPage = require('../pages/PostsPage');
require('dotenv').config();

describe('Member Test Suite', function () {
    let driver;
    let loginPage;
    let dashboard;
    let referrals;
    let posts;

    before(async function () {
        driver = await createDriver();
        loginPage = new LoginPage(driver);
        dashboard = new DashboardPage(driver);
        referrals = new ReferralsPage(driver);
        posts = new PostsPage(driver);

        await loginPage.goTo(`${process.env.BASE_URL}/login`);
        await loginPage.login(process.env.MEMBER_EMAIL, process.env.MEMBER_PASSWORD);
    });

    after(async function () {
        await driver.quit();
    });

    it('should display the member dashboard after login', async function () {
        const stats = await dashboard.isVisible(dashboard.statsCard);
        expect(stats).to.be.true;
    });

    it('should be able to create a new post', async function () {
        await dashboard.navigateTo('posts');
        const title = `Automation Post ${Date.now()}`;
        await posts.createPost(title, 'Content from Selenium automation');

        // Assertion: verify post title in feed
        const firstPost = await posts.getText(posts.firstPostTitle);
        expect(firstPost).to.equal(title);
    });

    it('should be restricted from accessing admin routes', async function () {
        const currentUrl = await driver.getCurrentUrl();
        const adminUrl = currentUrl.replace('userDashboard', 'admin/dashboard');

        await driver.get(adminUrl);
        // Should redirect back to dashboard or show error
        const urlAfterRedirect = await driver.getCurrentUrl();
        expect(urlAfterRedirect).to.not.contain('/admin/dashboard');
    });

    it('should display collapsed sidebar on mobile view', async function () {
        await dashboard.setViewport('mobile');
        const sidebar = await dashboard.isVisible(dashboard.sidebarLinks.dashboard);
        // In most responsive designs, sidebar links are hidden behind a menu on mobile
        expect(sidebar).to.be.false;
    });
});
