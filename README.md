# Movie Booking Backend

Backend API for the **Movie Booking Application**.
This service handles movie data, show scheduling, bookings, payments, and user favorites.

Built with **Node.js, Express, MongoDB, and Clerk Authentication**.

---

# Features

* User authentication using **Clerk**
* Browse movies and shows
* Book movie tickets
* Secure payments (Stripe / Razorpay)
* Favorite movies system
* Admin dashboard APIs
* Email confirmation for bookings
* Webhooks for payment verification

---

# Tech Stack

* **Node.js**
* **Express.js**
* **MongoDB + Mongoose**
* **Clerk Authentication**
* **Stripe / Razorpay Payments**
* **Inngest (Background jobs)**
* **TMDB API (Movie Data)**

---

# Installation

### Clone repository

```bash
git clone https://github.com/yourusername/movie-booking-backend.git
```

### Go into project

```bash
cd movie-booking-backend
```

### Install dependencies

```bash
npm install
```

### Create `.env`

```
PORT=3000

MONGODB_URI=your_mongodb_connection

CLERK_SECRET_KEY=your_clerk_secret

TMDB_API_KEY=your_tmdb_api_key

STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret

RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

---

# Run Server

```bash
npm run dev
```

Server runs on:

```
http://localhost:3000
```

---

# API Endpoints

## User APIs

| Method | Endpoint                  | Description               |
| ------ | ------------------------- | ------------------------- |
| GET    | /api/user/bookings        | Get user bookings         |
| POST   | /api/user/update-favorite | Add/Remove favorite movie |
| GET    | /api/user/favorites       | Get favorite movies       |

---

## Show APIs

| Method | Endpoint      | Description      |
| ------ | ------------- | ---------------- |
| GET    | /api/show/all | Get all shows    |
| GET    | /api/show/:id | Get show details |

---

## Booking APIs

| Method | Endpoint            | Description       |
| ------ | ------------------- | ----------------- |
| POST   | /api/booking/create | Create booking    |
| GET    | /api/booking/user   | Get user bookings |

---

## Admin APIs

| Method | Endpoint            | Description        |
| ------ | ------------------- | ------------------ |
| GET    | /api/admin/bookings | Get all bookings   |
| POST   | /api/admin/add-show | Add new show       |
| GET    | /api/admin/is-admin | Check admin access |

---

# Payment Integration

Supports:

* **Stripe**
* **Razorpay**

Payment verification is handled using **webhooks**.

---

# Email Notifications

Booking confirmation emails are sent using **Inngest background jobs**.

User receives:

* Movie name
* Show date
* Show time
* Ticket confirmation

---

# Authentication

Authentication handled by **Clerk**.

Protected routes require:

```
Authorization: Bearer <token>
```

---

# Movie Data

Movies and cast information are fetched from:

**TMDB API**

https://www.themoviedb.org/

---

# Support

If you like this project:

 Star the repository
🍴 Fork it
🛠 Contribute improvements
