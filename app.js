import "./loadEnv.js";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import {
  ALLOWED_ORIGINS,
  API_BASE_URL,
  APP_PORT,
  MONGODB_URL,
  NODE_ENV,
} from "./constants/shared-constants.js";
import userRoutes from "./routes/user-routes.js";
import otpRoutes from "./routes/otp-routes.js";

const app = express();
app.use(express.json());
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.urlencoded({ extended: true }));

// Middleware for logging HTTP requests.
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ message: "Server is running...", app: "Issue Tracker Backend" });
});

// ROUTES
app.use(`${API_BASE_URL}/users`, userRoutes);
app.use(`${API_BASE_URL}/otp`, otpRoutes);

mongoose
  .connect(MONGODB_URL)
  .then(async () => {
    console.log("Connected to MongoDB");

    app.listen(APP_PORT, () => {
      console.log(`Server is running on port ${APP_PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1); // Exit the process with an error code
  });
