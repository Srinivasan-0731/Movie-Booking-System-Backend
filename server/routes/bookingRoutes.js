import express from 'express'
import { createBooking, getOccupiedSeats, verifyPayment } from '../controllers/bookingController.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.post('/verify-payment', verifyPayment)

export default bookingRouter;