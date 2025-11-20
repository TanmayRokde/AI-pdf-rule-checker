import multer from 'multer';
import { FILE_UPLOAD_LIMIT } from '../config/env.js';

const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: { fileSize: FILE_UPLOAD_LIMIT },
});
