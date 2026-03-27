async function login() {
    try {
        const response = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'pratikshamali08@gmail.com',
                password: 'Pratiksha#123'
            })
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Login successful. Saving token...');
            const fs = require('fs');
            fs.writeFileSync('admin_token.json', JSON.stringify(data, null, 2));
        } else {
            console.error('Login Failed:', data);
            process.exit(1);
        }
    } catch (error) {
        console.error('Network Error:', error.message);
        process.exit(1);
    }
}

login();
