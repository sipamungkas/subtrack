import { Hono } from 'hono';
import { auth } from '../lib/auth';

const authRouter = new Hono();

// Better-auth handles all auth routes
authRouter.all('/*', (c) => auth.handler(c.req.raw));

export default authRouter;
