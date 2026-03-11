import express from "express"
import { getFavorites, getUserBookings, updateFavorite } from "../controllers/userController.js";
import { requireAuth } from "@clerk/express";

const userRouter = express.Router();

userRouter.get('/bookings', requireAuth(), getUserBookings)
userRouter.post('/update-favorite', requireAuth(), updateFavorite)
userRouter.get('/favorite', requireAuth(), getFavorites)

export default userRouter;