const mongoose = require('mongoose');

     const commentSchema = new mongoose.Schema({
         post: { type: mongoose.Schema.Types.ObjectId, ref: 'BlogPost', required: true },
         author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
         content: { type: String, required: true },
         date: { type: Date, default: Date.now }
     });

     module.exports = mongoose.model('Comment', commentSchema);