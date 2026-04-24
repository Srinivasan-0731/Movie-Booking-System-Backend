import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET_KEY,
});

const checkSeatsAvailability = async (showId, selectedSeats) => {
  try {
    const showData = await Show.findById(showId);
    if (!showData) return false;
    const occupiedSeats = showData.occupiedSeats;
    const isAnySeatTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
    return !isAnySeatTaken;
  } catch (error) {
    console.log(error.message);
    return false;
  }
};

// Create booking — Pay Now or Pay Later
export const createBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { showId, selectedSeats, payLater } = req.body;

    const isAvailable = await checkSeatsAvailability(showId, selectedSeats);
    if (!isAvailable) {
      return res.json({ success: false, message: "Selected seats are not available." });
    }

    const showData = await Show.findById(showId).populate("movie");

    const amount = showData.showPrice * selectedSeats.length;

    // Mark seats as occupied
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount,
      bookedSeats: selectedSeats,
      isPaid: false,
    });

    // PAY LATER — booking save pannuchu, payment skip
    if (payLater) {
      return res.json({
        success: true,
        bookingId: booking._id,
        message: "Booking saved. Pay at counter before showtime.",
      });
    }

    // PAY NOW — Razorpay order create
    const order = await razorpayInstance.orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: booking._id.toString(),
    });

    booking.paymentId = order.id;
    await booking.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      bookingId: booking._id,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

// Pay Now — MyBookings page la Pay Later booking ku payment trigger
export const payNow = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.isPaid) {
      return res.json({ success: false, message: "Already paid" });
    }

    // New Razorpay order
    const order = await razorpayInstance.orders.create({
      amount: booking.amount * 100,
      currency: "INR",
      receipt: `paynow_${bookingId}`,
    });

    booking.paymentId = order.id;
    await booking.save();

    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      bookingId: booking._id,
    });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    const occupiedSeats = Object.keys(showData.occupiedSeats);
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};

export const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    bookingId,
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_SECRET_KEY)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    const booking = await Booking.findById(bookingId);
    booking.isPaid = true;
    await booking.save();

    res.json({ success: true, redirectUrl: "/loading/my-bookings" });
  } else {
    res.json({ success: false, message: "Payment verification failed" });
  }
};


export const cancelBooking = async (req, res) => {
  try {
    const userId = req.user.id;
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.json({ success: false, message: "Booking not found" });
    }

    if (booking.user.toString() !== userId) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    // Release seats from show
    const showData = await Show.findById(booking.show);
    if (showData) {
      booking.bookedSeats.forEach((seat) => {
        delete showData.occupiedSeats[seat];
      });
      showData.markModified("occupiedSeats");
      await showData.save();
    }

    await Booking.findByIdAndDelete(bookingId);

    res.json({ success: true, message: "Booking cancelled successfully" });
  } catch (error) {
    console.log(error.message);
    res.json({ success: false, message: error.message });
  }
};