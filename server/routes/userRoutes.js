import express from "express";
import {
  signup,
  login,
  getUserProfile,
  getUserBookings,
  getFavorites,
  updateFavorite,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";

const userRouter = express.Router();

// Auth
userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/profile", auth, getUserProfile);

// Bookings
userRouter.get("/bookings", auth, getUserBookings);

// Favorites
userRouter.get("/favorites", auth, getFavorites);
userRouter.post("/favorites", auth, updateFavorite);

export default userRouter;