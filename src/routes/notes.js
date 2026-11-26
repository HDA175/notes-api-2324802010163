const express = require('express');
const multer = require('multer');
const Note = require('../models/note');
const { bucket } = require('../storage');
const requireAuth = require('../middleware/auth');

const router = express.Router();

// Tất cả API /notes đều yêu cầu JWT
router.use(requireAuth);

// Chuyển lỗi từ async route sang middleware xử lý lỗi
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// GET /notes?tag=docker
router.get('/', asyncHandler(async (req, res) => {
  const filter = { owner: req.user.sub };

  if (req.query.tag) {
    filter.tags = String(req.query.tag);
  }

  const notes = await Note.find(filter)
    .sort({ createdAt: -1 })
    .limit(50);

  res.json(notes);
}));

// GET /notes/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findOne({
    _id: req.params.id,
    owner: req.user.sub
  });

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.json(note);
}));

// POST /notes
router.post('/', asyncHandler(async (req, res) => {
  const { title, content, tags } = req.body ?? {};

  const note = await Note.create({
    title,
    content,
    tags,
    owner: req.user.sub
  });

  res.status(201).json(note);
}));

// PUT /notes/:id
router.put('/:id', asyncHandler(async (req, res) => {
  const body = req.body;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ message: 'Dữ liệu cập nhật không hợp lệ' });
  }

  // Chỉ cho phép cập nhật ba trường này, không cho sửa owner
  const updates = {};

  for (const field of ['title', 'content', 'tags']) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'Không có trường hợp lệ để cập nhật' });
  }

  const note = await Note.findOneAndUpdate(
    {
      _id: req.params.id,
      owner: req.user.sub
    },
    { $set: updates },
    { new: true, runValidators: true }
  );

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.json(note);
}));

// DELETE /notes/:id
router.delete('/:id', asyncHandler(async (req, res) => {
  const note = await Note.findOneAndDelete({
    _id: req.params.id,
    owner: req.user.sub
  });

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.status(204).send();
}));

// POST /notes/:id/attachment
router.post(
  '/:id/attachment',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn tệp tải lên' });
    }

    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.sub
    });

    if (!note) {
      return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
    }

    const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const filePath = `uploads/${fileName}`;

    const { error } = await bucket().upload(filePath, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false
    });

    if (error) {
      throw error;
    }

    const { data } = bucket().getPublicUrl(filePath);
    note.attachmentUrl = data.publicUrl;
    await note.save();

    res.json({
      message: 'Tải tệp lên thành công',
      attachmentUrl: note.attachmentUrl
    });
  })
);

module.exports = router;
