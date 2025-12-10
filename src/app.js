import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

// basic configurations
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(express.static("public"));
app.use(cookieParser())

// cors configurations
app.use(
  cors({
    origin: process.env.CROS_ORIGIN?.split(",") || "http://localhost:5173",
    credentials: true,//Send or recieve Credentials from the req or res
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
);

// Importing Routes
import healthCheckRoutes from "./routes/healthCheck.routes.js";
import authRouter from "./routes/auth.routes.js"

// Using Routes
app.use("/api/v1/healthcheck", healthCheckRoutes);
app.use("/api/v1/auth", authRouter);


app.get("/", (req, res) => {
  res.send("This is my first Project");
});

app.get("/insta", (req, res) => {
  res.send("This is a instaghishiram page");
});

export default app;
