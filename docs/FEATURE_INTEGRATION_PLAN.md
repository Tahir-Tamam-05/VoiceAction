# FEATURE_INTEGRATION_PLAN.md

## VoiceAction — Next Feature Integration Plan

> **Document Version:** 1.0  
> **Date:** March 2026  
> **App Version Base:** v1.0.4  
> **Author:** Architecture Review

---

## Preamble: Integration Principles

Before every feature decision, five questions must be answered:

1. Does this serve a user who is capturing a thought **right now**?
2. Does this add cognitive overhead to the primary flow (Record → Save)?
3. Does it bloat the Note data model beyond reasonable size?
4. Can it be introduced without cloud infrastructure (Firebase not yet live)?
5. Does it align with the "thermal/editorial" design language?

If a feature fails tests 1 or 4, it is **deferred**. If it fails test 2, it must be redesigned to be invisible by default.

---

## Feature Dependency Map

```
LocalStorage (current) ──────────────────────────────────────┐
                                                              │
Gemini AI (current) ──┬──► Smart Tagging (F2)                │
                      └──► AI Cover Generation (F5)          │
                           Multi-Lang Translation (F8)        │
                                                              │
Note Data Model ──────┬──► Smart Tagging (F2)                │
                      ├──► Note Linking (F4)                  │
                      └──► Flashcard Mode (F10)              │
                                                              │
Firebase Auth (WIP) ──┬──► Project Rooms (FR) ──────────────┤
                      └──► Collaboration features            │
                                                              │
Web APIs ─────────────┬──► Wake Word Capture (F7)            │
                      └──► Multi-Language (speech) (F8)      │
                                                              │
                   ALL → localStorage ──────────────────────┘
```

**Critical prerequisite**: Project Rooms (FR) **cannot ship** before real Firebase Auth and Firestore are live. All other features can ship against LocalStorage.

---

---

# FEATURE 2 — Smart Tagging & Auto-Categorization

## Feature Overview

Automatically assign semantic tags to a note at the moment of AI processing, eliminating the manual tagging step entirely. Tags become a first-class organizational layer surfaced in Search and History filters.

## Problem It Solves

Users currently add tags manually (if at all). The result: most notes have no tags, making the `BUSINESS`, `FOCUS`, `PERSONAL` filter system in Search/History nearly useless in practice. AI already reads the full note — tagging is 0 extra API cost.

## Analysis & Validation

**Fits product vision?** YES. The entire app thesis is "AI does the work." Auto-tagging is the most natural extension of the existing `processVoiceNote()` Gemini call.

**Conflicts?** The `Note` type already has `tags?: string[]`. This is a **zero-model-change feature** for the note itself. The only change is populating it via AI rather than manually.

**Weak spots in the original idea:**
- "Suggests" vs "applies" tags: suggestion creates friction (user must confirm). We apply automatically and allow inline removal. This is cleaner.
- Tag vocabulary must be bounded. Unbounded AI-generated tags create chaos (e.g., "#WorkMeetingAboutDesign"). We maintain a fixed taxonomy of ~20 tags with an "Other" escape hatch.

## Refined Feature Description

At note creation time (voice or text), the Gemini prompt is extended to return a `tags` array. The note auto-saves with these tags. In the Home screen, each NoteCard chip shows the top 2 tags. In EditNote, the user sees all tags and can add/remove them. No confirm dialog, no suggestion UI — it just works.

**Tag Taxonomy (fixed, uppercase, as per existing convention):**
```
Work, Personal, Idea, Urgent, Health, Finance, Travel,
Learning, Creative, Social, Shopping, Reminder, Goal,
Research, Meeting, Project, Note, Reflection, Journal, Other
```

## UX Flow (Step-by-Step)

```
1. User records voice or types text
2. "Processing..." spinner appears (existing)
3. Gemini returns: { title, content, body, type, mood, tags: ["WORK","URGENT"] }
4. Note saved to localStorage with tags array populated
5. Home screen → NoteCard renders top 2 tag chips (e.g., [WORK] [URGENT])
6. User opens EditNote → sees all tags in a horizontal chip row
7. User taps [×] on a chip to remove it
8. User taps [+ Add Tag] → opens a small tag picker modal (bounded taxonomy)
9. Changes auto-save
```

**Fallback:** If Gemini returns no tags or AI is offline, the note is saved untagged. No blocking.

## UI Placement

| Location | Change |
|---|---|
| `NoteCard.tsx` | Render up to 2 tag chips below the note title (existing chips are already styled) |
| `EditNote.tsx` | Replace the static tag display with an editable chip row + picker |
| `geminiService.ts` | Extend `processVoiceNote()` prompt to include `tags` in the JSON response |
| `Search.tsx` | Filter now works properly since notes will have tags |
| `History.tsx` | Tag filter tabs become genuinely useful |

No new screens. No new navigation items.

## Data Structure Changes

```typescript
// types.ts — NO CHANGES NEEDED
// Note.tags?: string[] already exists

// geminiService.ts — PROMPT CHANGE ONLY
// Add to the JSON response schema:
// - tags: Array of 1–3 strings from the fixed taxonomy

// NEW utility: src/utils/tagHelpers.ts
export const TAG_TAXONOMY = [
  'WORK', 'PERSONAL', 'IDEA', 'URGENT', 'HEALTH',
  'FINANCE', 'TRAVEL', 'LEARNING', 'CREATIVE', 'SOCIAL',
  'SHOPPING', 'REMINDER', 'GOAL', 'RESEARCH', 'MEETING',
  'PROJECT', 'NOTE', 'REFLECTION', 'JOURNAL', 'OTHER'
] as const;

export type Tag = typeof TAG_TAXONOMY[number];

export const normalizeTags = (raw: string[]): Tag[] => {
  return raw
    .map(t => t.toUpperCase().trim() as Tag)
    .filter(t => TAG_TAXONOMY.includes(t))
    .slice(0, 3);
};
```

## API / Logic Flow

```
processVoiceNote(transcript) →
  Gemini prompt extended:
    "...also return: tags: An array of 1-3 tags from this exact
     list: [WORK, PERSONAL, IDEA, URGENT, HEALTH, FINANCE,
             TRAVEL, LEARNING, CREATIVE, SOCIAL, SHOPPING,
             REMINDER, GOAL, RESEARCH, MEETING, PROJECT, NOTE,
             REFLECTION, JOURNAL, OTHER]"
  
  Return shape:
  {
    title: string,
    content: string,
    body: string,
    type: 'voice' | 'text' | 'task' | 'idea',
    mood: string,
    tags: string[]   // ← NEW
  }

normalizeTags(response.tags) → Tag[]
note.tags = normalizedTags
useNotes.addNote(note) → localStorage.setItem(...)
```

## Edge Cases

| Case | Handling |
|---|---|
| AI returns tags outside taxonomy | `normalizeTags()` filters them out silently |
| AI returns > 3 tags | Slice to first 3 |
| AI offline / key missing | Note saves with `tags: []` |
| User manually tags then AI overwrites | AI tags only applied at creation; edits are user-controlled |
| Very short note ("buy milk") | Gemini will likely return `['SHOPPING']` — correct |

## Performance Considerations

- **Zero added latency**: Tags are part of the existing Gemini call, not a second request.
- **Zero added storage cost**: 3 short strings per note = negligible.
- **Render cost**: 2 pill chips per card. Negligible DOM overhead.

## Future Scalability

- Phase 2: User-defined custom tags (stored in `localStorage` as user preferences)
- Phase 3: Tag-based analytics ("You had 12 URGENT notes this week")
- Phase 3: AI-powered tag suggestions that learn from user corrections

## Implementation Phases

### Phase 1 — MVP (1–2 days)
- [ ] Extend `processVoiceNote()` Gemini prompt to request tags
- [ ] Create `src/utils/tagHelpers.ts` with `TAG_TAXONOMY` and `normalizeTags()`
- [ ] Wire tag normalization into `Recording.tsx` and text-capture flow
- [ ] Display top 2 tags on `NoteCard.tsx`

### Phase 2 — Enhancements (2–3 days)
- [ ] Editable tag chips in `EditNote.tsx`
- [ ] Tag picker modal with fixed taxonomy grid
- [ ] Fix Search/History filter tabs to work with real tags

### Phase 3 — Advanced (Future)
- [ ] Custom user tags
- [ ] Tag frequency analytics
- [ ] Tag-based note grouping view

---

---

# FEATURE 4 — Note Linking (Zettelkasten Style)

## Feature Overview

Allow a note's body to reference another note using `[[Note Title]]` wiki-link syntax. Tapping a link navigates directly to the referenced note. A "Linked Notes" panel in EditNote shows all incoming + outgoing connections.

## Problem It Solves

VoiceAction currently has flat, disconnected notes. Power users (researchers, writers, product thinkers) lose valuable context when related ideas are isolated. Linking transforms the app from a capture tool into a thinking tool — without adding complexity for casual users who never use it.

## Feature Assessment & Improvements Over Original Idea

**Original idea weakness:** The Zettelkasten system in full form (backlinks, graph view, etc.) is complex. For an MVP, we must resist scope creep.

**Our refined scope:**
- `[[Title]]` syntax auto-renders as a tappable chip in EditNote's body view
- No graph view (Phase 3 only)
- Backlinks shown in a collapsible "Connected Notes" section at the bottom of EditNote
- Links are resolved by title fuzzy-match (not ID) for UX simplicity

## UX Flow (Step-by-Step)

```
1. User opens EditNote for "Neural Interface Concept"
2. In the body text area, user types: "See also [[Design Sprint Kickoff Sync]]"
3. App detects [[...]] pattern in real-time (debounced)
4. On save, [[Design Sprint Kickoff Sync]] renders as a tappable blue chip
5. User taps chip → navigates to that note's EditNote
6. Back button returns to original note
7. In "Connected Notes" section: both notes show each other as linked
```

**Auto-suggest:** As user types `[[`, a dropdown appears with matching note titles. Tapping a title completes the link. Reduces typos.

## UI Placement

| Location | Change |
|---|---|
| `EditNote.tsx` | Parse `[[...]]` in body rendering; add auto-suggest dropdown; add "Connected Notes" section at bottom |
| `useNotes.ts` | Add `getLinkedNotes(noteId)` and `getBacklinks(noteId)` computed functions |
| `types.ts` | Add `linkedNoteIds?: string[]` to Note (resolved at save time) |
| `App.tsx` | No changes — EditNote already receives `onEditNote(id)` |

No new screens.

## Data Structure Changes

```typescript
// types.ts
export interface Note {
  // ... existing fields ...
  linkedNoteIds?: string[];  // ← NEW: resolved IDs at save time
  // body?: string already exists — links live here as [[Title]] text
}

// Parsing utility: src/utils/linkHelpers.ts (already exists — EXTEND IT)
// Add:
export const extractWikiLinks = (body: string): string[] => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
};

export const resolveLinks = (titles: string[], allNotes: Note[]): string[] => {
  return titles
    .map(title => {
      const found = allNotes.find(n =>
        n.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
      return found?.id;
    })
    .filter(Boolean) as string[];
};
```

## API / Logic Flow

```
On EditNote save:
  1. extractWikiLinks(note.body) → ['Design Sprint Kickoff Sync']
  2. resolveLinks(titles, allNotes) → ['5']
  3. note.linkedNoteIds = ['5']
  4. useNotes.updateNote(note) → localStorage

On EditNote render:
  1. Replace [[Title]] in body with <LinkedChip title="..." noteId="..." />
  2. getBacklinks(currentNoteId) → notes where linkedNoteIds.includes(currentId)
  3. Render "Connected Notes" section with both outgoing + incoming links
```

## Edge Cases

| Case | Handling |
|---|---|
| Linked note is deleted | Chip renders with strikethrough, tap shows "Note not found" toast |
| Same note linked twice | De-duplicate `linkedNoteIds` |
| Circular links (A→B→A) | Allowed; no infinite loop risk (no auto-traversal) |
| Title changes after link created | Re-resolve links on each EditNote open (cheap, uses in-memory notes) |
| `[[` typed mid-word | Suggest dropdown appears only after a space or newline before `[[` |

## Performance Considerations

- Link parsing is regex on `body` string — O(n) on note length. Negligible.
- `getBacklinks()` scans all notes' `linkedNoteIds` — O(n) on note count. Fine up to ~10,000 notes.
- No graph computation on render. Keep it simple.

## Future Scalability

- Phase 3: Visual graph/web view of connected notes
- Phase 3: "Orphaned notes" detection (notes with no links in or out)
- Phase 3: Cross-room linking when Project Rooms ship

## Implementation Phases

### Phase 1 — MVP (3 days)
- [ ] Add `linkedNoteIds?: string[]` to `types.ts`
- [ ] Extend `linkHelpers.ts` with `extractWikiLinks()` and `resolveLinks()`
- [ ] Auto-resolve and save links on note save in `useNotes.ts`
- [ ] Render `[[...]]` as tappable chips in `EditNote.tsx` body view

### Phase 2 — Enhancements (2 days)
- [ ] Auto-suggest dropdown when typing `[[`
- [ ] "Connected Notes" collapsible section in EditNote
- [ ] Deleted-note graceful handling (strikethrough chip)

### Phase 3 — Advanced (Future)
- [ ] Graph view screen
- [ ] Orphaned note detection

---

---

# FEATURE 5 — AI Cover Image Generation for Notes

## Feature Overview

A "Generate Cover" button in EditNote uses Gemini's image generation to create a unique abstract cover image for a note, stored as a data URI in the note's attachments. The image appears as a full-width banner at the top of the NoteCard and EditNote.

## Problem It Solves

VoiceAction notes are text-only. Cover images make the app feel personal, alive, and memorable — especially for "Idea" type notes that benefit from visual representation. Competitors (Notion, Bear) offer cover images but require user uploads. Gemini makes this generative and zero-friction.

## Feature Assessment & Hard Truths

**Concern 1 — Storage:** Base64 images can be 50–200KB each. With 100 notes all having covers, that's 5–20MB in localStorage. **localStorage is limited to ~5MB per domain.** This is a hard blocker.

**Solution:** Store image URLs rather than base64. Use Gemini's Imagen API (returns a URL or base64 chunk); on Phase 1 we store only the first 128×128 thumbnail in base64 (≈10KB) and add a "Load full" lazy mechanism. Better: Phase 2 migrates images to Firebase Storage.

**Concern 2 — Cost & Latency:** Image generation via Gemini takes 3–5 seconds and deducts from API quota. This must be explicitly user-triggered, never automatic.

**Concern 3 — Design coherence:** The "thermal/editorial" aesthetic uses dark, high-contrast visuals. Random AI images may clash. Solution: We constrain the generation prompt to produce abstract, dark-palette imagery matching the app's visual language.

## Refined Feature Description

In `EditNote.tsx`, a "✦ Generate Cover" button appears beneath the note type badge. Tapping it triggers a 2-step confirmation (to prevent accidental quota use), then calls Gemini Imagen with a constrained dark-abstract prompt. The result is a thumbnail stored in `note.coverImage?: string` (a separate field, not in attachments, to keep attachment logic clean). The image renders as a subtle gradient banner atop `NoteCard` and `EditNote`.

## UX Flow (Step-by-Step)

```
1. User opens EditNote for an "Idea" note
2. Sees "✦ Generate Cover" below the type badge (subtle, not prominent)
3. Taps → small confirmation tooltip: "Use AI to create a unique cover? (uses 1 API credit)"
4. Taps "Generate" → spinner appears in the cover slot (where image will be)
5. 3-5s later: cover image fades in — dark abstract, matching the note's theme
6. In NoteCard (Home/History), a thin 80px image banner appears at top of card
7. User can tap "🔄 Regenerate" or "✕ Remove Cover" in EditNote
8. Cover stores in note.coverImage as compressed thumbnail string
```

**No auto-generation on note creation.** Always user-initiated.

## UI Placement

| Location | Change |
|---|---|
| `EditNote.tsx` | "Generate Cover" button below type badge; image preview slot at top |
| `NoteCard.tsx` | Conditional image banner at top (80px height, object-cover) |
| `types.ts` | Add `coverImage?: string` to Note |
| `geminiService.ts` | Add `generateNoteCover(title, content, type)` function |

## Data Structure Changes

```typescript
// types.ts
export interface Note {
  // ... existing fields ...
  coverImage?: string;  // ← NEW: compressed thumbnail data URI or URL
}

// geminiService.ts — NEW FUNCTION
export const generateNoteCover = async (
  title: string,
  content: string,
  noteType: string
): Promise<string | null> => {
  const ai = getAI();
  if (!ai) return null;

  // Using Gemini's image generation capability
  // Constrain to dark thermal aesthetic
  const prompt = `Abstract digital art, dark background, high contrast,
    editorial aesthetic, no text, no people, representing: "${title}".
    Style: thermal monolith, dark gradients, geometric, cinematic.
    Type: ${noteType} note.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseModalities: ['IMAGE'] }
    });
    // Extract image data from response
    const imageData = response.candidates?.[0]
      ?.content?.parts?.find(p => p.inlineData)?.inlineData;
    if (!imageData) return null;
    return `data:${imageData.mimeType};base64,${imageData.data}`;
  } catch (err) {
    console.error('Cover generation failed:', err);
    return null;
  }
};
```

## Edge Cases

| Case | Handling |
|---|---|
| API fails / timeout | Show "Generation failed" toast; cover slot stays empty |
| Image too large for localStorage | Compress to 128×128 JPEG before storing (use canvas API) |
| Gemini returns non-dark image | Overlay a dark gradient CSS layer on top always |
| User regenerates many times | Rate-limit UI: 3 generations per note per session |
| Note has no title/content | Still generates with just type as context |

## Performance Considerations

- Image generation is async, non-blocking. App remains fully interactive during generation.
- Canvas compression before storage prevents localStorage overflow.
- NoteCard lazy-loads cover image only when it enters viewport.
- Target: < 15KB per cover image after compression.

## Future Scalability

- Phase 2: Firebase Storage for full-res cover images (remove base64 from Firestore)
- Phase 3: Cover style themes (user picks: "Abstract", "Minimal", "Photography")
- Phase 3: Auto-generate cover on note creation (only when user enables it in Settings)

## Implementation Phases

### Phase 1 — MVP (2–3 days)
- [ ] Add `coverImage?: string` to `Note` type
- [ ] Add `generateNoteCover()` to `geminiService.ts`
- [ ] "Generate Cover" button + confirmation in `EditNote.tsx`
- [ ] Canvas compression utility in `src/utils/imageHelpers.ts`
- [ ] Conditional cover banner in `NoteCard.tsx`

### Phase 2 — Enhancements (2 days)
- [ ] Regenerate / Remove cover actions
- [ ] Loading skeleton in cover slot during generation
- [ ] Viewport-based lazy loading of cover images in note lists

### Phase 3 — Advanced (Future)
- [ ] Firebase Storage migration
- [ ] Cover style selector

---

---

# FEATURE 7 — Hands-Free "Wake Word" Capture

## Feature Overview

A persistent (opt-in) background listener that starts recording when the user speaks a trigger phrase — "Hey VoiceAction" — without opening the app or tapping any button.

## Problem It Solves

The app's core value is frictionless capture. But even "tap mic, speak, done" requires 2 hands. Wake word capture enables true ambient capture: driving, cooking, exercising. This is a genuine differentiator.

## Feature Assessment — Critical Realities

**This feature is the most technically restricted of all proposals. Here is the honest analysis:**

| Constraint | Detail |
|---|---|
| **Browser (PWA):** | Web browsers do NOT allow persistent background audio listening. The Web Speech API only works while the page is active and focused. |
| **Mobile Web:** | iOS Safari stops all JS execution when the tab is in background. No wake word possible. |
| **Android Chrome:** | Partial: Chrome can run service workers in background, but microphone access in a service worker is not permitted by any browser. |
| **Native App only:** | True wake word capability requires React Native + a native audio module (e.g., `@picovoice/porcupine-react-native`). |

**Verdict:** This feature **cannot be implemented in the current web/PWA stack**. Shipping a half-baked version (e.g., "we listen while app is open") is misleading and not what users expect.

## Refined Feature: "Quick Capture Shortcut" (Realistic MVP)

Instead of true wake word (impossible in browser), we deliver the highest-friction-reduction possible within the web platform:

1. **PWA Shortcut:** When the app is installed as a PWA, add a home screen shortcut that deep-links directly to the Recording screen. One tap → microphone active.
2. **Keyboard Shortcut:** On desktop, `Space` key or `Cmd+Shift+V` instantly starts recording from any screen.
3. **Settings Toggle:** "Quick Capture Mode" — when enabled, the app opens directly to the Recording screen (not Home) on launch.
4. **Widget Placeholder:** Document the mobile app requirement clearly; the real wake word ships in the React Native version.

## UX Flow (Step-by-Step)

```
[PWA Shortcut Path]
1. User adds app to home screen
2. A separate "Record" icon appears on home screen (PWA shortcut)
3. Tapping it opens the app directly on Recording screen
4. Mic activates automatically (Settings: "Auto-start mic on Record screen")

[Keyboard Shortcut Path]
1. User has app open in browser tab (background is fine)
2. Presses Space or Cmd+Shift+V
3. App navigates to Recording screen; mic starts

[Quick Launch Mode (Settings)]
1. User enables "Quick Launch" in Settings
2. Every app open starts on Recording screen
3. One tap → already recording
```

## UI Placement

| Location | Change |
|---|---|
| `Settings.tsx` | New "Quick Capture" section with toggle for auto-start |
| `Recording.tsx` | Accept URL param `?autostart=true` to auto-activate mic |
| `vite.config.ts` / `manifest.json` | Add `shortcuts` array for PWA shortcut |
| `App.tsx` | Listen for `Space` / `Cmd+Shift+V` keyboard event globally |

## Data Structure Changes

```typescript
// No Note model changes needed.

// Settings localStorage key:
// 'va_setting_quicklaunch' = 'true' | 'false'
// 'va_setting_automic' = 'true' | 'false'

// manifest.json — PWA shortcuts:
{
  "shortcuts": [
    {
      "name": "Record Voice Note",
      "short_name": "Record",
      "url": "/?screen=recording&autostart=true",
      "icons": [...]
    }
  ]
}
```

## Edge Cases

| Case | Handling |
|---|---|
| User doesn't install as PWA | Shortcut not available; keyboard shortcut still works |
| Mic permission not granted | Navigate to Record screen; show permission prompt as normal |
| Auto-start conflicts on iOS | Disable auto-start on iOS (user gesture required for mic) |

## Performance Considerations

- No persistent background listeners = zero battery/CPU overhead.
- Keyboard listener uses `useEffect` cleanup properly to avoid leaks.

## Honest Note for Future Planning

> **True wake word requires a React Native (mobile) app.** This should be the primary motivation for prioritizing the mobile app in Phase 4 of the existing roadmap. The Picovoice Porcupine SDK supports custom wake phrases and works offline. Plan this as a native feature, not a web feature.

## Implementation Phases

### Phase 1 — MVP (1 day)
- [ ] "Quick Launch Mode" toggle in Settings (`va_setting_quicklaunch`)
- [ ] `App.tsx` reads setting and navigates to Recording on open
- [ ] `Recording.tsx` accepts `?autostart=true` URL param

### Phase 2 — Enhancements (1 day)
- [ ] Global keyboard shortcut (`Space` / `Cmd+Shift+V`) for instant recording
- [ ] Add PWA `shortcuts` in `manifest.json`

### Phase 3 — Advanced (Requires Native App)
- [ ] React Native app
- [ ] Picovoice Porcupine wake word integration
- [ ] Custom wake phrase configuration

---

---

# FEATURE 8 — Multi-Language Translation

## Feature Overview

A "Translate" button in the EditNote screen that sends the note's content to Gemini and returns a translated version in a user-selected target language. The translation appears as a read-only panel below the original text, never overwriting it.

## Problem It Solves

VoiceAction already does multilingual voice capture (Web Speech API supports many languages). But the output note is in the spoken language. A traveler who dictates in Spanish may want the note in English for sharing. Translation bridges the language barrier without requiring a separate tool.

## Feature Assessment & Improvements

**Original idea weakness:** "Auto-translate on capture" is too aggressive. Users dictating in their native language don't want automatic translation. "Translate button in EditNote" is the right call.

**Additional refinement:** The translation should be **additive, never destructive**. The original text is never replaced. The translation panel is a collapsible section below the body.

**Language detection:** Gemini auto-detects source language. User only selects target language.

## Refined Feature Description

In `EditNote.tsx`, a "🌐 Translate" button appears in the action bar. Tapping opens a compact bottom sheet with a language selector (20 common languages). Selecting a language triggers a Gemini call, and the translated text appears in a "Translation" panel below the original body. The translation is saved in `note.translation` and toggled visible/hidden.

## UX Flow (Step-by-Step)

```
1. User opens EditNote for a note dictated in Spanish
2. Taps "🌐 Translate" in the action bar
3. Bottom sheet opens: "Translate to: [Language Picker]"
4. User selects "English (EN)"
5. Sheet closes; "Translating..." skeleton appears in a panel below body
6. 2-3 seconds: Translated text fades in under a "🌐 English Translation" header
7. Original text remains unchanged above
8. Translation is auto-saved in the note
9. Next time user opens this note: translation panel is already there (collapsed by default)
10. User taps "Hide Translation" to collapse it
```

## UI Placement

| Location | Change |
|---|---|
| `EditNote.tsx` | "Translate" button in action bar; translation panel below body |
| `geminiService.ts` | Add `translateNote(text, targetLang)` function |
| `types.ts` | Add `translation?: { lang: string; text: string; updatedAt: number }` to Note |
| New component | `src/components/TranslationPanel.tsx` |

## Data Structure Changes

```typescript
// types.ts
export interface Note {
  // ... existing fields ...
  translation?: {
    lang: string;        // e.g., 'en', 'fr', 'ar'
    langLabel: string;   // e.g., 'English', 'French'
    text: string;        // translated content
    updatedAt: number;   // timestamp of translation
  };
}

// SUPPORTED_LANGUAGES constant (src/utils/translationHelpers.ts)
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh', label: 'Chinese (Simplified)' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'hi', label: 'Hindi' },
  { code: 'tr', label: 'Turkish' },
  { code: 'it', label: 'Italian' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'sv', label: 'Swedish' },
  { code: 'id', label: 'Indonesian' },
  { code: 'th', label: 'Thai' },
  { code: 'vi', label: 'Vietnamese' },
  { code: 'uk', label: 'Ukrainian' },
] as const;
```

## API / Logic Flow

```typescript
// geminiService.ts — NEW FUNCTION
export const translateNote = async (
  text: string,
  targetLangCode: string,
  targetLangLabel: string
): Promise<string | null> => {
  const ai = getAI();
  if (!ai) return null;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate the following note to ${targetLangLabel}.
      Preserve the original meaning and tone. Do not add comments.
      Return ONLY the translated text, nothing else.
      
      Text: """${text}"""`,
  });

  return response.text?.trim() || null;
};
```

## Edge Cases

| Case | Handling |
|---|---|
| Source = target language | Show "Already in this language" toast; no API call |
| Note body is empty | Translate `content` field as fallback |
| AI returns partial translation | Store as-is; show "Partial" indicator |
| User re-translates to different language | Overwrite `note.translation` with new lang |
| RTL languages (Arabic, Hebrew) | TranslationPanel applies `dir="rtl"` conditionally |

## Performance Considerations

- Translation is always user-triggered, never automatic.
- One Gemini text call: fast (< 2s for typical note length).
- Translation stored in note to avoid re-translating on every open.
- Stale indicator shown if note body changed after translation (`updatedAt` comparison).

## Future Scalability

- Phase 3: Per-note language tagging (auto-detect on creation)
- Phase 3: Global translation preference (always show English below primary)
- Phase 3: Voice playback of translated text (TTS via Web Speech API)

## Implementation Phases

### Phase 1 — MVP (2 days)
- [ ] Add `translation` field to `Note` type
- [ ] `translateNote()` function in `geminiService.ts`
- [ ] `TranslationPanel.tsx` component (with RTL support)
- [ ] "Translate" button + language picker in `EditNote.tsx`

### Phase 2 — Enhancements (1 day)
- [ ] Stale translation indicator
- [ ] Collapse/expand toggle persisted per session
- [ ] Language preference saved in Settings

### Phase 3 — Advanced (Future)
- [ ] Auto-language detection tag on note creation
- [ ] TTS playback of translation

---

---

# FEATURE 10 — Flashcard Mode

## Feature Overview

A dedicated review mode that surfaces Idea-type notes as a swipeable flashcard deck. Each card shows the note title as the "question" and the body as the "answer" (revealed on tap). Session results (remembered / again) are tracked to implement spaced repetition.

## Problem It Solves

Users capture ideas but rarely review them. A Flashcard Mode creates a daily review ritual, making VoiceAction a learning tool, not just a capture tool. This is a significant UX differentiator — no competitor note app does this cleanly.

## Feature Assessment & Improvements

**Original idea weakness:** "Turns notes into flashcards" is vague. We need to define:
- Which notes become flashcards? (Not all — only Idea type by default)
- What is the "question" side? (Title)
- What is the "answer" side? (Body)
- Is there retention logic? (Basic spaced repetition)

**Refined scope:**
- Only `type: 'idea'` notes are included by default
- Users can manually mark any note as "flashcard-enabled" via a toggle in EditNote
- Session is a standalone screen (new `Screen` type: `'flashcards'`)
- Swipe right = "Got it", Swipe left = "Review again"
- Basic SM-2 algorithm (next review in N days) tracked in localStorage

## UX Flow (Step-by-Step)

```
1. User taps "Flashcard Mode" button in History screen's top-right area (or Settings)
2. New screen: "Review Session" — shows "12 cards ready"
3. Card 1: Front side = Note title ("Neural Interface Concept Design")
4. User taps card → flips with 3D animation → reveals body text as "answer"
5. Two action buttons appear: "Again" (↩) and "Got it" (✓)
6. "Got it" → card marked reviewed; next review scheduled in 3 days
7. "Again" → card goes to back of today's deck
8. After all cards: "Session Complete" screen with stats (8/12 reviewed)
9. Session stats saved; next session shows only due cards
```

## New Screen Component

`src/Flashcards.tsx` — A new full-screen component with:
- Card flip animation (CSS 3D transform)
- Swipe gesture (left/right with Motion drag)
- Front/back sides
- Session progress bar
- End-of-session summary

## UI Placement

| Location | Change |
|---|---|
| `types.ts` | Add `Screen` union entry `'flashcards'`; add `flashcard` fields to Note |
| `History.tsx` | "Start Review" button in header (only visible if ≥1 flashcard-enabled note exists) |
| `EditNote.tsx` | Toggle: "Include in Flashcard Reviews" |
| `App.tsx` | Route `'flashcards'` → `<FlashcardsScreen />` |
| New screen | `src/Flashcards.tsx` |
| New hook | `src/hooks/useFlashcards.ts` |

## Data Structure Changes

```typescript
// types.ts
export type Screen = 'landing' | 'home' | 'search' | 'history' 
                   | 'settings' | 'recording' | 'edit' | 'flashcards'; // ← ADD

export interface Note {
  // ... existing fields ...
  flashcardEnabled?: boolean;   // ← NEW: user can toggle any note
  flashcardReview?: {
    nextReviewAt: number;       // timestamp for next due date
    interval: number;           // current interval in days (SM-2)
    easeFactor: number;         // SM-2 ease factor (default: 2.5)
    totalReviews: number;       // cumulative review count
    lastReviewedAt?: number;    // last session timestamp
  };
}

// src/hooks/useFlashcards.ts
export interface FlashcardSession {
  cards: Note[];          // due cards for today
  currentIndex: number;
  isFlipped: boolean;
  results: {
    remembered: string[]; // note IDs
    again: string[];      // note IDs
  };
}
```

## Spaced Repetition Logic (SM-2 Simplified)

```typescript
// src/utils/flashcardHelpers.ts

export const scheduleCard = (
  currentInterval: number,
  easeFactor: number,
  quality: 'got-it' | 'again'
): { interval: number; easeFactor: number; nextReviewAt: number } => {
  if (quality === 'again') {
    return {
      interval: 1, // review tomorrow
      easeFactor: Math.max(1.3, easeFactor - 0.2),
      nextReviewAt: Date.now() + 86400000
    };
  }
  
  const newInterval = currentInterval === 0 ? 1
    : currentInterval === 1 ? 3
    : Math.round(currentInterval * easeFactor);
  
  return {
    interval: newInterval,
    easeFactor: Math.min(easeFactor + 0.1, 3.0),
    nextReviewAt: Date.now() + newInterval * 86400000
  };
};

export const getDueCards = (notes: Note[]): Note[] => {
  const now = Date.now();
  return notes.filter(n => {
    if (!n.flashcardEnabled && n.type !== 'idea') return false;
    // Idea-type notes are auto-included
    if (n.type === 'idea' && !n.flashcardReview) return true;
    if (!n.flashcardReview) return n.flashcardEnabled ?? false;
    return n.flashcardReview.nextReviewAt <= now;
  });
};
```

## Edge Cases

| Case | Handling |
|---|---|
| 0 cards due | Show "No reviews today — all caught up! 🎉" state |
| Note has no body | Show content field on answer side instead |
| User exits session mid-way | Save progress; resume option on next open |
| 50+ cards due | Cap session at 20; show "20 of 50" and continue tomorrow |
| Note deleted during session | Skip silently; don't crash |

## Performance Considerations

- Card flip uses CSS `transform: rotateY(180deg)` — GPU accelerated.
- All session data is in-memory; only synced to localStorage at session end.
- `getDueCards()` is O(n) on note count — fine up to 10,000 notes.
- Motion swipe gestures are passive event listeners; no blocking.

## Future Scalability

- Phase 3: Custom card decks (user-defined collections)
- Phase 3: Session analytics (retention rate over time)
- Phase 3: Export deck as Anki format
- Phase 3: Image/audio on card (use note's cover image on front)

## Implementation Phases

### Phase 1 — MVP (3–4 days)
- [ ] Add `flashcardEnabled`, `flashcardReview` to `Note` type; add `'flashcards'` to `Screen`
- [ ] `flashcardHelpers.ts` with `getDueCards()` and `scheduleCard()`
- [ ] `useFlashcards.ts` hook
- [ ] `Flashcards.tsx` screen (front/back, flip animation, Again/Got It buttons)
- [ ] Route in `App.tsx`
- [ ] "Start Review" button in `History.tsx`

### Phase 2 — Enhancements (2 days)
- [ ] Swipe gesture (left/right) as alternative to buttons
- [ ] Session summary screen with stats
- [ ] "Include in Flashcarads" toggle in `EditNote.tsx`

### Phase 3 — Advanced (Future)
- [ ] Custom decks
- [ ] Anki export
- [ ] Session analytics dashboard

---

---

# FEATURE — Project Rooms (Collaborative Spaces)

## Feature Overview

A "Room" is a named shared workspace — a sub-collection of notes that multiple users can read and contribute to in real-time. Each room has a short Room ID for joining. Users switch between their Private Space and Rooms via a Space Switcher in the top bar.

## Problem It Solves

VoiceAction is currently a personal tool. But thought capture often happens in teams: design sprints, research groups, family planning. Project Rooms transforms VoiceAction from a personal journal into a lightweight team tool — without the complexity of full collaboration software.

## ⚠️ PREREQUISITE GATE: This Feature CANNOT Ship Until:

1. **Real Firebase Authentication is live** (currently 0% — see ROADMAP.md)
2. **Cloud Firestore is integrated** (currently 0%)
3. **Security rules are written and tested**

Attempting to build Rooms on top of localStorage is not viable. LocalStorage is device-local and cannot sync across users. **Do not begin Room implementation until Phase 2 of the existing roadmap is complete.**

## Architecture Design (For Future Implementation)

### Firestore Data Model

```
/rooms/{roomId}
  - roomId: string          // e.g., "XJ-902"
  - name: string            // "Design Sprint"
  - createdBy: string       // uid
  - memberUids: string[]    // all members
  - accentColor: string     // room accent (#FF6B35, etc.)
  - createdAt: timestamp
  - lastActivityAt: timestamp

/rooms/{roomId}/notes/{noteId}
  - ... (same Note fields as personal notes)
  - authorUid: string
  - authorName: string
  - seenBy: string[]        // uids who have opened this note

/users/{uid}/rooms: string[]   // list of joined roomIds (for quick lookup)
```

### Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Only room members can read/write notes
    match /rooms/{roomId} {
      allow read: if request.auth.uid in resource.data.memberUids;
      allow write: if request.auth.uid in resource.data.memberUids;
      
      match /notes/{noteId} {
        allow read: if request.auth.uid in 
          get(/databases/$(database)/documents/rooms/$(roomId)).data.memberUids;
        allow create: if request.auth.uid in 
          get(/databases/$(database)/documents/rooms/$(roomId)).data.memberUids;
        allow update, delete: if request.auth.uid == resource.data.authorUid;
      }
    }
  }
}
```

### Room ID Generation

```typescript
// Short, human-readable, URL-safe Room ID
export const generateRoomId = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
  let id = '';
  for (let i = 0; i < 6; i++) {
    if (i === 3) id += '-';
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id; // e.g., "XJ9-02K"
};
```

### Real-Time Sync Pattern

```typescript
// src/hooks/useRoomNotes.ts
export const useRoomNotes = (roomId: string) => {
  const [notes, setNotes] = useState<Note[]>([]);
  
  useEffect(() => {
    if (!roomId) return;
    
    // Firestore onSnapshot — real-time updates
    const unsub = onSnapshot(
      collection(db, 'rooms', roomId, 'notes'),
      (snapshot) => {
        const notes = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setNotes(notes.sort((a, b) => b.createdAt - a.createdAt));
      }
    );
    
    return () => unsub(); // cleanup on unmount
  }, [roomId]);
  
  return { notes };
};
```

### Space Switcher UI

A compact switcher appears in `TopBar.tsx` — the user's avatar area expands to show:
- **Private** (default, lock icon)
- Each joined room (colored badge with room name + accent)
- **+ New Room** / **Join Room** options

### Key Collaborative Features & When to Ship Them

| Feature | Phase |
|---|---|
| Room create/join | Phase 2 (Firestore live) |
| Real-time note sync | Phase 2 |
| Authorship labels on NoteCard | Phase 2 |
| "New since last visit" indicator | Phase 2 |
| Online presence indicators | Phase 3 |
| Threaded comments on notes | Phase 3 |
| Activity feed / "What's New" | Phase 3 |
| Per-room accent colors | Phase 2 |
| Live typing pulse animation | Phase 3 |

## Design: Thermal/Editorial Twist

- Each Room has an accent color (orange, electric blue, emerald, violet, rose)
- Room badge uses the accent as a left border or glow on NoteCard
- "Live Pulse" — a subtle `animate-ping` dot on the Room badge when a member is currently in the room (Phase 3, via Firestore presence protocol)

## New Screen & Components Required

| Component | Purpose |
|---|---|
| `Rooms.tsx` (new screen) | Room list, create, join |
| `RoomDetail.tsx` (new screen or modal) | Per-room note feed |
| `SpaceSwitcher.tsx` (new component) | TopBar switcher UI |
| `RoomBadge.tsx` (new component) | Colored room indicator on NoteCard |
| `CommentThread.tsx` (Phase 3) | In-note comment panel |

## Edge Cases (Design Now, Handle Later)

| Case | Handling |
|---|---|
| User removed from room | Firestore security rule blocks access; show "Room unavailable" |
| Room creator deletes room | Cascade delete all notes; notify members |
| Offline in a room | Notes visible from cache; write queue syncs when online |
| Duplicate Room ID collision | Check Firestore before confirming ID; regenerate if taken |
| 100+ notes in a room | Paginate with Firestore `limit()` + `startAfter()` |
| Member leaves room | Remove their UID from `memberUids`; notes authored by them remain |

## Performance Considerations

- `onSnapshot` is Firestore's most efficient listening pattern (differential updates).
- Presence protocol (online indicators) requires Firestore Realtime Database or a lightweight heartbeat — budget this for Phase 3.
- Large rooms (50+ members) may have high read counts — design security rules to minimize unnecessary reads.
- Per-room note feed is paginated from the start: `limit(20)`.

## Future Scalability

- Phase 3: Room templates (e.g., "Design Sprint", "Research Project")
- Phase 3: Exportable room as shared document (PDF, Markdown)
- Enterprise: SSO + admin controls for organizational rooms

## Implementation Phases

### Phase 1 — Prerequisite (Do First)
- [ ] Real Firebase Authentication (existing roadmap Phase 1)
- [ ] Cloud Firestore integration for personal notes (existing roadmap Phase 2)
- [ ] Write and test Firestore Security Rules

### Phase 2 — Room MVP (3–4 weeks after prerequisites)
- [ ] Room data model in Firestore
- [ ] `generateRoomId()` utility
- [ ] Rooms create/join screen
- [ ] `useRoomNotes()` hook with `onSnapshot`
- [ ] Space Switcher in TopBar
- [ ] Authorship labels on NoteCard (in-room context only)
- [ ] Per-room accent colors
- [ ] "New since last visit" unread indicator

### Phase 3 — Enhancements (2–3 weeks)
- [ ] Online presence indicators
- [ ] Threaded comments on notes
- [ ] Activity feed
- [ ] Live typing pulse animation

---

---

## Cross-Feature Priority Matrix

```
                     EFFORT
              Low        Medium      High        Very High
         ┌──────────┬──────────┬──────────┬──────────────┐
    High │  Smart   │ Multi-   │Flashcard │  Project     │
IMPACT   │  Tagging │ Language │  Mode    │  Rooms       │
         ├──────────┼──────────┼──────────┼──────────────┤
  Medium │ Quick    │  Note    │  AI      │              │
         │ Capture  │ Linking  │  Cover   │              │
         ├──────────┼──────────┼──────────┼──────────────┤
   Low   │          │          │          │  Wake Word   │
         │          │          │          │  (native)    │
         └──────────┴──────────┴──────────┴──────────────┘
```

## Recommended Implementation Order

| # | Feature | Justification | Estimated Effort |
|---|---|---|---|
| 1 | Smart Tagging (F2) | Zero-model-change, huge UX value, 0 extra API cost | 3–5 days |
| 2 | Quick Capture (F7 MVP) | Low effort, directly supports core value proposition | 1–2 days |
| 3 | Multi-Language Translation (F8) | Moderate effort, high international market value | 3 days |
| 4 | Note Linking (F4) | Moderate effort, power user differentiator | 5 days |
| 5 | Flashcard Mode (F10) | Higher effort, strong retention/learning angle | 6–8 days |
| 6 | AI Cover Images (F5) | Moderate effort, enhances visual identity | 4–5 days |
| 7 | Project Rooms (FR) | Requires Firebase prerequisite — plan after Firestore ships | 4–6 weeks |

---

## Architecture Impact Summary

```
Current Note type size: ~15 fields
After all features:     ~22 fields (no breaking changes — all new fields optional)

New files to create:
  src/utils/tagHelpers.ts         (F2)
  src/utils/flashcardHelpers.ts   (F10)
  src/utils/imageHelpers.ts       (F5)
  src/utils/translationHelpers.ts (F8)
  src/hooks/useFlashcards.ts      (F10)
  src/hooks/useRoomNotes.ts       (FR — future)
  src/components/TranslationPanel.tsx (F8)
  src/components/RoomBadge.tsx    (FR — future)
  src/components/SpaceSwitcher.tsx (FR — future)
  src/Flashcards.tsx              (F10)
  src/Rooms.tsx                   (FR — future)

Modified files:
  src/types.ts                    (all features — optional fields only)
  src/services/geminiService.ts   (F2, F5, F8)
  src/EditNote.tsx                (F4, F5, F8, F10)
  src/Home.tsx                    (F2, F5)
  src/History.tsx                 (F10)
  src/Settings.tsx                (F7, F8)
  src/App.tsx                     (F7, F10)
  src/components/NoteCard.tsx     (F2, F5)
  public/manifest.json            (F7)
  src/utils/linkHelpers.ts        (F4 — extend existing)
```

---

*Document Version: 1.0*  
*Created: March 2026*  
*Ready for: Engineering Review*
