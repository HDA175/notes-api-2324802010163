const express = require('express');
const os = require('os');
const mongoose = require('mongoose');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

const notesRouter = require('./routes/notes');
const authRouter = require('./routes/auth');

// Lớp phòng thủ bổ sung chống NoSQL injection
mongoose.set('sanitizeFilter', true);

const app = express();

// Codespaces chạy sau proxy
app.set('trust proxy', 1);

// HTTP security headers
app.use(helmet());

// Giới hạn kích thước JSON request
app.use(express.json({ limit: '100kb' }));

// Giới hạn tối đa 20 request trong 15 phút trên các endpoint auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Quá nhiều yêu cầu, vui lòng thử lại sau' }
});

app.get('/', (req, res) => {
  res.json({
    message: 'Xin chào từ đám mây!',
    host: os.hostname(),
    platform: os.platform(),
    cpus: os.cpus().length,
    memoryGB: Math.round(os.totalmem() / 1024 ** 3),
    uptimeSec: Math.floor(os.uptime()),
    time: new Date().toISOString()
  });
});

app.use('/auth', authLimiter, authRouter);
app.use('/notes', notesRouter);

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err);

  if (
    err.name === 'ValidationError' ||
    err.name === 'CastError' ||
    err.code === 'LIMIT_FILE_SIZE' ||
    err.name === 'MulterError' ||
    err.type === 'entity.too.large'
  ) {
    return res.status(400).json({ message: err.message });
  }

  if (err.code === 11000) {
    return res.status(409).json({ message: 'Dữ liệu đã tồn tại' });
  }

  res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
});

module.exports = app;
