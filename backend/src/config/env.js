import dotenv from 'dotenv';

dotenv.config();

export const PORT = process.env.PORT || 4000;
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
export const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.0-pro-latest';
export const MAX_CONTEXT_CHARS = Number(process.env.MAX_CONTEXT_CHARS) || 12000;
export const FILE_UPLOAD_LIMIT = 10 * 1024 * 1024; // 10 MB
