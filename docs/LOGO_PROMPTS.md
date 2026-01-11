# SubTrack Logo & Favicon Generation Prompts

Use these prompts with Google Gemini, DALL-E, Midjourney, or other AI image generators.

---

## App Identity

**App Name:** SubTrack
**Purpose:** Subscription tracking and renewal reminder application
**Key Features:**
- Track recurring subscriptions (Netflix, Spotify, etc.)
- Payment reminders via Telegram
- Cost tracking and budgeting
- Multi-currency support

**Brand Personality:** Modern, trustworthy, organized, helpful, tech-savvy

---

## Recommended Prompts

### Prompt 1: Minimalist Icon (Recommended for Favicon)

```
Design a minimalist app icon for "SubTrack", a subscription tracking app.
The icon should feature a stylized "S" letter combined with a circular arrow
or refresh symbol representing recurring payments. Use a gradient from
deep purple (#7C3AED) to indigo (#4F46E5). The design should be clean,
modern, and work well at small sizes (16x16 to 512x512 pixels).
White or light accent elements on the gradient background.
No text, icon only. Flat design style with subtle depth.
```

### Prompt 2: Calendar + Dollar Concept

```
Create a modern app icon for a subscription management app called "SubTrack".
Combine a calendar page icon with a subtle dollar sign or currency symbol.
Use a vibrant purple-to-blue gradient background. The icon should convey
the concept of tracking recurring payments over time. Minimalist flat design,
suitable for mobile app icon and favicon. Clean lines, no text,
professional fintech aesthetic.
```

### Prompt 3: Credit Card + Loop

```
Design an app icon for "SubTrack", a subscription tracker app.
Feature a simplified credit card shape with a circular loop or infinity
symbol overlay, representing recurring charges. Color scheme:
purple (#8B5CF6) primary with teal (#14B8A6) accent.
Rounded corners, modern flat design, suitable for favicon and app stores.
No text, icon only.
```

### Prompt 4: Bell + Refresh Symbol

```
Create a notification-focused app icon for "SubTrack", a subscription
reminder app. Combine a notification bell with a circular refresh arrow.
The bell represents reminders, the arrow represents recurring subscriptions.
Gradient background from violet (#8B5CF6) to purple (#7C3AED).
Clean, minimal design. Works at 16px favicon size. No text.
```

### Prompt 5: Abstract S with Tracking Lines

```
Design an abstract logo mark for "SubTrack" subscription tracking app.
Create a stylized letter "S" made from flowing curved lines that suggest
tracking or a timeline. Use a modern gradient: purple to pink (#EC4899).
The lines should feel dynamic and suggest motion/progress.
Minimalist, geometric style. Suitable for app icon and favicon.
No text, symbol only.
```

---

## Color Palette Suggestions

Based on the existing app design:

| Color | Hex | Usage |
|-------|-----|-------|
| Primary Purple | `#7C3AED` | Main brand color |
| Secondary Indigo | `#4F46E5` | Gradient end |
| Accent Violet | `#8B5CF6` | Lighter accent |
| Success Green | `#22C55E` | Positive states |
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

## Example Prompt for Google Gemini Specifically

```
Generate a modern, minimalist app icon for "SubTrack" - a subscription
tracking application that helps users manage recurring payments like
Netflix, Spotify, and other services.

Requirements:
- Style: Flat design with subtle gradients
- Colors: Purple (#7C3AED) to indigo (#4F46E5) gradient
- Concept: Combine elements of money/payments + recurring/circular motion
- Shape: Rounded square suitable for app stores
- Size: Should look good from 16x16 to 512x512
- No text in the icon

The icon should feel: trustworthy, modern, organized, and tech-forward.
Similar aesthetic to: Mint, YNAB, Truebill/Rocket Money app icons.
```

---

## Alternative: Text-Based Logo

If you also need a text logo for the landing page:

```
Design a wordmark logo for "SubTrack" - a subscription tracking app.
Use a modern sans-serif font (similar to Inter or SF Pro).
The word "Sub" in purple (#7C3AED), "Track" in dark gray (#1F2937).
Add a small circular arrow or dot accent above the "i" or after "Track".
Clean, professional, fintech aesthetic.
```
