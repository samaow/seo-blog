const mongoose = require('mongoose');

     const subscriptionSchema = new mongoose.Schema({
         email: { type: String, required: true, unique: true },
         date: { type: Date, default: Date.now }
     });

     module.exports = mongoose.model('Subscription', subscriptionSchema);