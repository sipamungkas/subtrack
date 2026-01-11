# Subnudge Logo & Favicon Generation Prompts

Use these prompts with Google Gemini, DALL-E, Midjourney, or other AI image generators.

---

## Brand Identity

**App Name:** Subnudge
**Tagline:** Stay ahead of every subscription
**Domain:** subnudge.app
**Purpose:** Subscription tracking and renewal reminder application

**Key Features:**
- Track recurring subscriptions (Netflix, Spotify, etc.)
- Payment reminders via Telegram
- Cost tracking and budgeting
- Multi-currency support

**Brand Personality:** Proactive, helpful, modern, trustworthy, friendly nudge

---

## Recommended Prompts

### Prompt 1: Minimalist Nudge Icon (Recommended for Favicon)

```
Design a minimalist app icon for "Subnudge", a subscription reminder app.
The icon should feature a stylized notification bell with a gentle "nudge"
motion indicator (like a small wave or gentle push). Use a gradient from
deep purple (#7C3AED) to indigo (#4F46E5). The design should convey a
friendly reminder or gentle nudge. Clean, modern, works well at small
sizes (16x16 to 512x512 pixels). White or light accent elements.
No text, icon only. Flat design style with subtle depth.
```

### Prompt 2: Abstract "S" with Nudge Motion

```
Create a modern app icon for "Subnudge" - a subscription management app.
Feature a stylized letter "S" with a subtle motion trail or nudge indicator,
suggesting a gentle push or reminder. Use a vibrant purple-to-blue gradient
background. The icon should feel friendly and proactive, like a helpful
assistant giving you a nudge. Minimalist flat design, suitable for mobile
app icon and favicon. Clean lines, no text, professional fintech aesthetic.
```

### Prompt 3: Bell + Gentle Wave

```
Design an app icon for "Subnudge", a subscription reminder app.
Combine a notification bell with a gentle wave or ripple effect emanating
from it, representing the "nudge" concept. Color scheme:
purple (#8B5CF6) primary with teal (#14B8A6) accent for the wave.
Rounded corners, modern flat design, suitable for favicon and app stores.
No text, icon only. The design should feel friendly and helpful.
```

### Prompt 4: Calendar with Nudge Arrow

```
Create a friendly app icon for "Subnudge", a subscription tracker.
Feature a simplified calendar or date icon with a small curved arrow
or nudge indicator pointing forward, representing staying ahead.
Gradient background from violet (#8B5CF6) to purple (#7C3AED).
Clean, minimal design. Works at 16px favicon size. No text.
Should convey the feeling of being proactive and prepared.
```

### Prompt 5: Finger Tap / Nudge Gesture

```
Design an abstract logo mark for "Subnudge" subscription reminder app.
Create a stylized hand or finger making a gentle tap/nudge gesture,
abstract and minimal. Use a modern gradient: purple to pink (#EC4899).
The gesture should feel friendly, not pushy - like a helpful reminder.
Minimalist, geometric style. Suitable for app icon and favicon.
No text, symbol only.
```

---

## Color Palette

Based on the existing app design:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Purple | `#7C3AED` | Main brand color |
| Secondary Indigo | `#4F46E5` | Gradient end |
| Accent Violet | `#8B5CF6` | Lighter accent |
| Accent Emerald | `#10B981` | Success/positive states |
| Success Green | `#22C55E` | Confirmations |
| Background Dark | `#0F172A` | Dark mode |

---

## Technical Requirements

### Favicon Sizes Needed
- `16x16` - Browser tab
- `32x32` - Browser tab (retina)
- `48x48` - Windows taskbar
- `180x180` - Apple touch icon
- `192x192` - Android Chrome
- `512x512` - PWA splash

### File Formats
- `.ico` - Windows favicon (multi-size)
- `.png` - Modern browsers
- `.svg` - Scalable vector (ideal)

---

## Post-Generation Steps

After generating the logo:

1. **Resize for favicon:**
   ```bash
   # Using ImageMagick
   convert logo.png -resize 16x16 favicon-16.png
   convert logo.png -resize 32x32 favicon-32.png
   convert logo.png -resize 180x180 apple-touch-icon.png
   convert logo.png -resize 192x192 android-chrome-192.png
   convert logo.png -resize 512x512 android-chrome-512.png

   # Create .ico file
   convert favicon-16.png favicon-32.png favicon.ico
   ```

2. **Or use online tools:**
   - [RealFaviconGenerator](https://realfavicongenerator.net/)
   - [Favicon.io](https://favicon.io/)

3. **Place files:**
   - Frontend: `frontend/public/favicon.ico`
   - Frontend: `frontend/public/apple-touch-icon.png`

---

## Primary Prompt for Google Gemini

```
Generate a modern, minimalist app icon for "Subnudge" - a subscription
reminder application that helps users stay ahead of their recurring payments.
The app's tagline is "stay ahead of every subscription."

Requirements:
- Style: Flat design with subtle gradients
- Colors: Purple (#7C3AED) to indigo (#4F46E5) gradient
- Concept: Combine elements of notifications/reminders + a gentle "nudge" motion
- Shape: Rounded square suitable for app stores
- Size: Should look good from 16x16 to 512x512
- No text in the icon
- Feel: Friendly, proactive, helpful - not aggressive

The icon should feel: trustworthy, modern, proactive, and friendly.
Think of it as a helpful assistant giving you a gentle reminder.
Similar aesthetic to: Mint, YNAB, Rocket Money, but with a unique "nudge" identity.
```

---

## Text-Based Logo (For Landing Page)

```
Design a wordmark logo for "Subnudge" - a subscription reminder app.
Tagline: "stay ahead of every subscription"

Use a modern sans-serif font (similar to Inter or SF Pro).
"Sub" in purple (#7C3AED), "nudge" in dark gray (#1F2937).
Add a small motion indicator or wave accent after "nudge" to suggest
the nudging action. Clean, professional, friendly fintech aesthetic.
```

---

## Brand Guidelines Summary

- **Primary Logo**: Icon + "Subnudge" wordmark
- **Icon Only**: For favicons, app stores, small sizes
- **Colors**: Purple gradient as primary, emerald as accent
- **Tone**: Friendly, proactive, helpful (not pushy or aggressive)
- **Key Visual Elements**: Bells, nudge motion, gentle waves, forward arrows
