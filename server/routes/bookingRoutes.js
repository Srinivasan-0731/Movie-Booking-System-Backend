import express from 'express'
import { createBooking, getOccupiedSeats, verifyPayment } from '../controllers/bookingController.js';
import auth from '../middleware/auth.js';

const bookingRouter = express.Router();


bookingRouter.post('/create', auth, createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.post('/verify-payment', verifyPayment)

export default bookingRouter;