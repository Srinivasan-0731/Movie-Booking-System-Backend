import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import User from "../models/User.js";
import Movie from "../models/Movie.js";

export const isAdmin = async (req, res) => {
  try {
    res.json({
      success: true,
      isAdmin: req.user.role === "admin",
    });
  } catch (error) {
    console.error("IS ADMIN ERROR:", error);
    res.status(500).json({ success: false, message: "Admin check failed" });
  }
};

export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });

    const activeShows = await Show.find({
      showDateTime: { $gte: new Date() },
    }).populate("movie");

    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce((acc, booking) => acc + booking.amount, 0),
      activeShows,
      totalUser,
    };

    res.json({ success: true, dashboardData });
  } catch (error) {
    console.error("DASHBOARD ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};


export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({
      showDateTime: { $gte: new Date() },
    })
      .populate("movie")
      .sort({ showDateTime: 1 });

    const validShows = shows.filter((show) => show.movie !== null);

    res.json({ success: true, shows: validShows });
  } catch (error) {
    console.error("GET SHOWS ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user")
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error("GET BOOKINGS ERROR:", error);
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
    console.error("GET FAVORITES ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};