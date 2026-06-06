const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

const marketRoutes = require('./routes/market');
app.use('/market', marketRoutes);

const portfolioRoutes = require('./routes/portfolio');
app.use('/portfolio', portfolioRoutes);

const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

const friendsRoutes = require('./routes/friends');
app.use('/friends', friendsRoutes);

const questsRoutes = require('./routes/quests');
app.use('/quests', questsRoutes);

const notificationsRoutes = require('./routes/notifications');
app.use('/notifications', notificationsRoutes);

const watchlistRoutes = require('./routes/watchlist');
app.use('/watchlist', watchlistRoutes);

// Test endpoint
app.get('/', (req, res) => {
    res.json({ message: 'Finly backend çalışıyor!' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
});