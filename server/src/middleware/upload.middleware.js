import multer from 'multer';
import path from 'node:path';

const storage = multer.memoryStorage();
const allowedMimeTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
    return cb(new Error('Only jpg, jpeg, png, webp files are allowed'));
  }
  if (/[<>:"/\\|?*\x00-\x1F]/.test(file.originalname || '')) {
    return cb(new Error('Invalid file name'));
  }
  return cb(null, true);
};

export const uploadProfilePhoto = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 1, fields: 5 }
}).single('photo');
