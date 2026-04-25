const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn } = require("../middleware.js");
const bookingController = require("../controllers/bookings.js");

router.get("/my-bookings", isLoggedIn, wrapAsync(bookingController.myBookings));

router.get("/checkout", isLoggedIn, wrapAsync(bookingController.showCheckout));

router.post(
  "/process-payment",
  isLoggedIn,
  wrapAsync(bookingController.processPayment),
);

router.get(
  "/confirmation/:bookingId",
  isLoggedIn,
  wrapAsync(bookingController.showConfirmation),
);

router.delete(
  "/:bookingId",
  isLoggedIn,
  wrapAsync(bookingController.cancelBooking),
);

module.exports = router;
