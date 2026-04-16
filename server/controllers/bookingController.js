import Booking from "../models/Booking.js";
import Show from "../models/Show.js"
import Razorpay from "razorpay"
import crypto from "crypto";

const checkSeatsAvailability = async (showId, selectedSeats) => {
    try {
        const showData = await Show.findById(showId)
        if (!showData) return false;

        const occupiedSeats = showData.occupiedSeats;
        const isAnySeatTaken = selectedSeats.some(seat => occupiedSeats[seat]);

        return !isAnySeatTaken;
    } catch (error) {
        console.log(error.message);
        return false;
    }
}

export const createBooking = async (req, res) => {
    try {
        // req.auth() → req.user.id
        const userId = req.user.id;
        const { showId, selectedSeats } = req.body;

        const isAvailable = await checkSeatsAvailability(showId, selectedSeats)

        if (!isAvailable) {
            return res.json({ success: false, message: "Selected Seats are not available." })
        }

        const showData = await Show.findById(showId).populate('movie');

        // userId → user
        const booking = await Booking.create({
            user: userId,
            show: showId,
            amount: showData.showPrice * selectedSeats.length,
            bookedSeats: selectedSeats,
        })

        selectedSeats.map((seat) => {
            showData.occupiedSeats[seat] = userId;
        })

        showData.markModified('occupiedSeats');
        await showData.save();

        const razorpayInstance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_SECRET_KEY
        })

        const order = await razorpayInstance.orders.create({
            amount: booking.amount * 100,
            currency: "INR",
            receipt: booking._id.toString(),
        });

        booking.paymentId = order.id;
        await booking.save();

        res.json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            bookingId: booking._id
        });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

export const getOccupiedSeats = async (req, res) => {
    try {
        const { showId } = req.params;
        const showData = await Show.findById(showId)

        const occupiedSeats = Object.keys(showData.occupiedSeats)

        res.json({ success: true, occupiedSeats })
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message })
    }
}

export const verifyPayment = async (req, res) => {
    const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        bookingId
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

        const showData = await Show.findById(booking.show);

        // userId → user
        booking.bookedSeats.forEach((seat) => {
            showData.occupiedSeats[seat] = booking.user;
        });

        showData.markModified("occupiedSeats");
        await showData.save();

        res.json({
            success: true,
            redirectUrl: "/loading/my-bookings"
        });
    } else {
        res.json({ success: false });
    }
};