(async () => {
  try {
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'sunita@gmail.com', password: 'Sunita@123' })
    });
    const loginData = await loginRes.json();
    console.log('Login Response:', loginData);
    
    if (!loginData.token) throw new Error('No token received');
    
    const askRes = await fetch('http://localhost:3001/api/ai/ask', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + loginData.token
      },
      body: JSON.stringify({ question: 'What are my current medications and when should I take them?' })
    });
    
    const askData = await askRes.json();
    console.log('AI Ask Response:', askData);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
