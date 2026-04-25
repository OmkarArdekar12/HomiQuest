const Booking = require("../models/booking");
const Listing = require("../models/listing");
const crypto = require("crypto");

function generateOrderId() {
  return (
    "HomiQuest_OrderID_" +
    Date.now() +
    "_" +
    crypto.randomBytes(4).toString("hex").toUpperCase()
  );
}

function generateTransactionId() {
  return (
    "HomiQuest_TransactionID_" +
    crypto.randomBytes(8).toString("hex").toUpperCase()
  );
}

module.exports.showCheckout = async (req, res) => {
  const { listingId, checkIn, checkOut } = req.query;

  const listing = await Listing.findById(listingId);
  if (!listing) {
    req.flash("error", "Listing not found.");
    return res.redirect("/listings");
  }

  const ciDate = new Date(checkIn);
  const coDate = new Date(checkOut);

  if (coDate <= ciDate) {
    req.flash("error", "Check-out date must be after check-in date.");
    return res.redirect(`/listings/${listingId}`);
  }

  // const conflict = await Booking.findOne({
  //   listing: listingId,
  //   user: req.user._id,
  //   paymentStatus: "paid",
  //   checkIn: { $lt: coDate },
  //   checkOut: { $gt: ciDate },
  // });

  // if (conflict) {
  //   req.flash(
  //     "error",
  //     "You already have a booking for this property on those dates.",
  //   );
  //   return res.redirect(`/listings/${listingId}`);
  // }

  const conflict = await Booking.findOne({
    listing: listingId,
    paymentStatus: "paid",
    checkIn: { $lt: coDate },
    checkOut: { $gt: ciDate },
  });

  if (conflict) {
    if (conflict.user.equals(req.user._id)) {
      req.flash(
        "error",
        "You already have a booking for this property on these dates.",
      );
    } else {
      req.flash(
        "error",
        "This property is already booked for the selected dates.",
      );
    }
    return res.redirect(`/listings/${listingId}`);
  }

  const totalNights = Math.round((coDate - ciDate) / (1000 * 60 * 60 * 24));
  const totalPrice = totalNights * listing.price;

  const orderId = generateOrderId();

  const booking = new Booking({
    listing: listingId,
    user: req.user._id,
    checkIn: ciDate,
    checkOut: coDate,
    totalNights,
    totalPrice,
    orderId,
    paymentStatus: "pending",
  });

  await booking.save();

  res.render("bookings/checkout.ejs", {
    listing,
    booking,
    checkIn,
    checkOut,
    totalNights,
    totalPrice,
    orderId,
  });
};

module.exports.processPayment = async (req, res) => {
  const { orderId, paymentMethod, simulateFailure } = req.body;

  const booking = await Booking.findOne({
    orderId,
    user: req.user._id,
  });

  if (!booking) {
    req.flash("error", "Order not found. Please try again.");
    return res.redirect("/listings");
  }

  if (booking.paymentStatus === "paid") {
    req.flash("success", "This booking is already confirmed!");
    return res.redirect("/bookings/my-bookings");
  }

  if (simulateFailure === "true") {
    booking.paymentStatus = "failed";
    await booking.save();
    req.flash(
      "error",
      "Payment failed. Please check your details and try again.",
    );
    return res.redirect(`/listings/${booking.listing}`);
  }

  booking.transactionId = generateTransactionId();
  booking.paymentStatus = "paid";
  booking.paymentMethod = paymentMethod || "card";
  await booking.save();

  req.flash(
    "success",
    `Payment successful! Booking confirmed for ${booking.totalNights} night${booking.totalNights > 1 ? "s" : ""} — ₹${booking.totalPrice.toLocaleString("en-IN")}`,
  );
  res.redirect(`/bookings/confirmation/${booking._id}`);
};

module.exports.showConfirmation = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId).populate(
    "listing",
  );

  if (!booking || !booking.user.equals(req.user._id)) {
    req.flash("error", "Booking not found.");
    return res.redirect("/bookings/my-bookings");
  }

  res.render("bookings/confirmation.ejs", { booking });
};

module.exports.myBookings = async (req, res) => {
  const bookings = await Booking.find({
    user: req.user._id,
    paymentStatus: "paid",
  })
    .populate("listing")
    .sort({ createdAt: -1 });

  res.render("bookings/myBookings.ejs", { bookings });
};

module.exports.cancelBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.bookingId);

  if (!booking) {
    req.flash("error", "Booking not found.");
    return res.redirect("/bookings/my-bookings");
  }

  if (!booking.user.equals(req.user._id)) {
    req.flash("error", "You are not authorised to cancel this booking.");
    return res.redirect("/bookings/my-bookings");
  }

  if (new Date(booking.checkIn) <= new Date()) {
    req.flash("error", "Cannot cancel a booking that has already started.");
    return res.redirect("/bookings/my-bookings");
  }

  await Booking.findByIdAndDelete(req.params.bookingId);
  req.flash("success", "Booking cancelled successfully.");
  res.redirect("/bookings/my-bookings");
};
