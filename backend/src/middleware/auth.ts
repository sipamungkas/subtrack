import { Context, Next } from 'hono';
import { auth } from '../lib/auth';
import { db } from '../db';
import { users } from '../db/schema';
import { eq } from 'drizzle-orm';

export const requireAuth = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  const [dbUser] = await db
    .select({ preferredCurrency: users.preferredCurrency })
    .from(users)
    .where(eq(users.id, session.user.id));

  c.set('user', { ...session.user, preferredCurrency: dbUser?.preferredCurrency || 'USD' });
  c.set('session', session.session);
  await next();
};

export const requireAdmin = async (c: Context, next: Next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    return c.json({ error: 'UNAUTHORIZED', message: 'Authentication required' }, 401);
  }

  // Fetch user from database to get the role (session might not include it)
  const [dbUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, session.user.id));

  if (!dbUser || dbUser.role !== 'admin') {
    return c.json({ error: 'FORBIDDEN', message: 'Admin access required' }, 403);
  }

  // Set user with role from database
  c.set('user', { ...session.user, role: dbUser.role });
  c.set('session', session.session);
  await next();
};
