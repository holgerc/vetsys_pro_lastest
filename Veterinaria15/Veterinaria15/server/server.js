import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

import apiRoutes from './api/v1/routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json({ limit: '10mb' })); // To parse JSON bodies, with a higher limit for file uploads

// API routes
app.use('/api/v1', apiRoutes);

// --- Static File Serving ---
// In production, the frontend should be built, and this path should point to the 'dist' or 'build' folder.
// For this project's structure, we serve from the root directory.
const frontendPath = path.join(__dirname, '..');
app.use(express.static(frontendPath));

// The "catchall" handler: for any request that doesn't match one above,
// send back the main index.html file. This is crucial for single-page applications.
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server is listening on port ${PORT}`);
  console.log(`Serving frontend from: ${frontendPath}`);
});
