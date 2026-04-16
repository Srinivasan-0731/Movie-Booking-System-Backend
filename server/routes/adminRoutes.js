import express from "express";
import { auth, protectAdmin } from "../middleware/auth.js";
import {
  isAdmin,
  getDashboardData,
  getAllShows,
  getAllBookings,
  getFavorites,
} from "../controllers/adminController.js";

const router = express.Router();

router.get("/favorites", auth, getFavorites);
router.get("/is-admin", auth, isAdmin);
router.get("/dashboard", auth, protectAdmin, getDashboardData);
router.get("/all-shows", auth, protectAdmin, getAllShows);
router.get("/all-bookings", auth, protectAdmin, getAllBookings);

export default router;