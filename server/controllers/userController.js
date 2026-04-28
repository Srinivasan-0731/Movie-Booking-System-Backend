import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Signup
export const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user", // Fixed: was "admin" before
    });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get User Bookings
export const getUserBookings = async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;

    const bookings = await Booking.find({ user: req.user.id })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get Favorites
export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("favorites");
    res.json({ success: true, movies: user.favorites || [] });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Add/Remove Favorite
export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const user = await User.findById(req.user.id);

    if (!user.favorites) user.favorites = [];

    const index = user.favorites.indexOf(movieId);
    if (index > -1) {
      user.favorites.splice(index, 1); // Remove
    } else {
      user.favorites.push(movieId); // Add
    }

    await user.save();
    res.json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Make yourself admin - call once then remove
export const makeAdmin = async (req, res) => {
  try {
    const { email, secretKey } = req.body;

    if (!process.env.ADMIN_SECRET || secretKey !== process.env.ADMIN_SECRET) {
      return res.json({ success: false, message: "Unauthorized" });
    }

    const user = await User.findOneAndUpdate(
      { email },
      { role: "admin" },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: `${email} is now admin`, user });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};