import express from 'express';
import {
  createBooking,
  getOccupiedSeats,
  verifyPayment,
  cancelBooking,
  payNow,
} from '../controllers/bookingController.js';
import auth from '../middleware/auth.js';

const bookingRouter = express.Router();

bookingRouter.post('/create', auth, createBooking);
bookingRouter.post('/pay-now', auth, payNow);          
bookingRouter.get('/seats/:showId', getOccupiedSeats);
bookingRouter.post('/verify-payment', verifyPayment);
bookingRouter.delete('/cancel/:bookingId', auth, cancelBooking);

export default bookingRouter;