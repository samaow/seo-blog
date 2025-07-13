const express = require('express');
     const BlogPost = require('../models/BlogPost');
     const natural = require('natural');
     const readabilityScores = require('readability-scores');
     const User = require('../models/User');
     const Comment = require('../models/Comment');
     const Analytics = require('../models/Analytics');
     const Subscription = require('../models/Subscription');
     const NodeCache = require('node-cache');
     const cache = new NodeCache({ stdTTL: 3600 }); // Cache for 1 hour

     const router = express.Router();

     router.get('/', async (req, res) => {
         try {
             let posts = [];
             const searchTerm = req.query.search || '';
             if (searchTerm) {
                 posts = await BlogPost.find({
                     $or: [
                         { title: { $regex: searchTerm.toLowerCase(), $options: 'i' } },
                         { content: { $regex: searchTerm.toLowerCase(), $options: 'i' } }
                     ]
                 }).populate('author', 'username');
             } else {
                 posts = await BlogPost.find().populate('author', 'username');
             }
             res.render('index', { posts, user: req.user, searchTerm });
         } catch (err) {
             res.status(500).send('Server Error');
         }
     });

     router.get('/:slug', async (req, res) => {
         try {
             const cacheKey = `post_${req.params.slug}`;
             const cached = cache.get(cacheKey);
             if (cached) {
                 console.log(`Serving ${req.params.slug} from cache`);
                 return res.render('post', cached);
             }

             const post = await BlogPost.findOne({ slug: req.params.slug }).populate('author', 'username');
             if (!post) return res.status(404).send('Post not found');
             const comments = await Comment.find({ post: post._id }).populate('author', 'username');

             let analytics = await Analytics.findOne({ post: post._id });
             if (!analytics) {
                 analytics = new Analytics({ post: post._id });
             }
             analytics.views += 1;
             analytics.lastViewed = new Date();
             await analytics.save();
             console.log(`Post ${post.title} viewed ${analytics.views} times`);

             const renderData = { post, user: req.user, comments };
             cache.set(cacheKey, renderData);
             res.render('post', renderData);
         } catch (err) {
             res.status(500).send('Server Error');
         }
     });

     router.get('/new', (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         res.render('new', { user: req.user });
     });

     router.get('/edit/:slug', async (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         try {
             const post = await BlogPost.findOne({ slug: req.params.slug }).populate('author', 'username');
             if (!post || post.author.toString() !== req.user._id.toString()) return res.status(403).send('Unauthorized');
             res.render('edit', { post, user: req.user });
         } catch (err) {
             res.status(500).send('Server Error');
         }
     });

     router.post('/', async (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         const { title, content, metaTitle, metaDescription, keywords, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage } = req.body;
         try {
             console.log('Before save - Post data:', { title, content, author: req.user._id });
             const post = new BlogPost({
                 title,
                 content,
                 author: req.user._id,
                 metaTitle,
                 metaDescription,
                 keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
                 ogTitle,
                 ogDescription,
                 ogImage,
                 twitterTitle,
                 twitterDescription,
                 twitterImage
             });

             const tokenizer = new natural.WordTokenizer();
             const words = tokenizer.tokenize(content.toLowerCase());
             const wordFreq = {};
             words.forEach(word => {
                 if (word.length > 3) wordFreq[word] = (wordFreq[word] || 0) + 1;
             });
             const totalWords = words.length;
             post.keywordDensity = Object.entries(wordFreq).map(([word, freq]) => ({
                 word,
                 density: (freq / totalWords * 100).toFixed(2)
             })).sort((a, b) => b.density - a.density).slice(0, 5);

             const scores = readabilityScores(content);
             post.readabilityScore = scores.fleschKincaidGradeLevel || 'N/A';

             await post.save();
             console.log('After save - Post slug:', post.slug);

             await User.findByIdAndUpdate(req.user._id, { lastPostSlug: post.slug });
             cache.flushAll(); // Clear cache when a new post is created

             res.redirect(`/blog/${post.slug}`);
         } catch (err) {
             console.error('Error creating post:', err);
             res.status(400).send('Error creating post');
         }
     });

     router.post('/edit/:slug', async (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         try {
             const post = await BlogPost.findOne({ slug: req.params.slug });
             if (!post || post.author.toString() !== req.user._id.toString()) return res.status(403).send('Unauthorized');
             const { title, content, metaTitle, metaDescription, keywords, ogTitle, ogDescription, ogImage, twitterTitle, twitterDescription, twitterImage } = req.body;
             post.title = title;
             post.content = content;
             post.metaTitle = metaTitle;
             post.metaDescription = metaDescription;
             post.keywords = keywords ? keywords.split(',').map(k => k.trim()) : [];
             post.ogTitle = ogTitle;
             post.ogDescription = ogDescription;
             post.ogImage = ogImage;
             post.twitterTitle = twitterTitle;
             post.twitterDescription = twitterDescription;
             post.twitterImage = twitterImage;

             const tokenizer = new natural.WordTokenizer();
             const words = tokenizer.tokenize(content.toLowerCase());
             const wordFreq = {};
             words.forEach(word => {
                 if (word.length > 3) wordFreq[word] = (wordFreq[word] || 0) + 1;
             });
             const totalWords = words.length;
             post.keywordDensity = Object.entries(wordFreq).map(([word, freq]) => ({
                 word,
                 density: (freq / totalWords * 100).toFixed(2)
             })).sort((a, b) => b.density - a.density).slice(0, 5);

             const scores = readabilityScores(content);
             post.readabilityScore = scores.fleschKincaidGradeLevel || 'N/A';

             await post.save();

             await User.findByIdAndUpdate(req.user._id, { lastPostSlug: post.slug });
             cache.del(`post_${post.slug}`); // Clear cache for edited post

             res.redirect(`/blog/${post.slug}`);
         } catch (err) {
             res.status(400).send('Error updating post');
         }
     });

     router.post('/delete/:slug', async (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         try {
             const post = await BlogPost.findOne({ slug: req.params.slug });
             if (!post || post.author.toString() !== req.user._id.toString()) return res.status(403).send('Unauthorized');
             await post.deleteOne();
             cache.del(`post_${post.slug}`); // Clear cache for deleted post
             res.redirect('/');
         } catch (err) {
             res.status(500).send('Error deleting post');
         }
     });

     router.post('/:slug/comments', async (req, res) => {
         if (!req.isAuthenticated()) return res.redirect('/auth/login');
         try {
             const post = await BlogPost.findOne({ slug: req.params.slug });
             if (!post) return res.status(404).send('Post not found');
             const { content } = req.body;
             const comment = new Comment({
                 post: post._id,
                 author: req.user._id,
                 content
             });
             await comment.save();
             cache.del(`post_${post.slug}`); // Clear cache when a comment is added
             res.redirect(`/blog/${post.slug}`);
         } catch (err) {
             res.status(400).send('Error adding comment');
         }
     });

     router.post('/subscribe', async (req, res) => {
         try {
             const { email } = req.body;
             const subscription = new Subscription({ email });
             await subscription.save();
             res.send('Subscribed successfully!');
         } catch (err) {
             res.status(400).send('Error subscribing');
         }
     });

     router.get('/sitemap.xml', async (req, res) => {
         try {
             const posts = await BlogPost.find();
             let sitemap = '<?xml version="1.0" encoding="UTF-8"?>';
             sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
             sitemap += '<url><loc>https://solid-umbrella-g4qx796vrgvv29r5g.github.dev/</loc><lastmod>' + new Date().toISOString().split('T')[0] + '</lastmod><priority>1.0</priority></url>';
             posts.forEach(post => {
                 sitemap += '<url>';
                 sitemap += '<loc>https://solid-umbrella-g4qx796vrgvv29r5g.github.dev/blog/' + post.slug + '</loc>';
                 sitemap += '<lastmod>' + post.date.toISOString().split('T')[0] + '</lastmod>';
                 sitemap += '<priority>0.8</priority>';
                 sitemap += '</url>';
             });
             sitemap += '</urlset>';
             res.header('Content-Type', 'application/xml');
             res.send(sitemap);
         } catch (err) {
             res.status(500).send('Error generating sitemap');
         }
     });

     module.exports = router;