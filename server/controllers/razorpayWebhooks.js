import crypto from "crypto";
import Booking from "../models/Booking.js";
import { inngest } from "../inngest/index.js";

export const razorpayWebhooks = async (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  const razorpaySignature = req.headers["x-razorpay-signature"];

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (expectedSignature !== razorpaySignature) {
    return res.status(400).json({
      success: false,
      message: "Invalid webhook signature",
    });
  }

  const event = req.body.event;

  try {

    if (event === "payment.captured") {

      const payment = req.body.payload.payment.entity;

      const bookingId = payment.notes.bookingId;

      await Booking.findByIdAndUpdate(bookingId, {
        isPaid: true,
        paymentLink: ""
      });

      // Send confirmation event
      await inngest.send({
        name: "app/show.booked",
        data: { bookingId }
      });

    }

    res.json({ received: true });

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).send("Server Error");
  }
};