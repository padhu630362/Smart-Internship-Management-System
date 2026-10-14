import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Destination directory for student resumes
export const UPLOAD_DIR = path.resolve(__dirname, '../../uploads/resumes');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Allowed MIME types and extensions
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.doc', '.docx']);

// Max file size: 5MB
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const ext = path.extname(file.originalname).toLowerCase();
    const timestamp = Date.now();
    const randomHex = Math.random().toString(36).substring(2, 8);
    const sanitizedName = `resume-${userId}-${timestamp}-${randomHex}${ext}`;
    cb(null, sanitizedName);
  },
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  // Strict check on extension and mimetype
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    const error = new Error(`File format ${ext} is not allowed. Only PDF, DOC, and DOCX files are permitted.`);
    error.code = 'INVALID_FILE_TYPE';
    return cb(error, false);
  }

  if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
    const error = new Error(`MIME type ${file.mimetype} is invalid. Only document files are permitted.`);
    error.code = 'INVALID_FILE_MIME';
    return cb(error, false);
  }

  cb(null, true);
};

export const uploadResumeFile = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});
