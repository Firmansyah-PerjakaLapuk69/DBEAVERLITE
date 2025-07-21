import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import expressLayouts from 'express-ejs-layouts';
import { fileURLToPath } from 'url';
import routes from './routes/index.js';

dotenv.config();

const app = express();

// ESM workaround
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layout');

// Middleware
app.use(expressLayouts); // Harus setelah view engine
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// 💡 Penempatan yang benar: parser harus sebelum routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/', routes);

// Server listen
const PORT = process.env.PORT || 4002;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
