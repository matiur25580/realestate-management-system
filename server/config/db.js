const mongoose = require('mongoose');

async function connectDB() {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is required before connecting to MongoDB.');
  }
  const connection = await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  console.log('MongoDB connected.');
  return connection;
}

module.exports = connectDB;
