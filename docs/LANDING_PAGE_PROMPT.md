# Subnudge Landing Page - Astro Development Prompt

This document contains the complete specification for building the Subnudge landing page using Astro.

## Brand Identity

| Property | Value |
|----------|-------|
| **Name** | Subnudge |
| **Tagline** | "Stay ahead of every subscription." |
| **Website** | subnudge.app |
| **Logo** | `/subnudge-icon.webp` |

---

## Color Palette (Dark Mode Only)

### Core Colors

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| Background | `#090909` | `oklch(0.145 0 0)` | Deep dark page background |
| Foreground | `#fbfbfb` | `oklch(0.985 0 0)` | Main text (off-white) |
| Primary | `#00ff8e` | `oklch(0.87 0.29 142)` | Vibrant emerald green - brand color |
| Primary Foreground | `#090909` | `oklch(0.145 0 0)` | Text on primary buttons |

### UI Colors

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| Secondary | `#262626` | `oklch(0.269 0 0)` | Secondary elements |
| Accent | `#262626` | `oklch(0.269 0 0)` | Hover states |
| Card | `#171717` | `oklch(0.18 0 0)` | Card backgrounds |
| Muted | `#262626` | `oklch(0.269 0 0)` | Muted backgrounds |
| Muted Foreground | `#a3a3a3` | `oklch(0.708 0 0)` | De-emphasized text |
| Border | `#2e2e2e` | `oklch(0.3 0 0)` | Borders |

### Status Colors

| Token | Hex | OKLCH | Usage |
|-------|-----|-------|-------|
| Destructive | `#ef4444` | `oklch(0.6 0.2 25)` | Errors, delete actions |
| Success | `#22c55e` | `oklch(0.7 0.18 145)` | Success states |
| Warning | `#eab308` | `oklch(0.8 0.18 85)` | Warnings |

### Brand Gradient

```css
/* Gradient for headings and accents */
background: linear-gradient(to right, #00ff8e, #34d399, #14b8a6);
/* Tailwind: from-[#00ff8e] via-emerald-400 to-teal-500 */
```

---

## Typography

| Property | Value |
|----------|-------|
| **Primary Font** | Inter (with system sans-serif fallbacks) |
| **Headings** | `font-semibold`, `tracking-tight` |
| **Monospace** | System monospace for currency codes |
| **Font Features** | `font-feature-settings: "rlig" 1, "calt" 1` |

---

## Design System

### Glassmorphism

```css
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.75rem;
}
```

### Card Hover Effect

```css
.card-hover {
  transition: all 0.3s ease;
}
.card-hover:hover {
  box-shadow: 0 10px 15px -3px rgba(0, 255, 142, 0.1);
  transform: translateY(-4px);
}
```

### Primary Button

```css
.btn-primary {
  background-color: #00ff8e;
  color: #090909;
  font-weight: 600;
  padding: 0.75rem 1.5rem;
  border-radius: 0.5rem;
  box-shadow: 0 10px 15px -3px rgba(0, 255, 142, 0.25);
  transition: transform 0.2s ease;
}
.btn-primary:hover {
  transform: translateY(-2px);
}
```

### Gradient Text

```css
.gradient-text {
  background: linear-gradient(to right, #00ff8e, #34d399, #14b8a6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Animations

```css
@keyframes fade-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes slide-in-right {
  from { opacity: 0; transform: translateX(20px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

---

## Key Features to Highlight

### 1. Subscription Tracking

- Add, edit, and manage all subscriptions in one dashboard
- Track service name, cost, billing cycle, payment method, and account
- Visual cards with renewal countdown badges (color-coded by urgency)

### 2. Smart Renewal Reminders

- Telegram bot notifications before renewals
- Customizable reminder timing: 1, 3, 7, 14, or 30 days before
- Never miss a renewal or get surprised by charges

### 3. Multi-Currency Support

- Track subscriptions in any currency (USD, EUR, IDR, etc.)
- Automatic conversion to USD for unified spending view
- Cost breakdown by currency with real-time exchange rates

### 4. Dashboard Analytics

- Total active subscriptions count
- Monthly spending (USD equivalent)
- Yearly cost projections
- Upcoming renewals in next 30 days
- Cost breakdown by currency visualization

### 5. Privacy Features

- Email masking toggle in subscription list
- Secure authentication with email verification
- Password reset functionality

### 6. Billing Cycle Support

- Monthly, Quarterly, Yearly, or Custom billing cycles
- Automatic renewal date calculation and tracking

---

## Landing Page Structure

### Section 1: Hero

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     [Logo]  Subnudge                                        │
│                                                             │
│     Stay ahead of every                                     │
│     subscription.                    [Dashboard Mockup]     │
│                                      with glassmorphism     │
│     Track renewals, get Telegram                            │
│     reminders, and never get                                │
│     surprised by charges again.                             │
│                                                             │
│     [Get Started Free]  [Learn More]                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Elements:**
- Gradient headline using brand gradient
- Subheadline in muted foreground
- Primary CTA button with glow effect
- Dashboard mockup with glass effect overlay

### Section 2: Problem Statement

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Subscription chaos is real.                             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │
│  │ Forgotten │  │ Surprise │  │ Scattered │                  │
│  │ Renewals  │  │ Charges  │  │ Accounts  │                  │
│  └──────────┘  └──────────┘  └──────────┘                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Pain Points to Address:**
- Forgotten renewal dates leading to service interruptions
- Unexpected charges hitting your bank account
- Subscriptions scattered across multiple accounts/emails

### Section 3: Features Grid

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Everything you need to                                  │
│     manage subscriptions                                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 🔔          │  │ 💰          │  │ 📊          │         │
│  │ Smart       │  │ Multi-      │  │ Dashboard   │         │
│  │ Reminders   │  │ Currency    │  │ Analytics   │         │
│  │             │  │             │  │             │         │
│  │ Get Telegram│  │ Track in    │  │ See monthly │         │
│  │ alerts      │  │ any currency│  │ & yearly    │         │
│  │ before      │  │ with auto   │  │ spending    │         │
│  │ renewals    │  │ conversion  │  │ at a glance │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ 📱          │  │ 🔒          │  │ ⚡          │         │
│  │ Telegram    │  │ Privacy     │  │ Quick       │         │
│  │ Integration │  │ First       │  │ Setup       │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Feature Cards:**
| Icon | Title | Description |
|------|-------|-------------|
| Bell | Smart Reminders | Get notified 1, 3, 7, 14, or 30 days before any renewal |
| Coins | Multi-Currency | Track subscriptions in USD, EUR, IDR, and more with auto-conversion |
| TrendingUp | Dashboard Analytics | See your total monthly and yearly spending at a glance |
| Send | Telegram Integration | Receive notifications directly in Telegram |
| Shield | Privacy First | Email masking and secure authentication |
| Zap | Quick Setup | Add subscriptions in seconds, connect Telegram in one click |

### Section 4: How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Get started in 3 simple steps                           │
│                                                             │
│     ①                    ②                    ③             │
│  Add your            Connect             Get reminded       │
│  subscriptions       Telegram            before renewals    │
│                                                             │
│  Enter service       Link your           Receive timely     │
│  name, cost,         Telegram account    notifications      │
│  and renewal date    with one click      before charges     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 5: Dashboard Preview

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Your subscriptions, beautifully organized               │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                                                       │  │
│  │   [Full Dashboard Screenshot/Mockup]                  │  │
│  │                                                       │  │
│  │   - Stats cards showing totals                        │  │
│  │   - Subscription cards with renewal badges            │  │
│  │   - Currency breakdown section                        │  │
│  │                                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Highlights to call out:**
- Stats cards: Total Subscriptions, Monthly Cost, Yearly Cost, Upcoming Renewals
- Subscription cards with color-coded renewal badges
- Cost breakdown by currency (if multiple currencies)

### Section 6: Telegram Integration

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Never miss a renewal with Telegram                      │
│                                                             │
│     ┌─────────────────────────┐                             │
│     │ 🤖 SubnudgeBot          │                             │
│     │                         │                             │
│     │ ⏰ Subscription Reminder │                             │
│     │                         │                             │
│     │ Netflix renews in 3 days│                             │
│     │ Cost: $15.99/monthly    │                             │
│     │ Payment: Visa ****1234  │                             │
│     │                         │                             │
│     │ Don't forget to check   │                             │
│     │ your account!           │                             │
│     └─────────────────────────┘                             │
│                                                             │
│     [Connect Telegram]                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 7: Final CTA

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│     Ready to take control of                                │
│     your subscriptions?                                     │
│                                                             │
│     Join users who never miss a renewal.                    │
│                                                             │
│     [Start Tracking Free]                                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Section 8: Footer

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  [Logo] Subnudge                                            │
│  Stay ahead of every subscription.                          │
│                                                             │
│  © 2025 Subnudge. All rights reserved.                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Requirements

### Astro Configuration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';

export default defineConfig({
  integrations: [tailwind()],
  output: 'static',
});
```

### Dependencies

```json
{
  "dependencies": {
    "astro": "^4.x",
    "@astrojs/tailwind": "^5.x"
  },
  "devDependencies": {
    "tailwindcss": "^4.x",
    "lucide-astro": "latest",
    "@fontsource/inter": "latest"
  }
}
```

### Recommended Components

| Component | Purpose |
|-----------|---------|
| `Hero.astro` | Hero section with headline, CTA, and mockup |
| `FeatureCard.astro` | Reusable feature card with icon, title, description |
| `StepCard.astro` | How it works step card |
| `DashboardPreview.astro` | Screenshot/mockup section |
| `TelegramPreview.astro` | Telegram notification mockup |
| `Footer.astro` | Site footer |

### Icons (Lucide)

```javascript
// Icons to import from lucide-astro
import {
  CreditCard,
  Bell,
  Calendar,
  DollarSign,
  TrendingUp,
  Coins,
  Send,
  Shield,
  Zap,
  Check,
  ArrowRight,
} from 'lucide-astro';
```

---

## Tailwind CSS Configuration

```javascript
// tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        background: '#090909',
        foreground: '#fbfbfb',
        primary: {
          DEFAULT: '#00ff8e',
          foreground: '#090909',
        },
        secondary: '#262626',
        accent: '#262626',
        card: '#171717',
        muted: {
          DEFAULT: '#262626',
          foreground: '#a3a3a3',
        },
        border: '#2e2e2e',
        destructive: '#ef4444',
        success: '#22c55e',
        warning: '#eab308',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
```

---

## Assets Checklist

- [ ] Logo: `/subnudge-icon.webp` (high-res, transparent background)
- [ ] Dashboard screenshot or mockup
- [ ] Telegram notification mockup
- [ ] Open Graph image (1200x630px) for social sharing
- [ ] Favicon

---

## SEO & Meta Tags

```html
<title>Subnudge - Stay ahead of every subscription</title>
<meta name="description" content="Track your subscriptions, get Telegram reminders before renewals, and never get surprised by charges again. Free subscription tracking app." />
<meta name="keywords" content="subscription tracker, subscription management, renewal reminders, telegram notifications, budget tracking" />

<!-- Open Graph -->
<meta property="og:title" content="Subnudge - Stay ahead of every subscription" />
<meta property="og:description" content="Track renewals, get Telegram reminders, and never get surprised by charges again." />
<meta property="og:image" content="/og-image.png" />
<meta property="og:url" content="https://subnudge.app" />
<meta property="og:type" content="website" />

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="Subnudge - Stay ahead of every subscription" />
<meta name="twitter:description" content="Track renewals, get Telegram reminders, and never get surprised by charges again." />
<meta name="twitter:image" content="/og-image.png" />
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Lighthouse Performance | 95+ |
| First Contentful Paint | < 1.5s |
| Largest Contentful Paint | < 2.5s |
| Cumulative Layout Shift | < 0.1 |
| Total Page Size | < 500KB |

---

## Responsive Breakpoints

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Mobile | < 640px | Single column, stacked layout |
| Tablet | 640px - 1024px | 2-column grids |
| Desktop | > 1024px | Full layout, side-by-side hero |

---

## Copy Suggestions

### Headlines

- "Stay ahead of every subscription."
- "Never get surprised by renewal charges again."
- "Your subscriptions, beautifully organized."
- "Track. Remind. Save."

### CTAs

- "Get Started Free"
- "Start Tracking"
- "Join Now"
- "Try Subnudge Free"

### Value Propositions

- "Know exactly what you're paying for, when."
- "Get Telegram alerts before any charge hits."
- "See your total spending across all currencies."
- "Set it once, stay informed forever."
