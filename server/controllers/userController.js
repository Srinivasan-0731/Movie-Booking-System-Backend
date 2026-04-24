import Booking from "../models/Booking.js";
import Movie from "../models/Movie.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";

export const signup = async (req, res) => {
  try {
    let { fullName, email, phone, password } = req.body;

    if (!fullName?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    email = email.toLowerCase().trim();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    if (phone && !/^[0-9]{10,15}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Invalid phone number" });
    }

    const exist = await User.findOne({ email });
    if (exist) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullName,
      username: fullName,
      email,
      phone,
      password: hashedPassword,
      role: "user", 
    });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.log("SIGNUP ERROR:", err);
    res.status(500).json({ success: false, message: "Signup error" });
  }
};

export const login = async (req, res) => {
  try {
    let { identifier, password } = req.body;

    if (!identifier?.trim() || !password?.trim()) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    identifier = identifier.trim();

    let user =
      /^[0-9]{10,15}$/.test(identifier)
        ? await User.findOne({ phone: identifier })
        : await User.findOne({ email: identifier.toLowerCase() });

    if (!user) {
      return res.status(400).json({ success: false, message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Wrong password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ success: true, token, user });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ success: false, message: "Login error" });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({
      user: req.user.id,
      isPaid: true,
    })
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateFavorite = async (req, res) => {
  try {
    const { movieId } = req.body;
    const user = await User.findById(req.user.id);

    const exists = user.favorites?.includes(movieId);

    if (exists) {
      user.favorites = user.favorites.filter((id) => id.toString() !== movieId);
    } else {
      user.favorites.push(movieId);
    }

    await user.save();

    res.json({
      success: true,
      message: exists ? "Removed from favorites" : "Added to favorites",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getFavorites = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const movies = await Movie.find({
      _id: { $in: user.favorites || [] },
    });

    res.json({ success: true, movies });
  } catch (error) {
    console.log("GET FAVORITES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};