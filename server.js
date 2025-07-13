const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
const path = require('path');
require('dotenv').config();
require('./config/passport');

const app = express();
const PORT = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));

const authRoutes = require('./routes/auth');
const blogRoutes = require('./routes/blog');
app.use('/auth', authRoutes);
app.use('/blog', blogRoutes);

app.get('/', async (req, res) => {
    const BlogPost = require('./models/BlogPost');
    try {
        const posts = await BlogPost.find().populate('author', 'username');
        res.render('index', { posts, user: req.user, searchTerm: '' }); // Ajoutez searchTerm ici
    } catch (err) {
        res.status(500).send('Server Error');
    }
});

// XML Sitemap Route
app.get('/sitemap.xml', async (req, res) => {
    const BlogPost = require('./models/BlogPost');
    try {
        const posts = await BlogPost.find();
        let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
        sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
        sitemap += '    <url>\n';
        sitemap += `        <loc>https://yourdomain.com/</loc>\n`;
        sitemap += `        <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n`;
        sitemap += '        <priority>1.0</priority>\n';
        sitemap += '    </url>\n';
        posts.forEach(post => {
            sitemap += '    <url>\n';
            sitemap += `        <loc>https://yourdomain.com/blog/${post.slug}</loc>\n`;
            sitemap += `        <lastmod>${post.date.toISOString().split('T')[0]}</lastmod>\n`;
            sitemap += '        <priority>0.8</priority>\n';
            sitemap += '    </url>\n';
        });
        sitemap += '</urlset>';
        res.header('Content-Type', 'application/xml');
        res.send(sitemap);
    } catch (err) {
        res.status(500).send('Error generating sitemap');
    }
});
require('./build');
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));