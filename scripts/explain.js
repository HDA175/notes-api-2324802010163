require('dotenv').config();

const mongoose = require('mongoose');
const Note = require('../src/models/note');

const pick = (r) => (Array.isArray(r) ? r[0] : r).executionStats;

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'notes' });
    await Note.syncIndexes();

    const scan = pick(
      await Note.find({ tags: 'docker' })
        .hint({ $natural: 1 })
        .explain('executionStats')
    );

    const idx = pick(
      await Note.find({ tags: 'docker' })
        .explain('executionStats')
    );

    console.table({
      'Quét toàn bộ': {
        docsExamined: scan.totalDocsExamined,
        returned: scan.nReturned,
        ms: scan.executionTimeMillis
      },
      'Dùng chỉ mục': {
        docsExamined: idx.totalDocsExamined,
        returned: idx.nReturned,
        ms: idx.executionTimeMillis
      }
    });
  } catch (error) {
    console.error('Explain error:', error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
