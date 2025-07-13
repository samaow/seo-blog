const mongoose = require('mongoose');
     const slugify = require('slugify');

     const blogPostSchema = new mongoose.Schema({
         title: { type: String, required: true },
         content: { type: String, required: true },
         slug: { type: String, unique: true },
         author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
         date: { type: Date, default: Date.now },
         metaTitle: { type: String },
         metaDescription: { type: String },
         keywords: [String],
         ogTitle: { type: String },
         ogDescription: { type: String },
         ogImage: { type: String },
         twitterTitle: { type: String },
         twitterDescription: { type: String },
         twitterImage: { type: String },
         keywordDensity: [{ word: String, density: Number }],
         readabilityScore: String,
         views: { type: Number, default: 0 } // Add views field
     });

     blogPostSchema.pre('save', function (next) {
         if (this.title && !this.slug) {
             this.slug = slugify(this.title, { lower: true, strict: true });
         }
         this.ogTitle = this.ogTitle || this.metaTitle || this.title;
         this.ogDescription = this.ogDescription || this.metaDescription || this.content.substring(0, 200);
         this.twitterTitle = this.twitterTitle || this.ogTitle;
         this.twitterDescription = this.twitterDescription || this.ogDescription;
         this.twitterImage = this.twitterImage || this.ogImage;
         next();
     });

     module.exports = mongoose.model('BlogPost', blogPostSchema);