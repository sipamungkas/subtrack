# Subnudge

**Stay ahead of every subscription.**

A subscription tracking application with Telegram notifications. Track your recurring subscriptions, get reminded before renewal dates, and never miss a payment again.

🌐 **Website:** [subnudge.app](https://subnudge.app)

## Tech Stack

### Backend
- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/)
- **Notifications**: [grammY](https://grammy.dev/) (Telegram Bot)
- **Scheduler**: node-cron for daily notification jobs

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **State Management**: [TanStack Query](https://tanstack.com/query)
- **Routing**: [React Router v7](https://reactrouter.com/)
- **UI Components**: Radix UI primitives with shadcn-style components

## Prerequisites

- [Bun](https://bun.sh/) (v1.0 or later)
- [PostgreSQL](https://www.postgresql.org/) (v14 or later)
- Telegram Bot Token (from [@BotFather](https://t.me/botfather))

## Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd subnudge
```

### 2. Set up the Backend

```bash
cd backend

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
```

Edit `.env` with your configuration:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/subnudge
BETTER_AUTH_SECRET=your-secret-key-here
BETTER_AUTH_URL=http://localhost:3000
TELEGRAM_BOT_TOKEN=your-bot-token-from-botfather
TELEGRAM_BOT_USERNAME=SubnudgeBot
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173
ADMIN_EMAIL=admin@example.com
```

Run database migrations:

```bash
bun run db:migrate
```

Start the backend server:

```bash
bun run dev
```

The backend will be running at `http://localhost:3000`.

### 3. Set up the Frontend

Open a new terminal:

```bash
cd frontend

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env
```

Edit `.env` if needed:

```env
VITE_API_URL=http://localhost:3000
VITE_TELEGRAM_BOT_USERNAME=SubnudgeBot
```

Start the frontend development server:

```bash
bun run dev
```

The frontend will be running at `http://localhost:5173`.

## Development Scripts

### Backend

| Command | Description |
|---------|-------------|
| `bun run dev` | Start development server with hot reload |
| `bun run build` | Build for production |
| `bun run start` | Start production server |
| `bun run db:generate` | Generate Drizzle migrations |
| `bun run db:migrate` | Push migrations to database |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage report |

### Frontend

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite development server |
| `bun run build` | Build for production |
| `bun run preview` | Preview production build |
| `bun run lint` | Run ESLint |
| `bun run test` | Run tests once |
| `bun run test:watch` | Run tests in watch mode |
| `bun run test:coverage` | Run tests with coverage report |

## Project Structure

```
subnudge/
├── backend/
│   ├── src/
│   │   ├── db/           # Database schema and connection
│   │   ├── routes/       # API route handlers
│   │   ├── middleware/   # Hono middleware
│   │   ├── services/     # Business logic
│   │   ├── bot/          # Telegram bot setup
│   │   ├── lib/          # Utilities
│   │   └── index.ts      # Entry point
│   └── drizzle/          # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ui/       # Base UI components
│   │   │   └── layout/   # Layout components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities and API client
│   │   ├── types/        # TypeScript types
│   │   └── __tests__/    # Test files
│   └── public/           # Static assets
└── docs/                 # Documentation
```

## Features

- **User Authentication**: Register, login, and manage your account
- **Subscription Management**: Add, edit, and delete subscriptions
- **Renewal Reminders**: Get notified via Telegram before subscriptions renew
- **Customizable Reminders**: Set reminder days (1, 3, 7, 14, or 30 days before)
- **Multi-Currency Support**: Track subscriptions in different currencies
- **Admin Dashboard**: Manage users and view system statistics
- **Subscription Limits**: Admins can set subscription limits per user

## Setting Up Telegram Bot

1. Message [@BotFather](https://t.me/botfather) on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token to your `.env` file
4. Set the bot username (without @) in your `.env` file

Users can connect their Telegram account from the Profile page to receive notifications.

## Docker Deployment

See [DOCKER.md](backend/DOCKER.md) for Docker deployment instructions.

### Quick Start with Docker Compose

```bash
cd backend
cp .env.docker.example .env
# Edit .env with your values
docker compose up -d
docker compose exec backend bun run db:migrate
```

## Running Tests

Run all tests for both backend and frontend:

```bash
# Backend tests
cd backend && bun run test

# Frontend tests
cd frontend && bun run test
```

## License

MIT
