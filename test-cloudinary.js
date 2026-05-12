const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dzhwkcvht',
  api_key: '415944595386116',
  api_secret: 'xMmUCBabWOqZPKKtN6IzlBdcByg',
});

// A small transparent 1x1 GIF base64 string
const base64Image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

cloudinary.uploader.upload(base64Image, { folder: 'test' })
  .then(result => {
    console.log('SUCCESS! Credentials are valid.');
    console.log(result);
  })
  .catch(error => {
    console.error('FAILED! Credentials are NOT valid.');
    console.error(error);
  });
