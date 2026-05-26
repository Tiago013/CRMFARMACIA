const axios = require('axios');

async function testAnalytics() {
    try {
        const loginRes = await axios.post('http://127.0.0.1:8002/api/v1/auth/login', {
            email: 'admin@farmaia.com',
            password: 'admin'
        });

        const token = loginRes.data.access_token;
        
        try {
            const res = await axios.get('http://127.0.0.1:8002/api/v1/analytics/snapshot?period=month', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            console.log("Success:", res.data);
        } catch (e) {
            console.error("Analytics Error:", e.response ? e.response.data : e.message);
        }
    } catch (e) {
        console.error("Login Error:", e.response ? e.response.data : e.message);
    }
}

testAnalytics();
