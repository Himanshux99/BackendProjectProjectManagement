import dotenv from "dotenv"; //for env
import app from "./app.js";
import connectDB from "./db/index.js"; //importing connectDB method
dotenv.config({ path: "./.env" }); // tells the node the location of the .env file

const port = process.env.PORT || 3000;

connectDB()
  .then(() => {
    app.listen(port, () => {
      console.log(`Express app is running on port http://localhost:${port}`);
    }); // this start a server and listen on the port
  })
  .catch((err) => {
    console.log("MongoDB conntection error");
    process.exit(1);
  });
