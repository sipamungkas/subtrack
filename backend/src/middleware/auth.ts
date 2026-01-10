import { Context, Next } from 'hono';
import { auth } from '../lib/auth';

export const requireAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  c.set('user', session.user);
  c.set('session', session.session);
  await next();
};

export const requireAdmin = async (c: Context, next: Next) => {
  const authResult = await requireAuth(c, async () => {});

  // If requireAuth returned a response (unauthorized), return it
  if (authResult) {
    return authResult;
  }

  const user = c.get('user');

  if (!user || user.role !== 'admin') {
    return c.json({ error: 'FORBIDDEN', message: 'Admin access required' }, 403);
  }

  await next();
};
