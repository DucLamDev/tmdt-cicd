import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import { uploadSingle, uploadMultiple, getFileUrl } from '../middlewares/upload.js';
import { asyncHandler } from '../middlewares/errorHandler.js';

const router = express.Router();

// Single file upload
router.post('/single', authenticate, uploadSingle('file'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No file uploaded'
    });
  }

  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      path: req.file.path,
      url: getFileUrl(req.file.path),
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
}));

// Avatar upload
router.post('/avatar', authenticate, uploadSingle('avatar'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: 'No avatar uploaded'
    });
  }

  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      path: req.file.path,
      url: getFileUrl(req.file.path),
      size: req.file.size,
      mimetype: req.file.mimetype
    }
  });
}));

// Product images upload
router.post('/products', authenticate, uploadMultiple('productImages', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No product images uploaded'
    });
  }

  const files = req.files.map(file => ({
    filename: file.filename,
    path: file.path,
    url: getFileUrl(file.path),
    size: file.size,
    mimetype: file.mimetype
  }));

  res.json({
    success: true,
    data: files
  });
}));

// Multiple files upload
router.post('/multiple', authenticate, uploadMultiple('files', 10), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'No files uploaded'
    });
  }

  const files = req.files.map(file => ({
    filename: file.filename,
    path: file.path,
    url: getFileUrl(file.path),
    size: file.size,
    mimetype: file.mimetype
  }));

  res.json({
    success: true,
    data: files
  });
}));

export default router;
