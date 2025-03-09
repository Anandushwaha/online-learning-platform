import mongoose from "mongoose";

/**
 * Connect to MongoDB database
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // Note: useNewUrlParser, useUnifiedTopology, useFindAndModify, and useCreateIndex
      // are no longer needed in Mongoose 6.0+
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
