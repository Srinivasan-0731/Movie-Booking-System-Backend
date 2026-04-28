import express from "express";
import {
  signup,
  login,
  getFavorites,
  getUserBookings,
  updateFavorite,
  makeAdmin,
} from "../controllers/userController.js";
import auth from "../middleware/auth.js";

const userRouter = express.Router();

userRouter.post("/signup", signup);
userRouter.post("/login", login);
userRouter.get("/bookings", auth, getUserBookings);
userRouter.get("/favorites", auth, getFavorites);
userRouter.post("/favorites", auth, updateFavorite);
userRouter.post("/make-admin", makeAdmin);

export default userRouter;