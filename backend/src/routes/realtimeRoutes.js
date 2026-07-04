import express from 'express';
import { verifyToken } from '../utils/jwt.js';
import User from '../models/User.js';
import { addRealtimeClient } from '../utils/realtime.js';

const router = express.Router();

router.get('/events', async (req, res) => {
  try {
    const token = req.query.token;
    if (!token) return res.status(401).end();

    const decoded = verifyToken(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(decoded.id).select('_id roles isActive');
    if (!user || !user.isActive) return res.status(401).end();

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    res.write(`event: connected\ndata: ${JSON.stringify({ userId: user._id, roles: user.roles })}\n\n`);
    addRealtimeClient(user._id, res);

    const heartbeat = setInterval(() => {
      res.write(`event: heartbeat\ndata: ${JSON.stringify({ at: new Date().toISOString() })}\n\n`);
    }, 25000);

    res.on('close', () => clearInterval(heartbeat));
  } catch {
    res.status(401).end();
  }
});

export default router;
