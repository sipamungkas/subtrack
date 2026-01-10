# Backend Tests

This directory contains comprehensive unit tests for the SubTrack backend.

## Test Structure

```
__tests__/
├── setup.ts              # Test setup and global mocks
├── mocks/                # Mock utilities
│   ├── db.ts            # Database mocks
│   └── context.ts       # Hono context mocks
├── validators/          # Validator tests
│   ├── subscription.test.ts
│   ├── user.test.ts
│   ├── telegram.test.ts
│   └── admin.test.ts
├── lib/                 # Library tests
│   └── telegram.test.ts
├── services/            # Service tests
│   └── notifications.test.ts
├── middleware/          # Middleware tests
│   └── auth.test.ts
├── routes/              # Route tests
│   └── subscriptions.test.ts
└── bot/                 # Bot tests
    └── commands.test.ts
```

## Running Tests

### Run all tests
```bash
bun test
```

### Run tests in watch mode
```bash
bun test:watch
```

### Run tests with UI
```bash
bun test:ui
```

### Run tests with coverage
```bash
bun test:coverage
```

## Test Coverage

The tests cover:

- ✅ **Validators**: All Zod schemas for request validation
- ✅ **Telegram Utilities**: Code generation, expiration, and message sending
- ✅ **Notification Service**: Subscription reminder logic
- ✅ **Auth Middleware**: Authentication and authorization
- ✅ **Subscription Routes**: CRUD operations with business logic
- ✅ **Bot Commands**: Telegram bot command handlers

## Writing Tests

### Example Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Function/Route Name', () => {
    it('should do something expected', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Mocking Database Calls

```typescript
const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([{ id: '1' }]),
};

vi.mock('../../db', () => ({
  db: mockDb,
}));
```

### Mocking External APIs

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
});
```

## Best Practices

1. **Isolate Tests**: Each test should be independent
2. **Clear Mocks**: Always clear mocks in `beforeEach`
3. **Test Edge Cases**: Include error handling and validation failures
4. **Descriptive Names**: Use clear, descriptive test names
5. **Arrange-Act-Assert**: Follow the AAA pattern
6. **Mock External Dependencies**: Don't rely on real database or APIs

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run tests
  run: bun test

- name: Generate coverage
  run: bun test:coverage
```
