// Mongoose = Tool that adds structure + validation + easy methods on top of MongoDB.
// It makes working with MongoDB much safer and simpler.
import mongoose from "mongoose";

const connnectDb = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
  } catch (error) {
    console.log("MongoDB connection error", error);
    process.exit(1);
  }
};

export default connnectDb; //exporting this method, using default as we only have one file and 
// therefore while importing we can give it any name we want