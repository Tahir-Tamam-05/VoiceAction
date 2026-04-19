# STYLE_GUIDE.md - Design System Documentation

## VoiceAction Design System

---

## 1. Design Philosophy

### Core Aesthetic: "Solar Monolith"

The VoiceAction design system embodies a **bold editorial aesthetic** inspired by high-end design publications and cinematic interfaces. The visual language combines warmth with sophistication.

### Design Principles

| Principle | Description | Implementation |
|-----------|-------------|----------------|
| **Bold Typography** | Strong headlines with tight tracking | Space Grotesk for headlines, Manrope for body |
| **Warm Minimalism** | Clean layouts with strategic warmth | Orange accent (#f97316) against neutral bases |
| **Ghost Borders** | Subtle borders that hint at structure | 1px borders with transparency |
| **Depth Through Light** | Layered shadows and glows | Orange glows at various opacities |
| **Motion as Delight** | Smooth, purposeful animations | 300ms transitions with custom easing |

---

## 2. Color System

### Color Palette

#### Primary Accent
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Orange (Primary)                               │
│  #f97316  (Standard)                           │
│  #fd761a  (Dim)                                │
│                                                 │
│  Usage: CTAs, highlights, active states,       │
│         icons, glows                           │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Surface Colors (Light Mode)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Base (Background)                              │
│  #F9F8F6  ─────────────────────────────────┐  │
│                                                 │
│  Surface (Cards)                                │
│  #FFFFFF  ─────────────────────────────────┤  │
│                                                 │
│  Surface Low                                    │
│  #F1F0EE  ─────────────────────────────────┤  │
│                                                 │
│  Surface High                                   │
│  #E5E4E2  ─────────────────────────────────┤  │
│                                                 │
│  Surface Highest                                │
│  #D9D8D6  ─────────────────────────────────┘  │
│                                                 │
│  Surface Bright                                 │
│  #CECDCB                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Surface Colors (Dark Mode)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Base (Background)                              │
│  #000000  ─────────────────────────────────┐  │
│                                                 │
│  Surface (Cards)                                │
│  #150d01  ─────────────────────────────────┤  │
│                                                 │
│  Surface Low                                    │
│  #1b1202  ─────────────────────────────────┤  │
│                                                 │
│  Surface High                                   │
│  #291e07  ─────────────────────────────────┤  │
│                                                 │
│  Surface Highest                                │
│  #30240b  ─────────────────────────────────┘  │
│                                                 │
│  Surface Bright                                 │
│  #372a0f                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Text Colors (Light Mode)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  On Surface (Primary Text)                      │
│  #0A0A0A                                       │
│                                                 │
│  On Surface Variant                             │
│  #262626                                       │
│                                                 │
│  Text Secondary                                 │
│  #525252                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Text Colors (Dark Mode)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  On Surface (Primary Text)                      │
│  #fdf4e3                                       │
│                                                 │
│  On Surface Variant                             │
│  #e7d5b8                                       │
│                                                 │
│  Text Secondary                                 │
│  #a89276                                       │
│                                                 │
└─────────────────────────────────────────────────┘
```

#### Border Colors
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Light Mode                                    │
│  rgba(0, 0, 0, 0.12)  ────▶ ghost-border      │
│                                                 │
│  Dark Mode                                     │
│  rgba(255, 255, 255, 0.15) ──▶ ghost-border    │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 3. Typography System

### Font Families
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Headline Font                                  │
│  "Space Grotesk", sans-serif                   │
│                                                 │
│  Weight: 800 (Extra Bold)                       │
│  Usage: Screen titles, hero text                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Body Font                                      │
│  "Manrope", sans-serif                          │
│                                                 │
│  Weights: 500, 600, 700, 800                    │
│  Usage: All body text, UI elements              │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Type Scale
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Display / Hero                                  │
│  4xl (36px)  font-headline  font-extrabold     │
│  tracking-tighter                               │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Section Title                                  │
│  3xl (30px)  font-headline  font-extrabold     │
│  tracking-tighter                               │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Card Title                                     │
│  base (16px)  font-bold                         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Body Text                                      │
│  sm (14px)  font-medium                         │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Caption / Label                                 │
│  xs (12px)  font-bold  uppercase                │
│  tracking-widest                                │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Micro Label                                    │
│  10px  font-black  uppercase                    │
│  tracking-[0.2em]                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 4. Spacing System

### Base Unit
```
4px = 1 unit
```

### Spacing Scale
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  xs   = 4px   (0.5rem)                        │
│  sm   = 8px   (1rem)                          │
│  md   = 12px  (1.5rem)                        │
│  lg   = 16px  (2rem)                          │
│  xl   = 24px  (3rem)                          │
│  2xl  = 32px  (4rem)                          │
│  3xl  = 48px  (6rem)                          │
│  4xl  = 64px  (8rem)                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Container Widths
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Mobile-First Approach                          │
│                                                 │
│  Default: max-w-2xl (672px)                    │
│  Settings: max-w-5xl (1024px)                  │
│                                                 │
│  Padding:                                       │
│  Mobile: px-4 (16px)                           │
│  Desktop: px-6 (24px)                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 5. Border Radius System

### Radius Scale
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  xl   = 0.75rem (12px)    Buttons, Inputs      │
│                                                 │
│  2xl  = 1rem (16px)       Cards, Modals        │
│                                                 │
│  3xl  = 1.5rem (24px)     Large containers     │
│                                                 │
│  full = 9999px          Circles, Avatars        │
│                                                 │
│  Common Pattern:                               │
│  rounded-2xl for cards                         │
│  rounded-3xl for main containers               │
│  rounded-full for buttons/avatars              │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 6. Shadow & Glow System

### Orange Glow Effects
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Glow Subtle                                     │
│  box-shadow: 0 0 40px rgba(249, 115, 22, 0.04)│
│  Usage: Backgrounds, ambient                    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Glow Medium                                     │
│  box-shadow: 0 0 40px rgba(249, 115, 22, 0.15) │
│  Usage: Cards, hover states                    │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Glow Strong                                     │
│  box-shadow: 0 0 60px rgba(249, 115, 22, 0.3)  │
│  Usage: Primary CTAs, focus states             │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Text Glow                                       │
│  text-shadow: 0 0 15px rgba(249, 115, 22, 0.4)│
│  Usage: Hero text, special headings             │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 7. Component Style Patterns

### Buttons

#### Primary Button
```tsx
<button className="
  bg-primary 
  text-black 
  font-bold 
  uppercase 
  tracking-widest
  rounded-full 
  px-6 py-3
  shadow-[0_0_20px_rgba(249,115,22,0.3)]
  hover:scale-105 
  active:scale-95 
  transition-all
">
  Action
</button>
```

#### Secondary Button
```tsx
<button className="
  bg-surface-low 
  text-on-surface 
  border border-primary/10
  rounded-full 
  px-4 py-2
  hover:bg-surface-high 
  transition-colors
">
  Secondary
</button>
```

#### Ghost Button
```tsx
<button className="
  bg-transparent 
  border border-primary/40 
  text-primary
  rounded-xl
  hover:bg-primary/10
  transition-all
">
  Ghost
</button>
```

### Cards
```tsx
<div className="
  bg-surface-low 
  border border-primary/5 
  rounded-2xl 
  p-4
  ghost-border
  hover:border-primary/20 
  transition-all
">
  Content
</div>
```

### Inputs
```tsx
<input className="
  w-full 
  bg-surface-low 
  border border-primary/10 
  rounded-xl 
  px-4 py-3
  text-on-surface 
  font-medium
  focus:ring-1 
  focus:ring-primary/40 
  outline-none 
  transition-all
  placeholder:text-text-secondary/40
"/>
```

---

## 8. Animation Specifications

### Transition Timings
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Default Duration                               │
│  duration-300 (300ms)                          │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Easing: Custom Bezier                         │
│  [0.2, 0, 0, 1]                               │
│  (Starts fast, ends slow)                     │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Hover Transitions                              │
│  Scale: 1.01 (hover), 0.99 (active)           │
│  Duration: 200ms                               │
│                                                 │
├─────────────────────────────────────────────────┤
│                                                 │
│  Modal/Sheet Animations                         │
│  Height: 0 → auto                              │
│  Opacity: 0 → 1                               │
│  Duration: 300ms                               │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Animation Patterns
```tsx
// Fade + Slide Up (Screen transitions)
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
/>

// Scale (Buttons, Cards)
<motion.div
  whileTap={{ scale: 0.98 }}
  whileHover={{ scale: 1.01 }}
/>

// Waveform (Recording)
<motion.div
  animate={{ 
    height: [20, Math.random() * 80 + 20, 20],
    opacity: isRecording ? 1 : 0.2
  }}
  transition={{ repeat: Infinity, duration: 0.5 }}
/>
```

---

## 9. Icon System

### Icon Library
```
Library: Lucide React
Version: 0.546.0

Common Icons Used:
- Mic, Sparkles, Pin, Clock
- Home, Search, History, Settings
- User, LogOut, Download
- Bell, Shield, Moon, Sun
- ChevronRight, ArrowLeft, X
- Plus, Link, FileText, Image
```

### Icon Sizing
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Icon Sizes:                                    │
│  xs: 12px   - Labels, captions                 │
│  sm: 14px   - Card icons                       │
│  base: 16px - Navigation, buttons              │
│  lg: 18px  - Section headers                   │
│  xl: 20px  - Feature icons                     │
│  2xl: 24px - Primary actions                  │
│  3xl: 32px - Empty states                      │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 10. Layout Patterns

### Screen Layout (Default)
```
┌─────────────────────────────────────────────────┐
│                   TopBar (fixed)                 │
│  h-20 (80px)                                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  Content Area                                   │
│  pt-24 (96px) - accounts for topbar            │
│  pb-32 (128px) - accounts for bottom nav      │
│  px-4 / px-6 - horizontal padding              │
│  max-w-2xl - content constraint                │
│                                                 │
└─────────────────────────────────────────────────┘
                      │
                      ▼
            ┌───────────────────┐
            │  BottomNav (fixed)│
            │  h-20 (80px)     │
            └───────────────────┘
```

### Two-Column Layout (Settings)
```
┌─────────────────────────────────────────────────┐
│  Left Column      │  Right Column               │
│  (1fr)           │  (2fr)                     │
│                   │                             │
│  Sticky Titles   │  Settings Items             │
│  md:sticky       │  grid gap-4                │
│  md:top-32       │                             │
└─────────────────────────────────────────────────┘
```

---

## 11. Responsive Breakpoints

### Breakpoint Values
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Default (Mobile)                               │
│  No prefix                                      │
│                                                 │
├─────────────────────────────────────────────────┤
│  sm: 640px                                      │
│  Small tablets                                  │
│                                                 │
├─────────────────────────────────────────────────┤
│  md: 768px                                     │
│  Tablets                                        │
│                                                 │
├─────────────────────────────────────────────────┤
│  lg: 1024px                                    │
│  Desktop                                        │
│                                                 │
├─────────────────────────────────────────────────┤
│  xl: 1280px                                    │
│  Large Desktop                                  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Responsive Patterns
```tsx
// Mobile-first responsive padding
px-4 sm:px-6

// Mobile-first responsive text
text-sm sm:text-base

// Mobile-first responsive grid
grid-cols-1 sm:grid-cols-2
```

---

## 12. Accessibility Considerations

### Color Contrast
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Primary Text (On Surface)                      │
│  #0A0A0A on #F9F8F6  →  17.7:1 ✓              │
│                                                 │
│  Secondary Text                                 │
│  #525252 on #F9F8F6   →   7.5:1 ✓              │
│                                                 │
│  Primary on Dark                                │
│  #f97316 on #000000   →   8.2:1 ✓             │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Interactive Elements
- Minimum touch target: 44×44px
- Focus rings: visible on keyboard navigation
- States: hover, focus, active all defined

---

## 13. Dark Mode Implementation

### Toggle Mechanism
```tsx
// In App.tsx
<div className={isDark ? 'dark' : ''}>
  {children}
</div>

// CSS variable overrides in index.css
.dark {
  --base: #000000;
  --surface: #150d01;
  --on-surface: #fdf4e3;
  // ...
}
```

### Design Adaptations
```
┌─────────────────────────────────────────────────┐
│                                                 │
│  Light → Dark Changes:                          │
│                                                 │
│  - Background shifts to true black              │
│  - Surfaces become warm dark tones              │
│  - Text inverts to warm cream                   │
│  - Borders become subtle white                  │
│  - Glows become more prominent                   │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

*Document Version: 1.0*  
*Last Updated: March 2026*
