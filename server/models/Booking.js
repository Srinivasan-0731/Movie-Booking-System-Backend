import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema({
    userId: {type: String, required: true},
    show: {type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Show'},
    amount: {type: Number, required: true},
    bookedSeats: {type: Array, required: true},
    isPaid: {type: Boolean, default: false},
    paymentId: {type: String},
},{timestamps: true})

const Booking = mongoose.model("Booking", bookingSchema)

export default Booking;