const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const ServiceProviderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String, required: true, index: true },
    password: { type: String, required: true },

    role: { type: String, default: "service" },

      resetToken: {
      type: String,
      default: null,
    },
    resetTokenExpiry: {
      type: Date,
      default: null,
    },

    serviceTypes: {
      type: [String],
      default: [],
    },

    /* =====================================================
       ⭐ REFERRAL INFORMATION
       ===================================================== */

    // 1️⃣ Human-readable referral name/email from registration form
   referralMarketingExecutiveName: {
  type: String,
  default: null,
},

referralMarketingExecutiveId: {
  type: String,
  default: null,
},
    // 2️⃣ Actual linked agent (for Admin Dashboard)
    referralAgent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Agent",
      default: null,
    },

    /* =====================================================
       DOCUMENTS
       ===================================================== */
    documents: {
      aadhar: { type: String, required: true },
      voterId: { type: String, required: true },
      pan: { type: String, default: null },
    },

    /* =====================================================
       SUBSCRIPTION / PAYMENT STATUS
       ===================================================== */
    subscription: {
      active: { type: Boolean, default: false },
      paidAt: { type: Date, default: null },
      razorpayOrderId: { type: String, default: null },
      razorpayPaymentId: { type: String, default: null },
    },

    status: {
      type: String,
      enum: ["pending_payment", "active", "blocked"],
      default: "pending_payment",
    },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);
  
/* =====================================================
   🔐 AUTO-HASH PASSWORD BEFORE SAVING USER
===================================================== */
ServiceProviderSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

module.exports = mongoose.model("ServiceProvider", ServiceProviderSchema);
