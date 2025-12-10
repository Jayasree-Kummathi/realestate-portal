const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const agentSchema = new mongoose.Schema({
  agentId: { type: String, unique: true },

  name: String,
  email: { type: String, required: true, unique: true },
  phone: String,
  password: { type: String, required: true },

  /* ================================
      PROFESSION SYSTEM
     ================================ */
  profession: String,
  customProfession: String,

  /* ================================
      DOCUMENTS
     ================================ */
  documents: {
    voterId: { type: String } // uploads/agent-docs/<file>
  },

  /* ================================
      MARKETING EXECUTIVE REFERRAL
     ================================ */
  referralMarketingExecutiveName: { type: String, default: null },
  referralMarketingExecutiveId: { type: String, default: null },

  /* ================================
      SUBSCRIPTION (RAZORPAY)
     ================================ */
  subscription: {
    active: { type: Boolean, default: false },
    paidAt: { type: Date },
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },

  /* ================================
      PASSWORD RESET (NEW ✅)
     ================================ */
  resetToken: { type: String },
  resetTokenExpiry: { type: Date },

  createdAt: { type: Date, default: Date.now },
});

/* ===== Password Hashing ===== */
agentSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

/* ===== Compare Password ===== */
agentSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Agent", agentSchema);
