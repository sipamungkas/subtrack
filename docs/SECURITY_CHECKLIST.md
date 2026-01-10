# Security Checklist - SubTrack

A quick reference checklist for security improvements.

---

## Critical/High Priority

- [ ] **Rate Limiting**
  - [ ] Install `hono-rate-limiter` or similar
  - [ ] Apply global rate limit (100 req/15min)
  - [ ] Apply strict limit on `/api/auth/*` (10 req/15min)
  - [ ] Apply strict limit on `/api/telegram/verify` (5 req/min)

- [ ] **Security Headers**
  - [ ] Install and configure `hono/secure-headers`
  - [ ] Set `X-Frame-Options: DENY`
  - [ ] Set `X-Content-Type-Options: nosniff`
  - [ ] Set `Strict-Transport-Security` (when using HTTPS)
  - [ ] Set `Referrer-Policy: strict-origin-when-cross-origin`
  - [ ] Consider adding Content-Security-Policy

---

## Medium Priority

- [ ] **Telegram Verification Security**
  - [ ] Add shared secret between bot and API
  - [ ] Validate `X-Bot-Secret` header on `/api/telegram/verify`

- [ ] **Cryptographically Secure Verification Codes**
  - [ ] Replace `Math.random()` with `crypto.randomBytes()`
  - [ ] Consider increasing code length to 10-12 characters

- [ ] **Account Security**
  - [ ] Implement account lockout after 5-10 failed attempts
  - [ ] Add exponential backoff for login attempts
  - [ ] Consider implementing 2FA option

- [ ] **Currency API**
  - [ ] Evaluate alternatives that support HTTPS on free tier
  - [ ] If staying with Fixer, consider paid tier for HTTPS + header auth

---

## Low Priority

- [ ] **Input Validation**
  - [ ] Add max length to `notes` field (2000 chars suggested)
  - [ ] Add max length to `paymentMethod` field

- [ ] **Error Handling**
  - [ ] Sanitize Zod error messages in production
  - [ ] Don't expose `validation.error.errors` details in production

- [ ] **Password Policy**
  - [ ] Configure minimum password length (12+ characters)
  - [ ] Require complexity (numbers, special chars)

---

## Configuration

- [ ] **Environment Variables**
  - [ ] Verify `.env` is in `.gitignore`
  - [ ] Use strong `BETTER_AUTH_SECRET` (32+ random chars)
  - [ ] Enable SSL for database connection in production
  - [ ] Set `NODE_ENV=production` in production

- [ ] **Logging**
  - [ ] Change Better-Auth log level to `error` in production
  - [ ] Ensure sensitive data is not logged
  - [ ] Set up structured logging for security events

---

## Monitoring & Ongoing

- [ ] **Dependency Security**
  - [ ] Create package-lock.json files for npm audit
  - [ ] Set up automated vulnerability scanning (Snyk, GitHub Dependabot)
  - [ ] Schedule regular dependency updates

- [ ] **Security Monitoring**
  - [ ] Log authentication failures
  - [ ] Set up alerts for unusual patterns
  - [ ] Monitor for brute force attempts

- [ ] **Testing**
  - [ ] Add security tests for authorization
  - [ ] Test rate limiting when implemented
  - [ ] Consider penetration testing before production

---

## Implementation Priority

### Week 1
1. Rate limiting (all endpoints)
2. Security headers
3. Secure code generation

### Week 2
1. Telegram endpoint security
2. Account lockout mechanism
3. Error message sanitization

### Week 3
1. Password policy configuration
2. Input validation improvements
3. Production logging configuration

### Ongoing
- Dependency monitoring
- Security event logging
- Regular audits
