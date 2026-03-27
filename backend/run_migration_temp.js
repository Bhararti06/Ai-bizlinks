const { up } = require('./migrations/modify_organizations_settings');

(async () => {
    try {
        await up();
        console.log('Migration completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
})();
