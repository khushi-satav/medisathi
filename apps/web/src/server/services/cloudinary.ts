import { v2 as cloudinary } from 'cloudinary';

// Initialize once
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a base64 image/file to Cloudinary
 * @returns secure_url of the uploaded file
 */
export async function uploadToCloudinary(
  dataUri: string,
  userId: string,
  folder = 'prescriptions'
): Promise<string> {
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: `medisaathi/${folder}/${userId}`,
    resource_type: 'image',
  });
  return result.secure_url;
}

/**
 * Delete a file from Cloudinary by its URL
 */
export async function deleteFromCloudinary(url: string): Promise<void> {
  // Extract public_id from URL
  const parts = url.split('/');
  const filenameWithExt = parts[parts.length - 1];
  const filename = filenameWithExt.split('.')[0];
  const folder = parts.slice(parts.indexOf('medisaathi')).join('/').replace(`/${filenameWithExt}`, '');
  const publicId = `${folder}/${filename}`;

  await cloudinary.uploader.destroy(publicId);
}

export default cloudinary;
