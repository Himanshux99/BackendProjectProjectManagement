import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./db/index.js";
dotenv.config({ path: "./.env" });

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Express app is running on port http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.log("MongoDB conntection error");
    process.exit(1);
  });
