const express = require('express');
const os = require('os');
const notesRouter = require('./routes/notes');

const app = express();

app.use(express.json({ limit: '1mb' }));

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

app.use('/notes', notesRouter);

// Middleware xử lý lỗi
app.use((err, req, res, next) => {
  console.error(err);

  if (
    err.name === 'ValidationError' ||
    err.name === 'CastError' ||
    err.code === 'LIMIT_FILE_SIZE'
  ) {
    return res.status(400).json({ message: err.message });
  }

  res.status(500).json({ message: 'Lỗi máy chủ nội bộ' });
});

module.exports = app;
