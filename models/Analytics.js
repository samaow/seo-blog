const mongoose = require('mongoose');

     const analyticsSchema = new mongoose.Schema({
         post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
         views: { type: Number, default: 0 },
         lastViewed: { type: Date, default: Date.now }
     });

     module.exports = mongoose.model('Analytics', analyticsSchema);