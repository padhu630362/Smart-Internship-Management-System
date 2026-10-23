import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chat uploads destination directory
export const CHAT_UPLOAD_DIR = path.resolve(__dirname, '../../uploads/chat');

if (!fs.existsSync(CHAT_UPLOAD_DIR)) {
  fs.mkdirSync(CHAT_UPLOAD_DIR, { recursive: true });
}

// 15MB maximum file size for chat attachments
export const MAX_CHAT_FILE_SIZE = 15 * 1024 * 1024;

// Permitted extensions and their classifications
export const ALLOWED_CHAT_EXTENSIONS = new Set([
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
]);

export const ALLOWED_CHAT_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/octet-stream', // Some browsers send octet-stream for office files
]);

export const getAttachmentType = (ext, mimeType) => {
  const extension = (ext || '').toLowerCase();
  if (['.png', '.jpg', '.jpeg', '.webp'].includes(extension) || mimeType?.startsWith('image/')) {
    return 'image';
  }
  if (extension === '.pdf' || mimeType === 'application/pdf') {
    return 'pdf';
  }
  if (
    ['.doc', '.docx'].includes(extension) ||
    mimeType?.includes('wordprocessingml') ||
    mimeType === 'application/msword'
  ) {
    return 'document';
  }
  if (
    ['.xls', '.xlsx'].includes(extension) ||
    mimeType?.includes('spreadsheetml') ||
    mimeType?.includes('excel')
  ) {
    return 'spreadsheet';
  }
  if (
    ['.ppt', '.pptx'].includes(extension) ||
    mimeType?.includes('presentationml') ||
    mimeType?.includes('powerpoint')
  ) {
    return 'presentation';
  }
  return 'other';
};

const chatStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, CHAT_UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueKey = crypto.randomBytes(16).toString('hex');
    const safeName = `chat-${Date.now()}-${uniqueKey}${ext}`;
    cb(null, safeName);
  },
});

const chatFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (!ALLOWED_CHAT_EXTENSIONS.has(ext)) {
    const err = new Error(
      `File format '${ext}' is not supported. Allowed formats: PDF, Images (PNG, JPG, WEBP), Word (.doc, .docx), Excel (.xls, .xlsx), and PowerPoint (.ppt, .pptx).`
    );
    err.code = 'INVALID_FILE_TYPE';
    err.statusCode = 400;
    return cb(err, false);
  }

  // Allow standard mime types or octet-stream when extension is valid
  if (!ALLOWED_CHAT_MIME_TYPES.has(file.mimetype) && file.mimetype !== 'application/octet-stream') {
    const err = new Error(`Unsupported MIME type '${file.mimetype}'.`);
    err.code = 'INVALID_FILE_MIME';
    err.statusCode = 400;
    return cb(err, false);
  }

  cb(null, true);
};

export const uploadChatAttachment = multer({
  storage: chatStorage,
  fileFilter: chatFileFilter,
  limits: {
    fileSize: MAX_CHAT_FILE_SIZE,
    files: 5,
  },
});

