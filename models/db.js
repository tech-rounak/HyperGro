const mongoose = require('mongoose');
const dotenv = require("dotenv");
dotenv.config()
const db = process.env.MONGO_URI.toString();

const connectDB = async () => {
  try {
      await mongoose.connect(db, {
        useNewUrlParser: true,
        useUnifiedTopology: true
      });
    console.log('Mongoose DB running');
  } catch (err) {
    console.log(err.message);
    process.exit(1);
  }
};

module.exports = {connectDB}