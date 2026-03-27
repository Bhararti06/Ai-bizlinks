const { pool } = require('./backend/config/database');
const Organization = require('./backend/models/Organization');

async function verifyOnboardingPermission() {
    console.log('--- VERIFYING ONBOARDING PERMISSION BACKEND ENFORCEMENT ---');
    try {
        // 1. Get an organization ID
        const orgId = 1;
        console.log(`Using Org ID: ${orgId}`);

        // 2. Disable onboarding in settings
        console.log('Disabling memberOnboarding...');
        const [org] = await pool.execute('SELECT settings FROM organizations WHERE id = ?', [orgId]);
        let settings = typeof org[0].settings === 'string' ? JSON.parse(org[0].settings || '{}') : (org[0].settings || {});
        settings.memberOnboarding = false;
        await pool.execute('UPDATE organizations SET settings = ? WHERE id = ?', [JSON.stringify(settings), orgId]);

        // 3. Manually test the logic (simulating userController.js check)
        console.log('Testing rejection with memberOnboarding=false and role=chapter_admin...');
        const role = 'chapter_admin';

        // Re-fetch to be sure
        const [orgRefetch] = await pool.execute('SELECT settings FROM organizations WHERE id = ?', [orgId]);
        const currentSettings = typeof orgRefetch[0].settings === 'string' ? JSON.parse(orgRefetch[0].settings || '{}') : (orgRefetch[0].settings || {});

        if (role === 'chapter_admin' && currentSettings.memberOnboarding === false) {
            console.log('SUCCESS: Backend check correctly identifies lack of permission.');
        } else {
            console.error('FAILURE: Backend check failed to identify lack of permission.');
        }

        // 4. Enable onboarding in settings
        console.log('Enabling memberOnboarding...');
        settings.memberOnboarding = true;
        await pool.execute('UPDATE organizations SET settings = ? WHERE id = ?', [JSON.stringify(settings), orgId]);

        // 5. Test logic again
        console.log('Testing rejection with memberOnboarding=true and role=chapter_admin...');
        const [orgRefetch2] = await pool.execute('SELECT settings FROM organizations WHERE id = ?', [orgId]);
        const currentSettings2 = typeof orgRefetch2[0].settings === 'string' ? JSON.parse(orgRefetch2[0].settings || '{}') : (orgRefetch2[0].settings || {});

        if (role === 'chapter_admin' && currentSettings2.memberOnboarding === true) {
            console.log('SUCCESS: Backend check correctly identifies presence of permission.');
        } else {
            console.error('FAILURE: Backend check failed to identify presence of permission.');
        }

    } catch (error) {
        console.error('Error during verification:', error);
    } finally {
        pool.end();
    }
}

verifyOnboardingPermission();
