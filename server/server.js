import express from "express";
import cors from "cors";
import "dotenv/config";
import connectDB from "./configs/db.js";
import { serve } from "inngest/express";
import { inngest, functions } from "./inngest/index.js";
import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { razorpayWebhooks } from "./controllers/razorpayWebhooks.js";

const app = express();
const port = process.env.PORT || 3000;

connectDB()
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Razorpay webhook
app.use(
  "/api/webhooks/razorpay",
  express.raw({ type: "application/json" }),
  razorpayWebhooks
);

// middleware
app.use(express.json());


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://celadon-praline-255189.netlify.app",
    ],
    credentials: true,
  })
);

app.get("/", (req, res) => res.send("Server is Live!"));

app.use("/api/inngest", serve({ client: inngest, functions }));

app.use("/api/show", showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Server error",
  });
});

app.listen(port, () => {
  console.log(`Server running http://localhost:${port}`);
});