const mongoose = require('mongoose');

async function connectDB(uri) {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri, {
    dbName: 'notes',
    serverSelectionTimeoutMS: 5000
  });

  console.log('Đã kết nối MongoDB Atlas');

  return mongoose.connection;
}

module.exports = { connectDB };
