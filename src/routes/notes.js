const express = require('express');
const multer = require('multer');
const Note = require('../models/note');
const { bucket } = require('../storage');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

// GET /notes?tag=docker
router.get('/', async (req, res) => {
  const filter = req.query.tag ? { tags: req.query.tag } : {};
  const notes = await Note.find(filter).sort({ createdAt: -1 }).limit(50);
  res.json(notes);
});

// GET /notes/:id
router.get('/:id', async (req, res) => {
  const note = await Note.findById(req.params.id);

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.json(note);
});

// POST /notes
router.post('/', async (req, res) => {
  const note = await Note.create(req.body);
  res.status(201).json(note);
});

// PUT /notes/:id
router.put('/:id', async (req, res) => {
  const note = await Note.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.json(note);
});

// DELETE /notes/:id
router.delete('/:id', async (req, res) => {
  const note = await Note.findByIdAndDelete(req.params.id);

  if (!note) {
    return res.status(404).json({ message: 'Không tìm thấy ghi chú' });
  }

  res.status(204).send();
});

// POST /notes/:id/attachment
router.post('/:id/attachment', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Vui lòng chọn tệp tải lên' });
  }

  const note = await Note.findById(req.params.id);

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
});

module.exports = router;
