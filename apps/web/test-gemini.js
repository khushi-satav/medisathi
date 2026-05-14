const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8').split('\n').find(l => l.startsWith('GEMINI_API_KEY='));
const key = env ? env.split('=')[1].trim().replace(/"/g, '') : '';

(async () => {
  try {
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + key);
    const data = await res.json();
    if (data.models) {
      console.log('Models:', data.models.map(m => m.name));
    } else {
      console.log('Error:', data);
    }
  } catch (e) { console.error(e); }
})();
