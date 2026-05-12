const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: 'dzhwkcvht',
  api_key: '846558732653232',
  api_secret: '3ZDSx4Txa9IGqrpSi-ohG0-0Ha0',
});

const base64Image = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

cloudinary.uploader.upload(base64Image)
  .then(result => {
    console.log('SUCCESS! Uploaded.', result);
  })
  .catch(error => {
    console.error('FAILED! Upload error.', error);
  });
