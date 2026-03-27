const fs = require('fs');
const path = require('path');

class GlobalState {
    constructor() {
        this.filePath = path.join(__dirname, 'globalState.json');
        this.state = this._load();
    }

    _load() {
        try {
            if (fs.existsSync(this.filePath)) {
                return JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
            }
        } catch (e) {
            console.error('DEBUG: Failed to load global state:', e.message);
        }
        return {};
    }

    _save() {
        try {
            fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2));
        } catch (e) {
            console.error('DEBUG: Failed to save global state:', e.message);
        }
    }

    set(key, value) {
        this.state[key] = value;
        this._save();
    }

    get(key) {
        return this.state[key];
    }

    setOrgUrl(url) {
        this.set('orgUrl', url);
        // Also extract domain
        try {
            const urlObj = new URL(url);
            const domain = urlObj.searchParams.get('org');
            if (domain) this.set('orgDomain', domain);
        } catch (e) { }
    }

    getOrgUrl() {
        return this.get('orgUrl');
    }

    getOrgDomain() {
        return this.get('orgDomain');
    }

    setOrgAdmin(email, password) {
        this.set('orgAdminEmail', email);
        this.set('orgAdminPassword', password);
    }
}

module.exports = new GlobalState();
