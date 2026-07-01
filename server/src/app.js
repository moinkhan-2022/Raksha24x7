import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import healthRoute from './routes/health.route.js';
import authRoute from './routes/auth.route.js';
import profileRoute from './routes/profile.route.js';
import sosRoute from './routes/sos.route.js';
import locationRoutes from './routes/location.route.js';

const app = express();
app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '5mb' }));

app.get('/', (req, res) => res.json({ message: 'Raksha 24x7 backend running' }));
app.use('/api/health', healthRoute);
app.use('/api/auth', authRoute);
app.use('/api', profileRoute);
app.use('/api/sos', sosRoute);
app.use('/api/location', locationRoutes);

export default app;
