

\# VoiceAction — Product Vision Document

\#\# Refined & Reimagined

\---

\#\# Product Name

\# \*\*VOXEL\*\*

\*"Your voice, crystallized."\*

The name evokes \*\*vox\*\* (Latin for voice) \+ \*\*pixel\*\* (atomic digital unit) — the idea that every spoken thought becomes a precise, structured digital artifact. It's short, memorable, brandable, and domain-available-friendly.

\---

\#\# One-Line Pitch

\> \*\*Voxel turns your messy spoken thoughts into perfectly structured, actionable notes — and remembers how you think over time.\*\*

\---

\#\# Target Users

\#\#\# Primary Persona: \*\*"The Overloaded Thinker"\*\*  
\- \*\*Age:\*\* 22–40  
\- \*\*Roles:\*\* Founders, product managers, designers, grad students, freelancers, content creators  
\- \*\*Behavior:\*\* They have 50 ideas a day, capture maybe 3, and lose the rest. They think faster than they type. They've tried Notion, Apple Notes, Otter.ai — nothing sticks because the friction is too high.  
\- \*\*Device:\*\* Primarily mobile-first (but uses desktop for review/editing)  
\- \*\*Mindset:\*\* "I don't need another notes app. I need something that actually captures how I think."

\#\#\# Secondary Persona: \*\*"The Reflective Professional"\*\*  
\- \*\*Roles:\*\* Therapists journaling session notes, doctors dictating patient summaries, lawyers capturing case observations  
\- \*\*Need:\*\* Speak freely, get a structured professional document back — without editing

\#\#\# Tertiary Persona: \*\*"The Accountability Seeker"\*\*  
\- People building habits: daily journaling, gratitude practice, idea logging  
\- Needs streaks, gentle nudges, and a sense of progress

\---

\#\# Problem Statement

\#\#\# The Real Problem Isn't Note-Taking. It's \*Thought Loss.\*

Every day, the average knowledge worker has \*\*dozens of high-value thoughts\*\* — in the shower, on a walk, between meetings, lying in bed. The vast majority evaporate because:

1\. \*\*Typing is too slow\*\* for the speed of thought  
2\. \*\*Voice memos are graveyards\*\* — recorded but never revisited  
3\. \*\*Existing tools require structure upfront\*\* — titles, folders, tags — which kills spontaneity  
4\. \*\*There's no bridge\*\* between raw spoken thought and organized, actionable content

The result: a persistent sense that "I had a great idea but I can't remember it." This is not a productivity problem. It's a \*\*cognitive anxiety\*\* problem.

\*\*Voxel eliminates this anxiety entirely.\*\* Speak. It handles the rest.

\---

\#\# Unique Hook: \*\*"The Thought Graph"\*\*

Here's what makes Voxel genuinely different from Otter, Notion, Apple Notes, or any other tool:

\#\#\# 🧠 \*\*Voxel Builds a Model of How You Think\*\*

Every note you create isn't just stored — it's \*\*connected\*\*. Over time, Voxel's AI constructs a personal \*\*Thought Graph\*\*: a visual, navigable map of your ideas, themes, recurring patterns, and evolving thinking.

\*\*What this enables:\*\*

| Feature | Description |  
|---------|-------------|  
| \*\*Auto-Linking\*\* | "This idea about pricing is related to your note from Tuesday about competitor analysis" |  
| \*\*Pattern Detection\*\* | "You've mentioned 'burnout' in 7 notes this month — want to explore that?" |  
| \*\*Idea Resurfacing\*\* | Weekly "Forgotten Gems" — old notes that connect to your recent thinking |  
| \*\*Thought Momentum\*\* | A visual timeline showing how a single seed idea evolved into a full concept over weeks |

This transforms Voxel from a \*\*utility\*\* (capture tool) into a \*\*thinking partner\*\* (cognitive amplifier). Users don't just come back to take notes — they come back to \*\*discover what they've been thinking\*\*.

\---

\#\# Core Features (Prioritized)

\#\#\# 🔴 P0 — The Foundation (MVP)

\#\#\#\# 1\. \*\*One-Tap Voice Capture\*\*  
\- Home screen has ONE dominant action: a large, pulsing microphone orb  
\- Tap → Recording begins instantly (no confirmation, no setup)  
\- Live waveform visualization — not a generic sine wave, but a \*\*fluid, organic blob\*\* that reacts to pitch, volume, and cadence (built with React Three Fiber)  
\- Tap again → Recording stops, processing begins

\#\#\#\# 2\. \*\*AI Note Crystallization\*\*  
\- Raw transcript is sent to Gemini 1.5 Pro  
\- Returns a structured \*\*"Crystal"\*\* (Voxel's term for a processed note):

\`\`\`json  
{  
  "title": "Auto-generated, punchy title",  
  "summary": "2-3 sentence executive summary",  
  "body": "Full structured content with headers/bullets",  
  "type": "idea | task | journal | meeting | brainstorm | reflection",  
  "mood": "energized | contemplative | frustrated | neutral | excited",  
  "tags": \["auto-extracted", "contextual", "tags"\],  
  "actionItems": \["Extracted tasks with implied deadlines"\],  
  "connections": \["IDs of related existing notes"\]  
}  
\`\`\`

\#\#\#\# 3\. \*\*The Crystal Feed (Home Screen)\*\*  
\- Not a boring list. A \*\*curated editorial feed:\*\*  
  \- \*\*Pinned Crystals\*\* at top in a horizontal scroll carousel  
  \- \*\*Today's Crystals\*\* with mood-colored accent borders  
  \- \*\*"Your Week in Thoughts"\*\* — a mini weekly summary card  
  \- \*\*Forgotten Gems\*\* — resurfaced old notes  
\- Each card shows: title, summary preview, type icon, mood indicator, timestamp, connection count

\#\#\#\# 4\. \*\*Quick Text Capture\*\*  
\- Pull-down gesture on home screen reveals a text input  
\- Type a raw thought → AI processes it identically to voice  
\- Supports Markdown shortcuts for power users

\#\#\#\# 5\. \*\*Note Editing\*\*  
\- Full editing with real-time AI suggestions:  
  \- "Make this more concise"  
  \- "Extract action items"  
  \- "Convert to bullet points"  
\- Attachment support: links (with auto-preview), images, files  
\- Pin/unpin, type change, manual tag editing

\#\#\#\# 6\. \*\*Search & Filter\*\*  
\- Semantic search (not just keyword matching) — "that idea I had about making onboarding easier" finds the right note even if those exact words weren't used  
\- Filters: date range, type, mood, tags, pinned, has attachments  
\- Results ranked by relevance with highlighted matching context

\#\#\#\# 7\. \*\*Authentication & Persistence\*\*  
\- Firebase Auth (Google sign-in \+ email/password)  
\- Firestore for real-time cloud persistence  
\- Offline-first with local cache, syncs when online

\#\#\#\# 8\. \*\*Dark/Light Mode\*\*  
\- Not just a color swap. Two distinct \*\*design personalities:\*\*  
  \- \*\*Light mode:\*\* Clean, editorial, lots of white space — feels like a premium magazine  
  \- \*\*Dark mode:\*\* Deep blacks with luminous accents — feels like a luxury instrument panel  
\- System preference detection \+ manual toggle  
\- Smooth animated transition between modes (cross-fade, not instant swap)

\---

\#\#\# 🟡 P1 — The Differentiators

\#\#\#\# 9\. \*\*The Thought Graph\*\*  
\- Visual node-based map of all your notes and their connections  
\- Zoom in to see individual crystals; zoom out to see theme clusters  
\- Nodes colored by type, sized by connection count  
\- Tap a node → see the note \+ all its connections  
\- Built with React Three Fiber for a 3D, explorable feel

\#\#\#\# 10\. \*\*Streak Engine\*\*  
\- Daily streak counter with \*\*visual progression:\*\*  
  \- Days 1-7: Ember (small flame icon)  
  \- Days 8-30: Blaze (growing flame)  
  \- Days 31-100: Inferno (elaborate fire)  
  \- Days 100+: Phoenix (legendary status)  
\- Streak freeze: 1 free pass per week  
\- Weekly/monthly recaps: "You created 23 crystals this week. Your dominant mood was 'energized.' Your hottest topic was 'product strategy.'"

\#\#\#\# 11\. \*\*Smart Notifications\*\*  
\- "You haven't captured a thought today — your streak is at risk"  
\- "A note from 2 weeks ago connects to something you said today"  
\- "Weekly Thought Digest ready" (Sunday evening)  
\- Fully configurable, never spammy

\#\#\#\# 12\. \*\*Export & Share\*\*  
\- Export single note or bulk:  
  \- Markdown (.md)  
  \- PDF (beautifully formatted)  
  \- CSV (for data nerds)  
  \- Plain text  
\- Share a "Crystal Card" — a beautiful, branded image of your note for social sharing

\---

\#\#\# 🟢 P2 — The Delighters

\#\#\#\# 13\. \*\*Voice Playback with Highlights\*\*  
\- Re-listen to original recording with text synchronized (karaoke-style highlighting)  
\- Jump to any part of the transcript, audio follows

\#\#\#\# 14\. \*\*Daily Prompt\*\*  
\- Optional daily question to spark reflection:  
  \- "What's one thing you'd do differently today?"  
  \- "What problem are you avoiding?"  
  \- "What excited you most this week?"  
\- AI-generated based on your recent note patterns

\#\#\#\# 15\. \*\*Flashcard Generation\*\*  
\- Select any note → "Generate Flashcards"  
\- AI creates Q\&A pairs from the content  
\- Spaced repetition review system  
\- Perfect for students and learners

\#\#\#\# 16\. \*\*Collaboration (Future)\*\*  
\- Share a crystal with someone  
\- Collaborative thought graph for teams  
\- "Shared Brain" workspace

\---

\#\# User Flow (Step-by-Step)

\#\#\# First-Time User Experience

STEP 1: LANDING PAGE  
┌─────────────────────────────────────────────────┐  
│                                                   │  
│   \[3D floating crystal orb — slowly rotating\]     │  
│                                                   │  
│        V O X E L                                  │  
│   "Your voice, crystallized."                     │  
│                                                   │  
│   ┌──────────────────────────────┐                │  
│   │    Start Capturing Thoughts   │  ← Primary    │  
│   └──────────────────────────────┘                │  
│                                                   │  
│   Already have an account? Sign in  ← Secondary   │  
│                                                   │  
│   ↓ Scroll to learn more                          │  
│                                                   │  
│   \[Feature showcases with parallax scroll\]        │  
│   \[Social proof / testimonials\]                   │  
│   \[Final CTA\]                                     │  
│                                                   │  
└─────────────────────────────────────────────────┘

STEP 2: ONBOARDING (3 screens, swipeable)  
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  
│  🎤 Speak    │  │  🧠 AI       │  │  🔮 Discover │  
│  freely.     │  │  structures  │  │  patterns    │  
│              │  │  it for you. │  │  in your     │  
│  \[Animation  │  │              │  │  thinking.   │  
│   of voice   │  │  \[Animation  │  │              │  
│   waves\]     │  │   of note    │  │  \[Animation  │  
│              │  │   forming\]   │  │   of graph\]  │  
└──────────────┘  └──────────────┘  └──────────────┘

STEP 3: SIGN UP  
\- Google One-Tap (primary)  
\- Email \+ Password (secondary)  
\- Smooth slide-up modal, not a page redirect

STEP 4: MICROPHONE PERMISSION  
\- Custom-styled permission request (before browser prompt)  
\- "Voxel needs your mic to capture voice notes.  
   Your recordings are processed and never stored as audio."  
\- \[Enable Microphone\] → triggers browser permission  
\- \[Skip — I'll type instead\] → proceeds without mic

STEP 5: HOME (Empty State)  
┌─────────────────────────────────────────┐  
│                                           │  
│   Good morning, Alex.                     │  
│                                           │  
│   ┌─────────────────────────────────┐     │  
│   │                                 │     │  
│   │    \[Glowing microphone orb\]     │     │  
│   │                                 │     │  
│   │   Tap to capture your first     │     │  
│   │        thought                  │     │  
│   │                                 │     │  
│   └─────────────────────────────────┘     │  
│                                           │  
│   Or pull down to type ↓                  │  
│                                           │  
└─────────────────────────────────────────┘

\#\#\# Core Recording Flow

\`\`\`  
USER TAPS MIC ORB  
        │  
        ▼  
┌─────────────────────────────────────┐  
│         RECORDING SCREEN            │  
│                                     │  
│   \[3D organic blob — reacts to      │  
│    voice in real-time. Grows,       │  
│    pulses, changes color with       │  
│    volume and pitch\]                │  
│                                     │  
│   "Listening..." (subtle pulse)     │  
│                                     │  
│   ══════════════════  01:23         │  
│   (waveform timeline)              │  
│                                     │  
│          ⏹ \[Stop\]                   │  
│                                     │  
│   \[Cancel\]                          │  
└─────────────────────────────────────┘  
        │  
        │ User taps Stop  
        ▼  
┌─────────────────────────────────────┐  
│       PROCESSING SCREEN             │  
│                                     │  
│   \[Crystal forming animation —      │  
│    the blob compresses, facets      │  
│    appear, it becomes a geometric   │  
│    crystal shape\]                   │  
│                                     │  
│   "Crystallizing your thought..."   │  
│                                     │  
│   ████████████░░░░  67%             │  
│                                     │  
└─────────────────────────────────────┘  
        │  
        │ AI processing complete  
        ▼  
┌─────────────────────────────────────┐  
│        CRYSTAL CREATED              │  
│                                     │  
│   ✨ (sparkle burst animation)      │  
│                                     │  
│   ┌───────────────────────────┐     │  
│   │  💡 Idea                  │     │  
│   │                           │     │  
│   │  "Reimagine Onboarding    │     │  
│   │   as a Game"              │     │  
│   │                           │     │  
│   │  Users should feel like   │     │  
│   │  they're unlocking a...   │     │  
│   │                           │     │  
│   │  🏷 \#onboarding \#ux \#gam │     │  
│   │  😊 Excited               │     │  
│   │  🔗 2 connections         │     │  
│   └───────────────────────────┘     │  
│                                     │  
│   \[Edit Crystal\]  \[Save & Close\]    │  
│                                     │  
│   🔥 Day 5 streak\!                  │  
│                                     │  
└─────────────────────────────────────┘  
        │  
        │ Save & Close  
        ▼  
   HOME (crystal appears in feed  
         with slide-up animation)  
\`\`\`

\#\#\# Search Flow

\`\`\`  
USER TAPS SEARCH (bottom nav)  
        │  
        ▼  
┌─────────────────────────────────────┐  
│   🔍 Search your thoughts...        │  
│   ─────────────────────────────     │  
│                                     │  
│   FILTERS (horizontal pill scroll)  │  
│   \[All\] \[Ideas\] \[Tasks\] \[Journal\]   │  
│   \[This Week\] \[Pinned\] \[Has Links\]  │  
│                                     │  
│   RECENT SEARCHES                   │  
│   "pricing strategy"                │  
│   "meeting with Sarah"              │  
│                                     │  
│   SUGGESTED                         │  
│   "Your most-connected topic:       │  
│    Product Strategy (12 crystals)"  │  
│                                     │  
└─────────────────────────────────────┘  
        │  
        │ User types "onboarding ideas"  
        ▼  
┌─────────────────────────────────────┐  
│   🔍 onboarding ideas              │  
│   ─────────────────────────────     │  
│                                     │  
│   3 crystals found                  │  
│                                     │  
│   ┌───────────────────────────┐     │  
│   │ "Reimagine Onboarding     │     │  
│   │  as a Game"               │     │  
│   │  ...users should feel     │     │  
│   │  like they're unlocking...│     │  
│   │  💡 Idea · 2 days ago     │     │  
│   └───────────────────────────┘     │  
│                                     │  
│   ┌───────────────────────────┐     │  
│   │ "Onboarding Friction      │     │  
│   │  Points"                  │     │  
│   │  ...step 3 is where       │     │  
│   │  most users drop off...   │     │  
│   │  📋 Meeting · 1 week ago  │     │  
│   └───────────────────────────┘     │  
│                                     │  
│   ┌───────────────────────────┐     │  
│   │ "First Impressions        │     │  
│   │  Matter"                  │     │  
│   │  ...the first 30 seconds  │     │  
│   │  determine everything...  │     │  
│   │  🧠 Brainstorm · 3w ago   │     │  
│   └───────────────────────────┘     │  
│                                     │  
│   \[View these in Thought Graph →\]   │  
│                                     │  
└─────────────────────────────────────┘  
\`\`\`

\---

\#\# UX/UI Design Vision

\#\#\# Design Philosophy: \*\*"Liquid Crystal"\*\*

The entire design language is built around the metaphor of \*\*crystallization\*\* — raw, fluid thoughts solidifying into precise, beautiful structures. This manifests in every element:

\---

\#\#\# Color System

\#\#\#\# Light Mode — "Daylight Crystal"  
\`\`\`  
Background:        \#FAFAFA (warm off-white)  
Surface:           \#FFFFFF  
Surface Elevated:  \#FFFFFF with 0 2px 20px rgba(0,0,0,0.04)  
Text Primary:      \#1A1A2E (near-black with blue undertone)  
Text Secondary:    \#6B7280  
Text Tertiary:     \#9CA3AF  
Accent Primary:    \#6C5CE7 (electric violet)  
Accent Secondary:  \#A29BFE (soft lavender)  
Accent Gradient:   linear-gradient(135deg, \#6C5CE7, \#A29BFE)  
Success:           \#00B894  
Warning:           \#FDCB6E  
Error:             \#E17055  
Mood Colors:  
  Energized:       \#FF6B6B  
  Contemplative:   \#74B9FF  
  Excited:         \#FFEAA7  
  Frustrated:      \#E17055  
  Neutral:         \#DFE6E9  
\`\`\`

\#\#\#\# Dark Mode — "Midnight Crystal"  
\`\`\`  
Background:        \#0A0A0F (deep space black)  
Surface:           \#141420  
Surface Elevated:  \#1E1E2E  
Text Primary:      \#F5F5F7  
Text Secondary:    \#8B8BA3  
Text Tertiary:     \#5A5A72  
Accent Primary:    \#A29BFE (soft lavender — inverted emphasis)  
Accent Secondary:  \#6C5CE7  
Accent Gradient:   linear-gradient(135deg, \#A29BFE, \#6C5CE7)  
Border:            rgba(255,255,255,0.06)  
Glow Effect:       0 0 40px rgba(162,155,254,0.15)  
\`\`\`

\---

\#\#\# Typography

\`\`\`  
Font Family:       "Inter" (body), "Cal Sans" or "Satoshi" (headings)  
                   Fallback: system-ui, \-apple-system

Scale:  
  Display:         48px / 1.1 / \-0.02em (landing page hero)  
  H1:              32px / 1.2 / \-0.02em  
  H2:              24px / 1.3 / \-0.01em  
  H3:              20px / 1.4  
  Body:            16px / 1.6  
  Body Small:      14px / 1.5  
  Caption:         12px / 1.4  
  Label:           11px / 1.2 / 0.05em / uppercase

Weights:  
  Regular: 400 (body text)  
  Medium:  500 (labels, secondary headings)  
  Semibold: 600 (headings, emphasis)  
  Bold:    700 (hero text, CTAs)  
\`\`\`

\---

\#\#\# Spacing & Layout

\`\`\`  
Base Unit:         4px  
Spacing Scale:     4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

Container:  
  Mobile:          16px horizontal padding  
  Tablet:          24px  
  Desktop:         max-width 1200px, centered

Card Padding:      20px (mobile), 24px (desktop)  
Card Radius:       16px  
Card Gap:          12px

Bottom Nav Height: 64px \+ safe area  
Header Height:     56px  
\`\`\`

\---

\#\#\# Iconography

\`\`\`  
Style:             Outlined, 1.5px stroke, rounded caps  
Size:              24px (standard), 20px (small), 28px (featured)  
Library:           Lucide Icons (consistent with modern aesthetic)  
Custom Icons:      Crystal icon (brand), Waveform, Thought Graph node  
\`\`\`

\---

\#\#\# Micro-Interactions & Animations

\#\#\#\# Recording Orb (Hero Interaction)  
\`\`\`  
IDLE STATE:  
\- Soft, slow breathing animation (scale 1.0 → 1.02, 3s ease-in-out loop)  
\- Subtle gradient rotation (violet → lavender, 8s loop)  
\- Faint glow pulse (box-shadow opacity 0.1 → 0.2)

HOVER/PRESS STATE:  
\- Scale up to 1.05 with spring physics (stiffness: 400, damping: 30\)  
\- Glow intensifies  
\- Haptic feedback on mobile (if supported)

RECORDING STATE:  
\- 3D blob (React Three Fiber) replaces static orb  
\- Blob vertices displaced by audio amplitude data (analyserNode)  
\- Color shifts: quiet \= cool violet, loud \= warm pink/red  
\- Rotation speed increases with volume  
\- Ambient particles float around the blob

PROCESSING STATE:  
\- Blob smoothly morphs into a geometric crystal shape  
\- Faceted surfaces appear (subdivided icosahedron → crystal mesh)  
\- Crystal slowly rotates with glint/sparkle reflections  
\- Progress ring around the crystal  
\- "Crystallizing..." text with typewriter effect  
\`\`\`

\#\#\#\# Card Animations  
\`\`\`  
ENTRANCE:  
\- Staggered fade-up (translateY: 20px → 0, opacity: 0 → 1\)  
\- Each card delays 50ms after previous  
\- Spring easing (stiffness: 200, damping: 20\)

HOVER (Desktop):  
\- translateY: \-2px  
\- Shadow deepens  
\- Border becomes slightly visible (accent color at 10% opacity)  
\- 200ms ease-out

TAP/PRESS (Mobile):  
\- Scale: 0.98  
\- Background slightly darker  
\- 100ms

SWIPE ACTIONS (Mobile):  
\- Swipe right: Pin/Unpin (violet background reveal)  
\- Swipe left: Delete (red background reveal)  
\- Elastic overscroll with spring bounce-back

DELETE:  
\- Card collapses vertically (height → 0, opacity → 0\)  
\- Cards below slide up to fill gap  
\- 300ms ease-in-out  
\`\`\`

\#\#\#\# Page Transitions  
\`\`\`  
FORWARD NAVIGATION:  
\- New page slides in from right (translateX: 100% → 0\)  
\- Current page slides out left with slight scale down (scale: 1 → 0.95, opacity → 0.5)  
\- Shared elements (like a note card → edit screen) use layout animation

BACK NAVIGATION:  
\- Reverse of forward  
\- Current page slides right, previous slides in from left

MODAL/SHEET:  
\- Bottom sheet slides up with spring physics  
\- Backdrop fades in (black at 50% opacity)  
\- Sheet has a drag handle, supports gesture dismissal  
\- Drag down → sheet follows finger → release → dismiss with momentum  
\`\`\`

\#\#\#\# Skeleton Loading  
\`\`\`  
\- Shimmer animation on placeholder content blocks  
\- Gradient sweep: left to right, subtle  
\- Placeholder shapes match actual content layout exactly  
\- 1.5s loop duration, ease-in-out  
\`\`\`

\#\#\#\# Theme Toggle  
\`\`\`  
\- Circular reveal animation from toggle button position  
\- Dark mode: black circle expands from toggle point, covering screen  
\- Light mode: white circle expands  
\- Duration: 500ms  
\- Content fades between color values (not instant swap)  
\`\`\`

\---

\#\#\# Component Library

\#\#\#\# Crystal Card (Note Card)  
\`\`\`  
┌──────────────────────────────────┐  
│  💡  Idea                    📌  │ ← Type icon \+ Pin indicator  
│                                  │  
│  Reimagine Onboarding           │ ← Title (H3, semibold)  
│  as a Game                       │  
│                                  │  
│  Users should feel like they're  │ ← Summary (Body Small, secondary)  
│  unlocking achievements during   │  
│  the setup process...            │  
│                                  │  
│  ┌────┐ ┌──────────┐ ┌────────┐ │ ← Tags (pills)  
│  │ \#ux│ │\#onboarding│ │\#gamify │ │  
│  └────┘ └──────────┘ └────────┘ │  
│                                  │  
│  😊 Excited · 2h ago · 🔗 3     │ ← Mood \+ Time \+ Connections  
│                                  │  
└──────────────────────────────────┘

Border-left: 3px solid \[mood color\]  
Background: surface color  
Radius: 16px  
Shadow: subtle in light mode, border-glow in dark mode  
\`\`\`

\#\#\#\# Bottom Navigation  
\`\`\`  
┌─────────────────────────────────────────┐  
│                                         │  
│  🏠       🔍       🎤       📅       ⚙️ │  
│ Home    Search   Record   History  Settings│  
│                                         │  
└─────────────────────────────────────────┘

\- Record button is elevated (floats above nav bar by 12px)  
\- Record button has permanent glow/pulse in accent color  
\- Active tab: filled icon \+ accent color  
\- Inactive tab: outlined icon \+ secondary text color  
\- Smooth icon morphing on tab change  
\- Tab indicator: small dot below active icon (not a full bar)  
\`\`\`

\#\#\#\# Recording Waveform  
\`\`\`  
\- Real-time frequency bars OR organic blob (user preference)  
\- Bars: 40-60 vertical bars, heights driven by FFT data  
\- Color: gradient from accent primary to secondary  
\- Reflection below (mirrored, 30% opacity)  
\- Smooth interpolation between values (no jitter)  
\`\`\`

\#\#\#\# Empty States  
\`\`\`  
\- Custom illustration for each empty state (not just an icon)  
\- Friendly, encouraging copy:  
  \- No notes: "Your mind is full of ideas. Let's capture some."  
  \- No search results: "Hmm, nothing matches. Try different words."  
  \- No connections: "Keep creating. Patterns will emerge."  
\- Single clear CTA button  
\`\`\`

\#\#\#\# Modal / Bottom Sheet  
\`\`\`  
┌─────────────────────────────────────────┐  
│  ═══  (drag handle, 40px wide, 4px)     │  
│                                         │  
│  Delete this crystal?                   │  
│                                         │  
│  This can't be undone. The crystal      │  
│  and all its connections will be        │  
│  removed.                               │  
│                                         │  
│  ┌──────────────────────────────────┐   │  
│  │         Delete Crystal           │   │ ← Red/destructive  
│  └──────────────────────────────────┘   │  
│                                         │  
│  ┌──────────────────────────────────┐   │  
│  │            Cancel                │   │ ← Ghost/secondary  
│  └──────────────────────────────────┘   │  
│                                         │  
└─────────────────────────────────────────┘

\- Rounded top corners (24px radius)  
\- Backdrop blur on overlay (not just opacity)  
\- Content is never more than 60% of screen height  
\`\`\`

\---

\#\#\# Screen-by-Screen Design Specs

\#\#\#\# Landing Page  
\`\`\`  
STRUCTURE:  
├── Hero Section (100vh)  
│   ├── 3D Crystal Orb (React Three Fiber, centered)  
│   ├── Logo: "VOXEL" (Display, bold, letter-spaced)  
│   ├── Tagline: "Your voice, crystallized." (H2, secondary)  
│   ├── CTA: "Start Capturing" (primary button, large)  
│   └── Secondary: "Sign In" (text link)  
│  
├── Feature Showcase (3 sections, scroll-triggered)  
│   ├── "Speak Freely" \+ voice waveform animation  
│   ├── "AI Structures Everything" \+ note formation animation  
│   └── "Discover Patterns" \+ thought graph animation  
│  
├── Social Proof  
│   ├── Testimonial cards (horizontal scroll)  
│   └── Usage stats ("50,000 thoughts crystallized")  
│  
└── Final CTA  
    ├── "Your best ideas deserve better than a forgotten voice memo."  
    └── CTA button (repeated)

SCROLL EFFECTS:  
\- Crystal orb parallax (moves slower than scroll)  
\- Feature sections fade-in \+ slide-up on intersection  
\- Counter animations on stats (number ticking up)  
\- Sticky header appears after scrolling past hero  
\`\`\`

\#\#\#\# Home Screen  
\`\`\`  
STRUCTURE:  
├── Header  
│   ├── Greeting: "Good morning, Alex" (H2)  
│   ├── Streak indicator: "🔥 12" (pill badge)  
│   └── Profile avatar (initials, top-right)  
│  
├── Quick Capture Bar (sticky below header)  
│   ├── Text input: "What's on your mind?"  
│   └── Send button (accent color)  
│  
├── Pinned Crystals (horizontal scroll)  
│   ├── Compact cards (140px wide, 180px tall)  
│   └── "See all pinned →" link  
│  
├── Today's Crystals  
│   ├── Full crystal cards (list)  
│   └── Grouped by creation time  
│  
├── Your Week in Thoughts (summary card)  
│   ├── Mini stats: 12 crystals, 3 ideas, 2 tasks  
│   ├── Dominant mood indicator  
│   └── "View thought graph →"  
│  
├── Forgotten Gems (1-2 resurfaced old notes)  
│   ├── "From 3 weeks ago"  
│   └── Crystal card with connection reason  
│  
└── Bottom Navigation

PULL-TO-REFRESH:  
\- Custom animation: crystal icon spins and glows  
\- Smooth content reload with skeleton shimmer  
\`\`\`

\#\#\#\# Edit/View Crystal Screen  
\`\`\`  
STRUCTURE:  
├── Header  
│   ├── Back arrow (left)  
│   ├── Type selector (center, tappable pill)  
│   └── More menu (right): Pin, Delete, Export, Share  
│  
├── Title (editable, H1, contentEditable)  
│  
├── Metadata Bar  
│   ├── Mood: \[emoji \+ label\] (tappable to change)  
│   ├── Created: "Mar 15, 2:30 PM"  
│   └── Connections: "🔗 3 related"  
│  
├── Summary (editable, Body, secondary color, italic)  
│  
├── Body (editable, rich text area)  
│   ├── Supports Markdown rendering  
│   ├── AI suggestion floating button: "✨ Enhance"  
│   └── Auto-save indicator: "Saved" (subtle, top-right)  
│  
├── Action Items (extracted tasks)  
│   ├── Checkbox list  
│   └── "Add action item" button  
│  
├── Tags (editable pill list)  
│   ├── Existing tags  
│   └── "+ Add tag" button  
│  
├── Attachments  
│   ├── Link previews (card with favicon, title, description)  
│   ├── Image thumbnails (grid)  
│   └── "Attach" button: \[Link\] \[Image\] \[File\]  
│  
├── Connections  
│   ├── Related crystal cards (compact, horizontal scroll)  
│   └── "View in thought graph →"  
│  
└── Audio Playback (if voice note)  
    ├── Play/Pause button  
    ├── Waveform scrubber  
    └── Synchronized transcript highlighting  
\`\`\`

\#\#\#\# Thought Graph Screen  
\`\`\`  
STRUCTURE:  
├── Header  
│   ├── "Thought Graph" (H2)  
│   ├── Filter chips: \[All\] \[Ideas\] \[Tasks\] \[This Month\]  
│   └── Zoom controls (+/-)  
│  
├── 3D Graph Canvas (React Three Fiber, full-screen minus header/nav)  
│   ├── Nodes \= Crystals  
│   │   ├── Size \= number of connections  
│   │   ├── Color \= type  
│   │   ├── Glow \= recency (brighter \= newer)  
│   │   └── Label \= truncated title  
│   │  
│   ├── Edges \= Connections  
│   │   ├── Animated dashed lines  
│   │   └── Thickness \= connection strength  
│   │  
│   └── Clusters \= Themes  
│       ├── Auto-detected topic groups  
│       └── Subtle circular region highlight  
│  
├── Selected Node Detail (bottom sheet, partial)  
│   ├── Crystal card preview  
│   ├── "Open" button  
│   └── Connection list  
│  
└── Bottom Navigation

INTERACTIONS:  
\- Pinch to zoom  
\- Drag to pan  
\- Tap node to select  
\- Double-tap node to open crystal  
\- Force-directed layout with smooth physics  
\- Nodes gently float/drift when idle  
\`\`\`

\#\#\#\# Settings Screen  
\`\`\`  
STRUCTURE:  
├── Header: "Settings"  
│  
├── Profile Section  
│   ├── Avatar (initials, large)  
│   ├── Name  
│   ├── Email  
│   └── "Edit Profile" link  
│  
├── Preferences  
│   ├── Theme: \[Light\] \[Dark\] \[System\] (segmented control)  
│   ├── Default note type: dropdown  
│   ├── Recording visualization: \[Waveform\] \[Blob\]  
│   └── AI Enhancement: toggle (on/off)  
│  
├── Streak & Stats  
│   ├── Current streak: 12 days 🔥  
│   ├── Longest streak: 34 days  
│   ├── Total crystals: 156  
│   └── "View all stats →"  
│  
├── Data  
│   ├── Export All Notes: \[Markdown\] \[CSV\] \[PDF\]  
│   ├── Delete All Data (danger zone)  
│   └── Storage used: 2.3 MB  
│  
├── About  
│   ├── Version: 1.0.0  
│   ├── Privacy Policy  
│   ├── Terms of Service  
│   └── "Made with 🎤 by \[team\]"  
│  
└── Sign Out (bottom, red text)  
\`\`\`

\---

\#\#\# Responsive Behavior

\`\`\`  
MOBILE (\< 768px):  
\- Single column layout  
\- Bottom navigation  
\- Full-width cards  
\- Touch-optimized hit targets (min 44px)  
\- Swipe gestures enabled

TABLET (768px \- 1024px):  
\- Two-column grid for crystals  
\- Side navigation option  
\- Larger recording orb  
\- Split view: list \+ detail

DESKTOP (\> 1024px):  
\- Three-column layout possibility  
\- Sidebar navigation  
\- Hover states on all interactive elements  
\- Keyboard shortcuts (R \= record, N \= new text note, / \= search)  
\- Thought graph gets more canvas space  
\`\`\`

\---

\#\# Tech Stack

\#\#\# Confirmed (Per Your Stack)  
\`\`\`  
├── Framework:      React 19 \+ TypeScript  
├── Build:          Vite 6  
├── Styling:        Tailwind CSS 4  
├── Animations:     Motion (Framer Motion successor)  
├── 3D Graphics:    React Three Fiber \+ Drei  
├── AI:             Google Gemini 1.5 Pro API  
├── Auth:           Firebase Authentication  
├── Database:       Cloud Firestore  
├── Speech:         Web Speech API (SpeechRecognition)  
└── Audio:          Web Audio API (waveform visualization)  
\`\`\`

\#\#\# Recommended Additions  
\`\`\`  
├── State:          Zustand (lightweight, perfect for this scale)  
├── Routing:        React Router 7 (with view transitions API)  
├── Forms:          React Hook Form \+ Zod (for validation)  
├── Icons:          Lucide React  
├── Date Handling:  date-fns (tree-shakeable)  
├── Markdown:       react-markdown \+ remark-gfm  
├── Toast/Notify:   Sonner (beautiful, minimal)  
├── Testing:        Vitest \+ Testing Library  
├── Linting:        ESLint \+ Prettier \+ Tailwind plugin  
├── PWA:            vite-plugin-pwa (Phase 2\)  
├── Analytics:      PostHog or Mixpanel (privacy-friendly)  
└── Error Track:    Sentry  
\`\`\`

\#\#\# Architecture  
\`\`\`  
src/  
├── app/  
│   ├── routes/              \# Page components  
│   ├── layouts/             \# Layout wrappers  
│   └── providers/           \# Context providers (Auth, Theme, etc.)  
│  
├── features/  
│   ├── recording/           \# Voice capture feature  
│   │   ├── components/  
│   │   ├── hooks/  
│   │   └── utils/  
│   ├── crystals/            \# Note/Crystal CRUD  
│   │   ├── components/  
│   │   ├── hooks/  
│   │   ├── services/  
│   │   └── types/  
│   ├── ai/                  \# Gemini integration  
│   │   ├── services/  
│   │   └── prompts/  
│   ├── search/  
│   ├── thought-graph/  
│   ├── streaks/  
│   └── auth/  
│  
├── shared/  
│   ├── components/          \# Button, Card, Modal, Input, etc.  
│   ├── hooks/               \# useTheme, useMediaQuery, etc.  
│   ├── lib/                 \# Firebase config, API clients  
│   ├── styles/              \# Global styles, Tailwind config  
│   ├── types/               \# Shared TypeScript types  
│   └── utils/               \# Helpers, formatters, validators  
│  
└── assets/  
    ├── fonts/  
    ├── icons/  
    └── 3d-models/  
\`\`\`

\---

\#\# MVP vs Advanced Features

\#\#\# MVP (4-6 weeks, 1-2 developers)

| Feature | Priority | Complexity |  
|---------|----------|------------|  
| Landing page with 3D orb | P0 | Medium |  
| Firebase Auth (Google \+ Email) | P0 | Low |  
| Voice recording with waveform visualization | P0 | High |  
| Web Speech API transcription | P0 | Medium |  
| Gemini AI note structuring | P0 | Medium |  
| Crystal CRUD (create, read, update, delete) | P0 | Medium |  
| Pin/unpin crystals | P0 | Low |  
| Home feed (pinned \+ recent) | P0 | Medium |  
| Quick text capture | P0 | Low |  
| Edit crystal (full editing) | P0 | Medium |  
| Basic search (text matching) | P1 | Medium |  
| Dark/Light mode with animated toggle | P1 | Medium |  
| Basic streak tracking | P1 | Low |  
| Settings (theme, export, sign out) | P1 | Low |  
| Markdown/CSV export | P1 | Low |  
| Mobile-responsive design | P0 | Medium |  
| Error boundaries \+ loading states | P0 | Low |

\*\*MVP Total Effort:\*\* \~240-320 hours

\#\#\# Advanced (Post-MVP, rolling 4-8 weeks)

| Feature | Priority | Complexity |  
|---------|----------|------------|  
| Thought Graph (3D visualization) | P1 | Very High |  
| Semantic search (AI-powered) | P1 | High |  
| Auto-connections between notes | P1 | High |  
| Forgotten Gems resurfacing | P1 | Medium |  
| Weekly Thought Digest | P1 | Medium |  
| Crystal Card sharing (image generation) | P2 | Medium |  
| Voice playback with transcript sync | P2 | High |  
| Flashcard generation | P2 | Medium |  
| Daily prompts | P2 | Low |  
| Push notifications | P2 | Medium |  
| PWA \+ Offline mode | P2 | High |  
| Keyboard shortcuts (desktop) | P2 | Low |  
| PDF export (beautiful formatting) | P2 | Medium |  
| Advanced streak system (levels/badges) | P2 | Medium |  
| Onboarding tour | P2 | Low |

\---

\#\# Monetization Strategy

\#\#\# Freemium Model: \*\*"Voxel Free" vs "Voxel Pro"\*\*

\#\#\#\# Free Tier  
\- 20 crystals per month  
\- Basic AI structuring (title \+ summary \+ body)  
\- Text search only  
\- 7-day streak tracking  
\- Light/Dark mode  
\- Export as plain text

\#\#\#\# Pro Tier — \*\*$6.99/month\*\* or \*\*$59.99/year\*\*  
\- Unlimited crystals  
\- Advanced AI (mood analysis, auto-tags, action items, connections)  
\- Semantic search  
\- Thought Graph  
\- Forgotten Gems & Weekly Digest  
\- Flashcard generation  
\- All export formats (Markdown, CSV, PDF)  
\- Priority AI processing  
\- Custom themes (additional color palettes)  
\- Extended streak stats & badges

\#\#\#\# Why $6.99?  
\- Below the "impulse buy" threshold  
\- Competitive with: Notion AI ($8), Otter.ai ($8.33), Mem ($9)  
\- Annual pricing ($59.99 \= $4.99/mo) encourages commitment  
\- Free tier is genuinely useful — pro is genuinely compelling

\#\#\# Alternative Revenue Streams (Future)  
\- \*\*Voxel Teams\*\* — Shared thought graphs for teams ($12/user/month)  
\- \*\*API Access\*\* — Let developers build on the thought graph  
\- \*\*Premium AI Models\*\* — Access to GPT-4o or Claude alongside Gemini

\---

\#\# Future Expansion Ideas

\#\#\# Phase 2 (Months 3-6)  
1\. \*\*Multi-Language Support\*\* — Record in any language, AI processes in English (or preferred language)  
2\. \*\*Apple Watch / Wear OS Companion\*\* — Tap wrist, speak, done  
3\. \*\*Browser Extension\*\* — Highlight text on any webpage → "Save to Voxel" as a crystal  
4\. \*\*Siri/Google Assistant Integration\*\* — "Hey Siri, save to Voxel: \[thought\]"  
5\. \*\*Calendar Integration\*\* — Auto-create pre-meeting prompt and post-meeting capture

\#\#\# Phase 3 (Months 6-12)  
1\. \*\*Voxel for Teams\*\* — Shared workspaces, collaborative thought graphs  
2\. \*\*AI Writing Assistant\*\* — "Write a blog post based on my last 5 crystals about AI"  
3\. \*\*Mood Analytics\*\* — Track emotional patterns over time with visualizations  
4\. \*\*Audio Journals\*\* — Keep and browse original audio, not just transcripts  
5\. \*\*Third-Party Integrations\*\* — Notion, Todoist, Linear, Slack export/sync

\#\#\# Moonshot (12+ months)  
1\. \*\*"Second Brain" Dashboard\*\* — Comprehensive knowledge base built entirely from voice notes  
2\. \*\*Conversation Mode\*\* — Talk \*with\* Voxel about your notes: "What have I said about marketing this month?"  
3\. \*\*Predictive Insights\*\* — "Based on your patterns, you tend to have your best ideas on Tuesday mornings during walks"  
4\. \*\*Hardware Partnership\*\* — A dedicated Voxel recording device (like a Rabbit R1 for thoughts)

\---

\#\# Summary

\*\*Voxel\*\* isn't another notes app. It's a \*\*thinking amplifier\*\* designed for people whose minds move faster than their fingers. The combination of:

1\. \*\*Zero-friction voice capture\*\* (one tap, speak, done)  
2\. \*\*AI crystallization\*\* (raw thought → structured artifact)  
3\. \*\*The Thought Graph\*\* (discover patterns you didn't know existed)

...creates a product that's genuinely unique, deeply useful, and increasingly valuable over time. The more you use it, the more it understands your thinking — creating a powerful retention loop that's hard to replicate.

The editorial aesthetic, premium animations, and thoughtful micro-interactions ensure it \*feels\* like a top-tier product from day one, while the freemium model and clear upgrade path make it a sustainable business.

\*\*Build the MVP in 6 weeks. Ship it. Let users' voices guide what comes next.\*\*

\---

\*Document Version: 2.0\*  
\*Product Lead: Senior PM\*  
\*Last Updated: 2025\*  
