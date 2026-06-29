import express from 'express';
import cors from 'cors';
import healthRoute from './routes/health.route.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Raksha 24x7 backend running' });
});

app.use('/api/health', healthRoute);

export default app;
