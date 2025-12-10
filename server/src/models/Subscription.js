const mongoose = require('mongoose');

const subSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  stripeSubscriptionId: { type: String },
  status: { type: String },
  currentPeriodEnd: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Subscription', subSchema);
