import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { checkDocument } from '../controllers/checkController.js';

const router = Router();

router.post('/check', upload.single('pdf'), checkDocument);

export default router;
