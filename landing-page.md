# ════════════════════════════════════════════════════════════════
# MASTER PROMPT — CALL CENTER MANAGEMENT SYSTEM LANDING PAGE
# Futuristic · 3D · Dark Premium · High-Converting
# ════════════════════════════════════════════════════════════════

---

## 🎯 PROJECT OVERVIEW

Build a **single-page marketing/landing website** for a **Call Center Management SaaS platform** targeting US-based call centers handling Xfinity & utility billing. The design must feel like a **next-generation enterprise CRM product** — dark, premium, and deeply technical in its visual language.

**Primary Goal:** Convert visitors into demo bookings or free trial sign-ups.
**Tone:** Authoritative, modern, high-trust, efficiency-focused.
**Aesthetic Direction:** Futuristic 3D · Dark Tech · Precision-Engineered UI

---

## 🛠 TECH STACK

- **Framework:** React (with Vite) OR plain HTML/CSS/JS (your choice)
- **Icons:** [Lucide Icons](https://lucide.dev/) or [Phosphor Icons](https://phosphoricons.com/) — NO AI-generated icon SVGs, NO emoji as icons
- **Animations:** GSAP (GreenSock) + ScrollTrigger plugin for scroll-based animations
- **3D Effects:** CSS `perspective`, `transform: rotateX/Y/Z`, `transform-style: preserve-3d` — NO Three.js required (pure CSS 3D)
- **Fonts:**
  - Display/Headings: `Orbitron` (Google Fonts) — futuristic, geometric
  - Body: `IBM Plex Mono` — technical, monospaced feel
  - UI Labels/Tags: `Space Mono`
- **Colors:** See palette below — **absolutely NO gradient colors** (solid fills only)
- **Build:** Must be fully responsive (mobile, tablet, desktop)

---

## 🎨 DESIGN SYSTEM

### Color Palette (NO GRADIENTS — solid colors only)

```css
:root {
  /* Backgrounds */
  --bg-primary:    #050810;   /* near-black with blue tint */
  --bg-secondary:  #0A0F1E;   /* card/panel backgrounds */
  --bg-card:       #0D1526;   /* elevated surface */
  --bg-overlay:    #111A30;   /* hover state backgrounds */

  /* Accent Colors (solid, no gradients) */
  --accent-cyan:   #00D4FF;   /* primary accent — electric cyan */
  --accent-white:  #F0F4FF;   /* near-white text */
  --accent-dim:    #5A7090;   /* muted/secondary text */
  --accent-border: #1E3050;   /* subtle borders */
  --accent-red:    #FF3B3B;   /* pain point / negative markers */
  --accent-green:  #00E676;   /* success / positive markers */
  --accent-yellow: #FFD600;   /* warning / highlight */

  /* 3D / Depth Effects */
  --shadow-deep:   0 24px 80px rgba(0, 212, 255, 0.08);
  --glow-cyan:     0 0 30px rgba(0, 212, 255, 0.25);
  --glow-subtle:   0 0 15px rgba(0, 212, 255, 0.10);
}
```

### Typography Scale

```css
/* Headings */
h1 { font: 700 72px/1.05 'Orbitron', sans-serif; letter-spacing: -1px; }
h2 { font: 700 48px/1.1  'Orbitron', sans-serif; letter-spacing: -0.5px; }
h3 { font: 600 24px/1.3  'Orbitron', sans-serif; }

/* Body */
p  { font: 400 17px/1.75 'IBM Plex Mono', monospace; }

/* Labels/Tags */
.tag { font: 500 12px/1 'Space Mono', monospace; letter-spacing: 2px; text-transform: uppercase; }
```

---

## 🌐 GLOBAL LAYOUT & BACKGROUND

### Dark Grid Background (Entire Page)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(0,212,255,0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0,212,255,0.035) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}
```

### Scanline Overlay (Subtle CRT / Tech feel)
```css
body::after {
  content: '';
  position: fixed;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0,0,0,0.08) 2px,
    rgba(0,0,0,0.08) 4px
  );
  pointer-events: none;
  z-index: 1;
}
```

### Floating Particles (JS)
Generate ~60 small dots (2–4px, color: `#00D4FF` at 20–40% opacity) scattered across the page. Animate them with slow upward drift using CSS `@keyframes` with staggered delays. These should be absolutely positioned in the `body` background layer and not interfere with content.

---

## 📐 NAVIGATION BAR

**Style:** Sticky · Transparent with backdrop blur · Bottom border `1px solid var(--accent-border)`

**Layout (left → right):**
- **Logo (left):** Text logo — `Space Tech Solution` — in `Orbitron` font, `var(--accent-cyan)` color, with a small square bracket `[` `]` wrapping it like `[ Space Tech Solution ]`
- **Nav Links (center):** Features · How It Works · Pricing · Contact — small uppercase `Space Mono`, `var(--accent-dim)` color, hover changes to `var(--accent-cyan)` with a 2px bottom line
- **CTA (right):** Two buttons:
  - `Get Demo` — outlined button: `1px solid var(--accent-cyan)`, cyan text, transparent background, hover fills with `var(--accent-cyan)` text becomes `#050810`
  - `Start Free Trial` — solid button: `background: var(--accent-cyan)`, text `#050810`, font-weight 700

**3D Effect on Nav:** On scroll, the nav should get a subtle `box-shadow: 0 2px 40px rgba(0,212,255,0.12)` to feel elevated.

---

## 🦸 SECTION 1 — HERO

### Layout
Full viewport height (`100vh`). Two-column layout:
- **Left column (60%):** Text content
- **Right column (40%):** 3D Dashboard mockup visual

### Left Column Content
```
[TAG LABEL — uppercase Space Mono, cyan, small]
// ENTERPRISE CALL CENTER PLATFORM

[H1 — Orbitron, white, 72px]
Manage Your Entire
Call Center in One
Smart System

[Subheadline — IBM Plex Mono, var(--accent-dim), 18px]
Stop juggling Google Sheets, chats, and manual tracking.
Track sales, customers, agents, and billing —
all in real time, under one roof.

[TWO CTA BUTTONS — spaced, left-aligned]
[ Get Demo ]   [ Start Free Trial → ]

[Small stat strip below buttons]
───────────────────────────────────
  ↑ 340+    |   ↓ 67%       |  ⚡ Real-time
  Agents    |   Chargebacks  |  Updates
  Tracked   |   Reduced      |  Always On
───────────────────────────────────
```

### Right Column — 3D Dashboard Mockup
Build a **pure CSS 3D floating dashboard card** that simulates a CRM interface:

```css
.dashboard-mockup {
  transform: perspective(800px) rotateY(-12deg) rotateX(6deg);
  transform-style: preserve-3d;
  animation: float3d 6s ease-in-out infinite;
  box-shadow: var(--shadow-deep), var(--glow-subtle);
  border: 1px solid var(--accent-border);
  border-radius: 12px;
  background: var(--bg-card);
}

@keyframes float3d {
  0%, 100% { transform: perspective(800px) rotateY(-12deg) rotateX(6deg) translateY(0px); }
  50%       { transform: perspective(800px) rotateY(-12deg) rotateX(6deg) translateY(-16px); }
}
```

**Inside the mockup card** (fake dashboard UI elements, built with HTML/CSS):
- Top bar with 3 colored dots (red/yellow/green) + "Call Center Dashboard" label
- A mini bar chart (pure CSS bars, cyan colored) with label "Sales This Week"
- A small table with 3 rows: Agent Name | Status | Sales | Billing Status
- Two small stat boxes: "Active Agents: 24" and "Pending Bills: 8"
- A tiny line chart (SVG path or CSS clip-path) showing an upward trend

**Floating data chips** around the card (absolutely positioned, glow effect):
- `LIVE` badge (green dot + "LIVE" text) — top-right of card
- `Agent #12 — Sale Logged` — floating below card, slight delay animation
- `Bill Paid ✓` — floating left side

### Hero Animations (GSAP)
On page load (staggered):
1. Grid background fades in (0.5s)
2. Tag label slides up from -20px opacity 0 → opacity 1 (0.3s)
3. H1 each line animates in from left, staggered 0.15s apart
4. Subheadline fades up (0.4s delay)
5. Buttons pop in with slight scale (0 → 1.05 → 1)
6. Stat strip wipes in left-to-right
7. Dashboard card flips in from Y-axis: `rotateY(90deg)` → `rotateY(-12deg)` (1s, ease)

---

## 💀 SECTION 2 — PAIN POINTS

### Layout
Full-width dark section, `background: var(--bg-secondary)`. Centered content.

### Heading
```
[TAG LABEL] // THE PROBLEM

[H2, centered, white]
Why Call Centers Are
Losing Time & Money

[Subtext, centered, var(--accent-dim)]
If your operation feels messy, slow, and risky — you're not alone.
```

### Pain Point Cards Grid
6 cards in a 3×2 grid. Each card:
- `background: var(--bg-card)`
- `border: 1px solid var(--accent-border)`
- Border left: `4px solid var(--accent-red)` — red accent on left
- Icon: Lucide icon (relevant to the pain point) — `var(--accent-red)` color, 24px
- Title in Orbitron, bold
- Description in IBM Plex Mono

**Pain Points (Icon → Title → Description):**

| Lucide Icon | Title | Description |
|---|---|---|
| `FileSpreadsheet` | Scattered Data | Sales data scattered across Google Sheets & chats with no single source of truth |
| `EyeOff` | Zero Visibility | No real-time visibility on customer responses or live call status |
| `AlertTriangle` | High Chargebacks | Poor tracking leads to chargebacks that drain your revenue every month |
| `ShieldX` | Billing Failures | Processors struggle to verify and process bills without a clear system |
| `UserX` | Uncontrolled Agents | No control over agent performance — you can't manage what you can't see |
| `Clock` | Billing Delays | Manual status updates cause delays, confusion, and missed payments |

### Card Hover Effect (3D Tilt)
On hover, each card does a subtle 3D tilt:
```css
.pain-card:hover {
  transform: perspective(600px) rotateX(-4deg) rotateY(4deg) translateY(-4px);
  border-color: var(--accent-red);
  box-shadow: 0 16px 40px rgba(255,59,59,0.15);
  transition: all 0.3s ease;
}
```

### ScrollTrigger Animation
Cards animate in one by one as user scrolls: each card slides up from `translateY(40px)` opacity 0 → opacity 1, staggered by 0.1s.

---

## ✅ SECTION 3 — SOLUTION

### Layout
Full-width, `background: var(--bg-primary)`. Centered.

```
[TAG LABEL] // THE SOLUTION

[H2, white, centered]
One Platform.
Total Control.

[Body text, centered, max-width 640px]
Our system is built specifically for call centers handling
Xfinity & utility billing in the USA. It centralizes your
entire workflow so your team can work faster, smarter,
and with full transparency.
```

### Visual: Animated Connection Diagram
Below the text, show a **horizontal flow diagram** built in SVG or pure CSS:

```
[ Agent ]  ──────→  [ Sales Log ]  ──────→  [ Processor ]  ──────→  [ Manager Dashboard ]
```

Each node is a rounded box (style: `bg-card` + `border: 1px solid var(--accent-cyan)` + cyan glow)
The connecting lines animate: a moving dot/particle travels along each path using `stroke-dashoffset` animation or CSS `@keyframes`.

Color nodes:
- Agent: `border-color: var(--accent-cyan)`
- Sales Log: `border-color: var(--accent-green)`
- Processor: `border-color: var(--accent-yellow)`
- Manager Dashboard: `border-color: var(--accent-cyan)`, add glow

---

## ⚙️ SECTION 4 — CORE FEATURES

### Layout
`background: var(--bg-secondary)`. 4-column grid (2×4 or 4+4 on desktop). Feature cards.

### Section Header
```
[TAG LABEL] // CORE FEATURES

[H2, white]
Everything Your Team Needs
```

### 8 Feature Cards (Icon + Title + Description)

| # | Lucide Icon | Title | Description |
|---|---|---|---|
| 1 | `LayoutDashboard` | Manage Sales & Customers | Track every sale and customer in one dashboard — no more switching between tools |
| 2 | `Activity` | Real-Time Call Tracking | See customer responses instantly and make faster decisions |
| 3 | `Receipt` | Accurate Billing Processing | Ensure every bill is processed correctly with clear status tracking |
| 4 | `RefreshCw` | Smart Bill Status Updates | Update and monitor bill status (Paid, Pending, Failed) in one click |
| 5 | `TrendingDown` | Chargeback Reduction | Minimize chargebacks with better tracking and automated verification |
| 6 | `BarChart2` | Agent Performance Monitor | Track who is performing and who needs coaching or improvement |
| 7 | `UserCheck` | Employee Activity Tracking | Know exactly which agent is working, idle, or closing deals |
| 8 | `DollarSign` | Salary & Commission Mgmt | Easily manage employee payouts based on verified performance data |

### Feature Card Styling
```css
.feature-card {
  background: var(--bg-card);
  border: 1px solid var(--accent-border);
  border-radius: 10px;
  padding: 28px 24px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}

/* Top-left corner accent bracket */
.feature-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 24px; height: 24px;
  border-top: 2px solid var(--accent-cyan);
  border-left: 2px solid var(--accent-cyan);
  border-radius: 10px 0 0 0;
}

/* Bottom-right corner accent bracket */
.feature-card::after {
  content: '';
  position: absolute;
  bottom: 0; right: 0;
  width: 24px; height: 24px;
  border-bottom: 2px solid var(--accent-cyan);
  border-right: 2px solid var(--accent-cyan);
  border-radius: 0 0 10px 0;
  opacity: 0;
  transition: opacity 0.3s;
}

.feature-card:hover::after { opacity: 1; }

.feature-card:hover {
  border-color: var(--accent-cyan);
  box-shadow: var(--glow-cyan);
  transform: translateY(-4px);
}
```

Icon: 32px, `var(--accent-cyan)` color, inside a `40px × 40px` box with `background: rgba(0,212,255,0.08)` and `border-radius: 8px`.

---

## 💳 SECTION 5 — BILLING STATUS SYSTEM

### Layout
`background: var(--bg-primary)`. Two-column layout:
- Left: Text/heading
- Right: Visual billing status panel

### Left Content
```
[TAG LABEL] // BILLING SYSTEM

[H2, white]
Simple & Clear
Billing Tracking

[Body]
No confusion. No missed payments.
Everything tracked in one place.
```

### Right: Billing Status Panel (3D Card)
A dark panel styled like a CRM table/widget:
```
┌─────────────────────────────────────────────┐
│  BILLING STATUS OVERVIEW          [LIVE ●]  │
├─────────────────────────────────────────────┤
│  ✓  Bill Paid via Card       [  COMPLETED  ]│
│  ✓  Bill Paid via Check      [  COMPLETED  ]│
│  ✓  Cash Payments Logged     [  COMPLETED  ]│
│  ⏳  Pending Verification     [   PENDING   ]│
│  ✗  Failed Transaction       [   FAILED    ]│
└─────────────────────────────────────────────┘
```

Status badges:
- `COMPLETED`: `background: rgba(0,230,118,0.12)`, `color: var(--accent-green)`, `border: 1px solid var(--accent-green)`
- `PENDING`: `background: rgba(255,214,0,0.12)`, `color: var(--accent-yellow)`, border yellow
- `FAILED`: `background: rgba(255,59,59,0.12)`, `color: var(--accent-red)`, border red

**3D Transform on the panel:**
```css
.billing-panel {
  transform: perspective(700px) rotateY(8deg) rotateX(3deg);
  animation: float3d 5s ease-in-out infinite;
}
```

**Number counter animation:** Animate the count values (e.g., "2,840 Bills Processed") counting up from 0 using JS `requestAnimationFrame` when the section enters viewport.

---

## 🔄 SECTION 6 — HOW IT WORKS

### Layout
`background: var(--bg-secondary)`. Full-width. Centered heading + horizontal stepper.

```
[TAG LABEL] // WORKFLOW

[H2, centered]
How It Works
```

### 5-Step Process (Horizontal stepper on desktop, vertical on mobile)

Each step:
- Number badge: `01` `02` `03` `04` `05` — Orbitron font, cyan, inside circle
- Connecting line between steps: horizontal dashed line, animated with traveling dot
- Icon (Lucide) above number
- Title in Orbitron
- Short description in IBM Plex Mono

| Step | Icon | Title | Description |
|---|---|---|---|
| 01 | `LogIn` | Agent Logs In | Secure login with role-based access for every team member |
| 02 | `PenLine` | Records Sale | Agent records customer sale instantly into the system |
| 03 | `CheckSquare` | Bill Verified | Processor reviews, verifies, and processes the billing entry |
| 04 | `RefreshCcw` | Status Updated | Bill status updates in real-time across the entire platform |
| 05 | `Monitor` | Manager Reviews | Manager monitors all activity from the central dashboard |

### Step Animation (GSAP ScrollTrigger)
When section enters viewport:
- Steps animate in left-to-right, one by one (stagger 0.2s)
- Each step's connecting line draws from left to right using SVG `stroke-dashoffset`
- Number badges scale from 0 → 1 with slight bounce (`elastic` ease)

---

## 📊 SECTION 7 — RESULTS

### Layout
`background: var(--bg-primary)`. 5-column stats + icon grid.

```
[TAG LABEL] // RESULTS

[H2, white, centered]
What You Gain
```

### 5 Result Cards (horizontal row)

| Lucide Icon | Metric | Label |
|---|---|---|
| `Zap` | `3× Faster` | Operations Speed |
| `TrendingDown` | `67% Less` | Chargeback Rate |
| `PieChart` | `100%` | Business Visibility |
| `Users` | `Full` | Team Control |
| `Timer` | `8 hrs/week` | Time Saved |

**Card style:** Large stat number in `Orbitron` bold `48px`, `var(--accent-cyan)`. Label in small monospace. Border `1px solid var(--accent-border)`. On hover: `box-shadow: var(--glow-cyan)`.

**Counter animation:** All stat numbers count up from 0 when scrolled into view.

---

## 🎯 SECTION 8 — TARGET AUDIENCE

### Layout
`background: var(--bg-secondary)`. 2-column grid: left text, right cards.

### Left Content
```
[TAG LABEL] // BUILT FOR

[H2, white]
Built For People
Who Mean Business
```

### Right: 4 Audience Cards

| Lucide Icon | Title | Description |
|---|---|---|
| `PhoneCall` | Call Centers | Handling Xfinity sales and high-volume inbound/outbound calls |
| `Zap` | Utility Billing Companies | Managing complex utility billing workflows across multiple accounts |
| `Headphones` | Sales Teams | Teams managing high call volume needing real-time performance data |
| `Gauge` | Operations Managers | Leaders who demand full visibility and control over every process |

Cards styled similar to feature cards with corner bracket accents.

---

## 🚀 SECTION 9 — FINAL CTA

### Layout
`background: var(--bg-card)`. Full-width. Centered. Bordered top & bottom: `1px solid var(--accent-border)`.

```
[TAG LABEL] // GET STARTED

[H2, white, centered, max-width 700px]
Ready to Take Control of
Your Call Center?

[Body, centered, var(--accent-dim), max-width 520px]
Stop wasting time on manual work and start scaling
your operations with confidence.

[TWO CTA BUTTONS — centered]
[ Book a Demo ]       [ Contact Sales ]
```

### Background Effect
A large, blurred, non-gradient "light bloom" effect — just a `radial-gradient` as a pseudo-element behind the text (NOT on text). Single-color cyan only:
```css
.cta-section::before {
  content: '';
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 600px;
  height: 300px;
  background: radial-gradient(ellipse, rgba(0,212,255,0.06) 0%, transparent 70%);
  pointer-events: none;
}
```
(This is a glow/bloom, not a gradient on UI elements — allowed)

---

## 🔻 FOOTER

### Layout
`background: #040710`. 3-column layout.

**Column 1 — Brand:**
```
[ Space Tech Solution ]   ← Orbitron logo

"Run your call center smarter,
faster, and with zero chaos."

[Small IBM Plex Mono, var(--accent-dim)]
```

**Column 2 — Quick Links:**
```
PLATFORM (label, uppercase)
  Features
  How It Works
  Pricing
  Documentation
```

**Column 3 — Contact:**
```
CONTACT (label, uppercase)
  Book a Demo
  Contact Sales
  Support

[Icons row: LinkedIn, Twitter/X, Email]
← Use Lucide icons: Linkedin, Twitter, Mail
```

**Bottom bar:**
```
─────────────────────────────────────────────────
© 2025 Space Tech Solution · All rights reserved · Privacy Policy · Terms of Service
```

---

## ✨ GLOBAL ANIMATION SPECS

### Page Load Sequence (GSAP Timeline)
```javascript
const tl = gsap.timeline();
tl
  .from('nav', { y: -60, opacity: 0, duration: 0.6, ease: 'power2.out' })
  .from('.hero-tag', { y: 20, opacity: 0, duration: 0.4 }, '-=0.2')
  .from('.hero-title span', { y: 40, opacity: 0, stagger: 0.12, duration: 0.6, ease: 'power3.out' }, '-=0.1')
  .from('.hero-sub', { y: 20, opacity: 0, duration: 0.5 }, '-=0.2')
  .from('.hero-btns', { y: 20, opacity: 0, duration: 0.4 }, '-=0.2')
  .from('.hero-stats', { y: 20, opacity: 0, duration: 0.4 }, '-=0.1')
  .from('.dashboard-mockup', { rotateY: 90, opacity: 0, duration: 1, ease: 'power2.out' }, '-=0.6');
```

### Scroll Animations (GSAP ScrollTrigger)
```javascript
// All sections: fade in on scroll
gsap.utils.toArray('.section-heading').forEach(el => {
  gsap.from(el, {
    scrollTrigger: { trigger: el, start: 'top 80%' },
    y: 40, opacity: 0, duration: 0.7, ease: 'power2.out'
  });
});

// Cards stagger
gsap.utils.toArray('.card-grid').forEach(grid => {
  gsap.from(grid.children, {
    scrollTrigger: { trigger: grid, start: 'top 75%' },
    y: 50, opacity: 0, stagger: 0.08, duration: 0.5, ease: 'power2.out'
  });
});
```

### Cursor Custom Effect (Optional but Recommended)
A custom cursor: small `8px` cyan circle for the actual pointer + a larger `36px` cyan ring (`outline: 1px solid var(--accent-cyan)`) that follows with lag (lerp: 0.1). On hovering interactive elements, the ring expands to `60px`.

### Typing Effect
The hero H1 — use a typewriter animation for one key word. Animate "Smart System" character by character using `setInterval` + cursor blinking.

---

## 📱 RESPONSIVE BREAKPOINTS

```css
/* Desktop: 1280px+ — full layout as described */
/* Tablet: 768px–1280px */
  /* 2-col hero stacks: text above, dashboard below */
  /* Feature grid: 2×4 */
  /* Stats row: 2×3 with last centered */

/* Mobile: < 768px */
  /* All grids go 1-column */
  /* Dashboard mockup: no 3D tilt (reset transform) */
  /* Font sizes: H1 → 40px, H2 → 30px */
  /* Nav: hamburger menu with slide-in drawer */
  /* CTA buttons: full-width stacked */
```

---

## 🧩 COMPONENT ARCHITECTURE (If Using React)

```
/src
  /components
    Navbar.jsx
    Hero.jsx
    PainPoints.jsx
    Solution.jsx
    Features.jsx
    BillingStatus.jsx
    HowItWorks.jsx
    Results.jsx
    TargetAudience.jsx
    FinalCTA.jsx
    Footer.jsx
    /ui
      Button.jsx       ← outlined and solid variants
      Card.jsx         ← base card with corner brackets
      SectionTag.jsx   ← the "// SECTION NAME" tag
      StatCounter.jsx  ← animated number counter
      Icon.jsx         ← Lucide icon wrapper
  /styles
    global.css         ← CSS variables, reset, body styles
    animations.css     ← all @keyframes
  /hooks
    useCountUp.js      ← counter animation hook
    useScrollAnimation.js ← GSAP scroll setup
  App.jsx
  main.jsx
```

---

## ⛔ STRICT DON'TS

1. ❌ **NO gradient fills** on any UI element (buttons, cards, text, backgrounds) — solid colors only
2. ❌ **NO emoji as icons** — use Lucide or Phosphor icon library exclusively
3. ❌ **NO AI-generated abstract icons** (blobs, sparkle symbols, generic star bursts)
4. ❌ **NO Inter, Roboto, or system fonts** — must use Orbitron + IBM Plex Mono
5. ❌ **NO white or light backgrounds** on any section — dark theme throughout
6. ❌ **NO purple color anywhere** — stick to the defined palette
7. ❌ **NO Three.js** — 3D effects via CSS `perspective` and `transform` only
8. ❌ **NO stock images or placeholder photos** — use CSS/SVG mockups and icons only

---

## ✅ QUALITY CHECKLIST (Before Delivery)

- [ ] All GSAP scroll animations fire correctly at correct scroll positions
- [ ] Dashboard 3D mockup floats with `float3d` animation
- [ ] All 8 feature cards have corner bracket hover effect
- [ ] Pain points section cards have red left border
- [ ] Billing status badges show correct colors (green/yellow/red)
- [ ] How It Works stepper has connecting animated line
- [ ] Number counters animate on scroll into view
- [ ] Custom cursor implemented
- [ ] Grid background visible on all sections
- [ ] Responsive: tested on 375px, 768px, 1280px, 1920px
- [ ] Page loads in under 3 seconds (no heavy assets)
- [ ] Font: Orbitron + IBM Plex Mono loaded from Google Fonts
- [ ] Icons from Lucide only — no emoji
- [ ] No gradients on any UI element
- [ ] CTA buttons work (link to `#demo` and `#contact` anchors)

---

*Master Prompt v1.0 — Call Center CRM Landing Page*
*Futuristic · Dark · 3D CSS · High-Converting*