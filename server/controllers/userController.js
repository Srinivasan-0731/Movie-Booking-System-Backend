import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Signup
export const signup = async (req, res) => {
  try {
    const { fullName, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const username = email.split("@")[0];

    const user = await User.create({
      fullName,
      username,
      email,
      password: hashedPassword,
      phone: phone || "",
      role: "user",
    });

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
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
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.json({ success: false, message: "All fields required" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { phone: identifier }],
    });

    if (!user) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.json({ success: false, message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role }, 
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// Get User Profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
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
      user.favorites.splice(index, 1);
    } else {
      user.favorites.push(movieId);
    }

    await user.save();
    res.json({ success: true, favorites: user.favorites });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// TEMP: Make admin
export const makeAdmin = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.json({ success: false, message: "Email required" });
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