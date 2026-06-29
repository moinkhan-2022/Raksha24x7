import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Raksha 24x7 API is healthy'
  });
});

export default router;
