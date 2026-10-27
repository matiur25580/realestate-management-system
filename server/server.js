const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
dotenv.config();
connectDB();
const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', require('./routes/otpAuth'));
app.use('/api/properties', require('./routes/property'));
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/maintenance', require('./routes/maintenance'));
app.use('/api/rents', require('./routes/rent'));
app.use('/api/reviews', require('./routes/review'));
app.use('/api/wishlist', require('./routes/wishlist'));
app.use('/api/leases', require('./routes/lease'));
app.use('/api/analytics', require('./routes/analytics'))
app.use('/api/users', require('./routes/users'))
app.use('/api/export', require('./routes/export'));
app.use('/api/notifications', require('./routes/notification'));
app.use('/api/commissions', require('./routes/commission'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/audit', require('./routes/audit'));
app.get('/', (req,res)=> res.send('RealEstate API Running'));
const PORT = process.env.PORT || 5000;
app.listen(PORT, ()=> console.log(`Server running on port ${PORT}`));
