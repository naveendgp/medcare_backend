// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

// Define Booking Schema
const BookingSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true },
    pickupLocation: { type: String },
    destination: { type: String },
    patientName: { type: String },
    patientContact: { type: String },
    bookingTime: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ["pending", "accepted", "in_progress", "completed", "cancelled"],
      default: "pending",
    },
    driverId: { type: String },
    ambulanceType: { type: String },
    emergencyLevel: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

const Booking = mongoose.model("Booking", BookingSchema);

// Routes
// Create booking
// Add this to your /api/bookings POST endpoint
app.post("/api/bookings", async (req, res) => {
  try {
    console.log("Received booking request:", req.body);

    // Validate required fields
    const { pickup, destination, priority, userEmail } = req.body;
    if (!pickup || !userEmail) {
      console.error("Missing required fields");
      return res.status(400).json({ error: "Missing required fields" });
    }

    const newBooking = new Booking(req.body);
    console.log("Created booking object:", newBooking);

    const savedBooking = await newBooking.save();
    console.log("Saved booking:", savedBooking);

    res.status(201).json(savedBooking);
  } catch (error) {
    console.error("Error creating booking:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update booking status
app.put("/api/bookings/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: status },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get pending bookings - move this BEFORE the :id route
app.get("/api/bookings/status/pending", async (req, res) => {
  try {
    const bookings = await Booking.find({ status: "pending" }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all bookings for a user
app.get("/api/bookings/user/:email", async (req, res) => {
  try {
    const bookings = await Booking.find({ userEmail: req.params.email }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get bookings for a specific driver
app.get("/api/bookings/driver/:driverId", async (req, res) => {
  try {
    const bookings = await Booking.find({
      driverId: req.params.driverId,
      status: { $in: ["accepted", "in_progress"] },
    }).sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get booking by ID - this should be AFTER all other /api/bookings/... routes
app.get("/api/bookings/:id", async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Accept a booking
app.put("/api/bookings/:id/accept", async (req, res) => {
  try {
    const { driverId } = req.body;
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "accepted", driverId: driverId },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Complete a booking
app.put("/api/bookings/:id/complete", async (req, res) => {
  try {
    const booking = await Booking.findByIdAndUpdate(
      req.params.id,
      { status: "completed" },
      { new: true }
    );
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
