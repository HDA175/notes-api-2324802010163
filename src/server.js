require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./db');

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await connectDB(process.env.MONGODB_URI);

    app.listen(PORT, () => {
      console.log(`Server đang chạy tại cổng ${PORT}`);
    });
  } catch (error) {
    console.error('Không thể khởi động máy chủ:', error.message);
    process.exit(1);
  }
}

startServer();
