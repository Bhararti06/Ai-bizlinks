const { By } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class PostsPage extends BasePage {
    constructor(driver) {
        super(driver);
        this.createPostBtn = By.xpath("//button[contains(text(), 'Write Post')]");
        this.titleInput = By.id('title');
        this.descriptionInput = By.id('description');
        this.postBtn = By.xpath("//button[contains(text(), 'Post Now')]");
        this.firstPostTitle = By.css('.post-card h3');
    }

    async createPost(title, description) {
        await this.click(this.createPostBtn);
        await this.type(this.titleInput, title);
        await this.type(this.descriptionInput, description);
        await this.click(this.postBtn);
    }
}

module.exports = PostsPage;
