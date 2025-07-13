const express = require('express');
     const mongoose = require('mongoose');
     const passport = require('passport');
     const session = require('express-session');
     const MongoDBStore = require('connect-mongodb-session')(session);
     const blogRoutes = require('./routes/blog');
     const authRoutes = require('./routes/auth');

     const app = express();

     // View engine setup
     app.set('view engine', 'ejs');
     app.set('views', __dirname + '/views');

     // Middleware
     app.use(express.urlencoded({ extended: true }));
     app.use(express.json());
     app.use(express.static('public'));
     app.use(session({
         secret: 'your-secret-key',
         resave: false,
         saveUninitialized: false,
         store: new MongoDBStore({
             uri: 'mongodb+srv://massimbajose:LC6QclbVPJstZDkK@cluster0.e2m4vdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
             collection: 'sessions'
         })
     }));
     require('./config/passport'); // à placer AVANT app.use(passport.initialize())
     app.use(passport.initialize());
     app.use(passport.session());

     // Routes
     app.get('/', async (req, res) => {
         const BlogPost = require('./models/BlogPost');
         try {
             const posts = await BlogPost.find().populate('author', 'username');
             res.render('index', { posts, user: req.user, searchTerm: '' });
         } catch (err) {
             console.error('Erreur sur la page d\'accueil :', err); // Ajouté pour debug
             res.status(500).send('Server Error');
         }
     });
     app.use('/blog', blogRoutes);
     app.use('/auth', authRoutes);

     // Catch-all for sitemap
     app.get('/sitemap.xml', (req, res) => {
         res.redirect('/blog/sitemap.xml');
     });

     // MongoDB Connection
      // MongoDB Connection
     mongoose.connect('mongodb+srv://massimbajose:LC6QclbVPJstZDkK@cluster0.e2m4vdy.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', { useNewUrlParser: true, useUnifiedTopology: true })
         .then(() => console.log('Connected to MongoDB'))
         .catch(err => console.error('MongoDB connection error:', err));

     // Start Server
     const PORT = process.env.PORT || 3000;
     app.listen(PORT, () => {
         console.log(`Server running on port ${PORT}`);
     });