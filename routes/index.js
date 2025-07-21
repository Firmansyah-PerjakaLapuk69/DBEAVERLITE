import express from 'express';
import {
  renderHome,
  executeQuery,
  downloadCSV
} from '../controllers/queryController.js';

const router = express.Router();

// Route utama
router.get('/', renderHome);

router.get('/query', (req, res) => {
  res.redirect('/');
});

// Jalankan query
router.post('/query', executeQuery);

// Download hasil query
router.post('/query/download', downloadCSV); // ✅ Ini penting!

export default router;
