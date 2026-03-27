const axios = require('axios');

async function testOrgAPI() {
    try {
        // Test fetching GreenTree organization
        const res = await axios.get('http://localhost:5000/api/organizations/public/greentree');
        console.log('=== API Response for GreenTree ===');
        console.log(JSON.stringify(res.data, null, 2));

        if (res.data.success && res.data.data) {
            const { name, logo, sub_domain } = res.data.data;
            console.log('\n=== Extracted Data ===');
            console.log('Name:', name);
            console.log('Logo:', logo);
            console.log('Sub Domain:', sub_domain);

            if (logo) {
                console.log('\n=== Constructed Logo URL ===');
                console.log('Full URL:', `http://localhost:5000${logo}`);
            }
        }
    } catch (error) {
        console.error('Error fetching organization:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

testOrgAPI();
