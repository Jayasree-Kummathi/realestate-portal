
require("dotenv").config();
const app = require("./app"); // your express app
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User"); // Admin model

const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/realestate";
console.log("👉 Running server from:", __dirname);

async function start() {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✔ MongoDB connected");

    // Create default admin if not exists
    await createDefaultAdmin();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

async function createDefaultAdmin() {
  try {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) {
      console.warn("ADMIN_EMAIL or ADMIN_PASSWORD not set in .env — skipping default admin creation.");
      return;
    }

    const existing = await User.findOne({ email });
    if (existing) {
      console.log("✔ Default admin already exists:", email);
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const admin = new User({
      name: "Portal Admin",
      email,
      password: hashed,
      role: "admin",
    });

    await admin.save();
    console.log("✔ Default admin created:", email);
  } catch (err) {
    console.error("Failed to create default admin:", err);
  }
}

start();
