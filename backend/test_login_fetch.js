async function testLogin() {
    console.log('Attempting login for superadmin@bizlinks.in...');
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'superadmin@bizlinks.in',
                password: 'SuperAdmin1'
            })
        });

        const data = await response.json();

        console.log('Response Status:', response.status);
        console.log('Success:', data.success);

        if (response.ok) {
            console.log('✅ Login SUCCESS!');
            console.log('User Role:', data.data.user ? data.data.user.role : 'No user obj');
            console.log('Token:', data.data.token ? 'Present' : 'Missing');
        } else {
            console.log('❌ Login FAILED');
            console.log('Message:', data.message);
        }
    } catch (error) {
        console.log('❌ Request Error:', error.message);
    }
}

testLogin();
