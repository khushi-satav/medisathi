const crypto = require('crypto');

const cloudName = 'dzhwkcvht';
const apiKey = '846558732653232';
const apiSecret = '3ZDSx4Txa9IGqrpSi-ohG0-0Ha0';
const timestamp = Math.floor(Date.now() / 1000);

// Generate signature
const stringToSign = `timestamp=${timestamp}${apiSecret}`;
const signature = crypto.createHash('sha1').update(stringToSign).digest('hex');

const base64Image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    file: base64Image,
    api_key: apiKey,
    timestamp: timestamp,
    signature: signature
  })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
