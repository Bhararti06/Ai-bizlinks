const { By, until } = require('selenium-webdriver');
const BasePage = require('./BasePage');

class OrganizationGalleryPage extends BasePage {
    constructor(driver) {
        super(driver);

        // Navigation
        this.galleryNavLink = By.xpath("//a[contains(., 'Organization Gallery')]");

        // Logo Upload Elements
        this.logoUploadInput = By.id("logo-upload");
        this.logoImage = By.xpath("//img[@alt='Org Logo']");

        // Gallery/Slider Upload Elements (5 separate fields)
        this.sliderUploadInput1 = By.id("gallery-upload-0");
        this.sliderUploadInput2 = By.id("gallery-upload-1");
        this.sliderUploadInput3 = By.id("gallery-upload-2");
        this.sliderUploadInput4 = By.id("gallery-upload-3");
        this.sliderUploadInput5 = By.id("gallery-upload-4");

        // Description inputs for slider images
        this.sliderDescription1 = By.xpath("(//input[@placeholder='Enter welcoming text for this slide...'])[1]");
        this.sliderDescription2 = By.xpath("(//input[@placeholder='Enter welcoming text for this slide...'])[2]");
        this.sliderDescription3 = By.xpath("(//input[@placeholder='Enter welcoming text for this slide...'])[3]");
        this.sliderDescription4 = By.xpath("(//input[@placeholder='Enter welcoming text for this slide...'])[4]");
        this.sliderDescription5 = By.xpath("(//input[@placeholder='Enter welcoming text for this slide...'])[5]");

        // Save/Finalize Button
        this.saveButton = By.xpath("//button[contains(., 'Finalize Branding')]");
        this.discardButton = By.xpath("//button[contains(., 'Discard')]");

        // Verification Elements
        this.headerLogo = By.xpath("//header//img[contains(@alt, 'logo') or contains(@src, 'logo')]");
        this.imageSlider = By.xpath("//div[contains(@class, 'slider') or contains(@class, 'carousel')]");
        this.uploadedSliderImages = By.xpath("//img[contains(@alt, 'Gallery')]");

        // Success toast
        this.successToast = By.xpath("//div[contains(@class, 'Toastify__toast--success')]");
    }

    async navigateToGallery() {
        console.log('DEBUG: Navigating to Organization Gallery');
        await this.click(this.galleryNavLink);
        await this.driver.sleep(2000); // Wait for page load
    }

    async uploadLogo(filePath) {
        console.log(`DEBUG: Uploading logo from ${filePath}`);
        const input = await this.find(this.logoUploadInput);
        await input.sendKeys(filePath);
        await this.driver.sleep(2000); // Wait for image processing
        console.log('DEBUG: Logo file selected');
    }

    async uploadSliderImage(imageNumber, filePath, description = '') {
        console.log(`DEBUG: Uploading slider image ${imageNumber} from ${filePath}`);

        let inputLocator;
        let descriptionLocator;

        switch (imageNumber) {
            case 1:
                inputLocator = this.sliderUploadInput1;
                descriptionLocator = this.sliderDescription1;
                break;
            case 2:
                inputLocator = this.sliderUploadInput2;
                descriptionLocator = this.sliderDescription2;
                break;
            case 3:
                inputLocator = this.sliderUploadInput3;
                descriptionLocator = this.sliderDescription3;
                break;
            case 4:
                inputLocator = this.sliderUploadInput4;
                descriptionLocator = this.sliderDescription4;
                break;
            case 5:
                inputLocator = this.sliderUploadInput5;
                descriptionLocator = this.sliderDescription5;
                break;
            default:
                throw new Error(`Invalid image number: ${imageNumber}. Must be 1-5.`);
        }

        const input = await this.find(inputLocator);
        await input.sendKeys(filePath);
        await this.driver.sleep(1500); // Wait for image processing

        // Add description if provided
        if (description) {
            await this.type(descriptionLocator, description);
        }

        console.log(`DEBUG: Slider image ${imageNumber} file selected`);
    }

    async uploadAllSliderImages(imagePaths, descriptions = []) {
        console.log(`DEBUG: Uploading ${imagePaths.length} slider images`);

        for (let i = 0; i < Math.min(imagePaths.length, 5); i++) {
            const imageNumber = i + 1;
            const description = descriptions[i] || `Slider Image ${imageNumber}`;
            await this.uploadSliderImage(imageNumber, imagePaths[i], description);
        }

        console.log('DEBUG: All slider images uploaded');
    }

    async clickSave() {
        console.log('DEBUG: Clicking Save/Finalize button');
        await this.click(this.saveButton);

        // Wait for success toast
        try {
            await this.driver.wait(until.elementLocated(this.successToast), 10000);
            console.log('DEBUG: Save successful - toast appeared');
            await this.driver.sleep(2000); // Wait for save to complete
            return true;
        } catch (e) {
            console.log('DEBUG: No success toast found');
            return false;
        }
    }

    async clickDiscard() {
        console.log('DEBUG: Clicking Discard button');
        await this.click(this.discardButton);
        await this.driver.sleep(1000);
    }

    async verifyLogoUploaded() {
        console.log('DEBUG: Verifying logo is uploaded in gallery page');
        try {
            const logoImg = await this.find(this.logoImage);
            const src = await logoImg.getAttribute('src');
            return src && src.length > 0 && !src.includes('placeholder');
        } catch (e) {
            console.log('DEBUG: Logo not found in gallery');
            return false;
        }
    }

    async verifyLogoInHeader() {
        console.log('DEBUG: Verifying logo in header');
        return await this.isVisible(this.headerLogo, 5000);
    }

    async getUploadedSliderImageCount() {
        console.log('DEBUG: Counting uploaded slider images');
        const images = await this.driver.findElements(this.uploadedSliderImages);
        let count = 0;

        for (const img of images) {
            try {
                const src = await img.getAttribute('src');
                if (src && src.length > 0 && !src.includes('placeholder')) {
                    count++;
                }
            } catch (e) {
                // Skip if image not accessible
            }
        }

        console.log(`DEBUG: Found ${count} uploaded slider images`);
        return count;
    }

    async verifyImagesInSlider() {
        console.log('DEBUG: Verifying images in slider on login/signup page');
        return await this.isVisible(this.imageSlider, 5000);
    }

    async removeSliderImage(imageNumber) {
        console.log(`DEBUG: Removing slider image ${imageNumber}`);
        // remove button is usually within the container for that image
        // index logic: Logo is index 1, Slider 1 is index 2, Slider 2 is index 3, Slider 3 is index 4
        // The container usually has class relative and a fixed size
        const containerIndex = imageNumber + 1;
        const containerXPath = `(//div[contains(@class, 'relative') and contains(@class, 'w-40')])[${containerIndex}]`;
        const removeBtnXPath = `${containerXPath}//button[contains(., 'Remove')]`;

        try {
            // Hover over the image to make remove button visible
            const container = await this.driver.wait(until.elementLocated(By.xpath(containerXPath)), 5000);
            await this.driver.actions().move({ origin: container }).perform();
            await this.driver.sleep(800);

            const removeBtn = await this.driver.wait(until.elementLocated(By.xpath(removeBtnXPath)), 5000);
            await this.driver.wait(until.elementIsVisible(removeBtn), 2000);
            await removeBtn.click();

            await this.driver.sleep(1000);
            console.log(`DEBUG: Slider image ${imageNumber} removed`);
            return true;
        } catch (e) {
            console.log(`DEBUG: Failed to remove slider image ${imageNumber}: ${e.message}`);
            // Fallback: try to just find any remove button at that index
            try {
                const altRemoveBtn = By.xpath(`(//button[contains(., 'Remove')])[${containerIndex}]`);
                await this.click(altRemoveBtn);
                console.log(`DEBUG: Slider image ${imageNumber} removed via fallback`);
                return true;
            } catch (err) {
                console.log(`DEBUG: Fallback remove failed: ${err.message}`);
                return false;
            }
        }
    }

    async verifySliderImageCount(expectedCount) {
        const actualCount = await this.getUploadedSliderImageCount();
        console.log(`DEBUG: Expected ${expectedCount} slider images, found ${actualCount}`);
        return actualCount === expectedCount;
    }

    async refreshPage() {
        console.log('DEBUG: Refreshing page');
        await this.driver.navigate().refresh();
        await this.driver.sleep(3000); // Wait for page reload
    }
}

module.exports = OrganizationGalleryPage;
