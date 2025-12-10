/*
Express is a web framework for Node.js that makes it easy to:
build servers
create APIs
handle routes (GET, POST, etc.)
manage middleware
*/
import express from "express";
import cors from "cors"; //It is a security rule in browsers that controls
// which websites are allowed to send requests to your server.
import cookieParser from "cookie-parser"; //Used to manage or use cookies in express environment

const app = express();

// basic configurations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" })); //it parse the form data into a JSON object
app.use(express.static("public"));
app.use(cookieParser());

// cors configurations
app.use(
  cors({
    origin: process.env.CROS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true, //Send or recieve Credentials from the req or res
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

// Importing Routes
import healthCheckRoutes from "./routes/healthCheck.routes.js"; // dont forget the .js as it will cause some error
import authRouter from "./routes/auth.routes.js";

// Using Routes
app.use("/api/v1/healthcheck", healthCheckRoutes); // its like adding prefix,
// so every route in the healthCheckRoutes will have this by default
app.use("/api/v1/auth", authRouter);

app.get("/", (req, res) => {
  res.send("This is my first Project");
}); // this is how you handle the request

app.get("/insta", (req, res) => {
  res.send("This is a instaghishiram page");
});

export default app;
