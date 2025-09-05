import { Router, RequestHandler } from 'express';
import { Session, CreateSessionDto } from '../types/session';

const router: Router = Router();

// Store sessions in memory (replace with database in production)
const sessions: Session[] = [];

// Create a new session with specified agent
const createSession: RequestHandler = (req, res) => {
  const { agentId } = req.body as CreateSessionDto;

  if (!agentId) {
    res.status(400).json({ error: 'Agent ID is required' });
    return;
  }

  const newSession: Session = {
    id: Math.random().toString(36).substring(7),
    agentId,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [],
  };

  sessions.push(newSession);
  res.status(201).json(newSession);
};

// Get all sessions for a specific agent
const getSessions: RequestHandler = (req, res) => {
  const { agentId } = req.query;

  if (agentId) {
    const agentSessions = sessions.filter(
      session => session.agentId === agentId,
    );
    res.json(agentSessions);
    return;
  }

  res.json(sessions);
};

// Get a specific session
const getSession: RequestHandler = (req, res) => {
  const session = sessions.find(s => s.id === req.params.sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  res.json(session);
};

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId', getSession);

export default router;
