const Organization = require('./models/Organization');

async function checkOrgs() {
    try {
        console.log('Calling Organization.getAll()...');
        const orgs = await Organization.getAll();
        console.log('Success! Count:', orgs.length);
        console.log(JSON.stringify(orgs, null, 2));
        process.exit(0);
    } catch (error) {
        console.error('Error during Organization.getAll():', error);
        process.exit(1);
    }
}

checkOrgs();
