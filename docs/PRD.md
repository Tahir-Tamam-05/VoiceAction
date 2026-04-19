# PRD - Product Requirements Document

## VoiceAction - AI-Powered Voice Notes Application

---

## 1. Product Overview

**VoiceAction** is an intelligent voice notes application that allows users to capture thoughts via voice recording or text input, processes them through AI (Gemini) to generate structured notes, and provides a beautiful editorial aesthetic with dark/light mode support.

### Core Value Proposition
- **Speak, Capture, Act** - Transform voice recordings into organized, actionable notes
- **Privacy-First** - Local storage with optional cloud sync
- **Editorial Intelligence** - AI-powered note structuring and summarization

---

## 2. User Stories

### Primary Users
1. **Note Takers** - Users who want quick voice-to-text capture
2. **Professionals** - Users capturing meeting notes, ideas, tasks
3. **Privacy-Conscious Users** - Users who want local-first data storage

### User Story Map

| Priority | Story | Acceptance Criteria |
|----------|-------|-------------------|
| P0 | Record Voice Note | User can tap mic, speak, and see live waveform. Stop to process. |
| P0 | AI Processing | Voice transcript sent to Gemini, returns structured note (title, summary, body, type, mood) |
| P0 | View Notes | User sees pinned notes first, then recent notes on home screen |
| P0 | Edit Note | User can modify title, content, body, type, attachments, pin status |
| P0 | Delete Note | User can delete with confirmation modal |
| P1 | Quick Capture | Text input on home screen sent to AI for instant note creation |
| P1 | Search Notes | Full-text search across title, content, body with filters |
| P1 | History Timeline | View all notes grouped by date with sorting options |
| P1 | Dark/Light Mode | Toggle between themes, persists preference |
| P2 | Export Notes | Download as Markdown or CSV |
| P2 | Attachments | Add links, images, files to notes |
| P2 | Streak Tracking | Track consecutive days of note creation |

---

## 3. Feature List

### Core Features
- [x] Voice recording with waveform visualization
- [x] AI-powered note generation (Gemini 1.5)
- [x] Note CRUD operations
- [x] Pin/unpin notes
- [x] Quick text capture with AI enhancement
- [x] Full-text search
- [x] History timeline view
- [x] Advanced filtering (date, type, tags, pinned)
- [x] Dark/Light theme toggle
- [x] Note attachments (links, images, files)
- [x] Data export (Markdown, CSV)
- [x] Streak calculation
- [x] Error boundary for graceful failures

### Authentication (Mocked)
- [x] Sign up / Sign in screens
- [x] Local storage-based session
- [x] Profile display with initials

---

## 4. Core User Flows

### Flow 1: Voice Recording
```
┌──────────┐    ┌────────────┐    ┌─────────────┐    ┌──────────┐
│ Tap Voice │───▶│ Recording  │───▶│ Stop Button │───▶│ Processing│
│   Mode    │    │  Started   │    │   Pressed   │    │   (AI)   │
└──────────┘    └────────────┘    └─────────────┘    └─────┬────┘
                                                            │
                                                            ▼
                                                    ┌──────────────┐
                                                    │ Note Created │
                                                    │   + Saved    │
                                                    └──────────────┘
```

### Flow 2: Quick Capture
```
┌──────────────┐    ┌─────────────┐    ┌────────────┐    ┌──────────┐
│ Type in Text │───▶│ Tap Save    │───▶│ AI Process │───▶│ Edit/View│
│   Input      │    │  Button     │    │   Request  │    │   Note   │
└──────────────┘    └─────────────┘    └────────────┘    └──────────┘
```

### Flow 3: Note Search
```
┌────────────┐    ┌───────────┐    ┌────────────┐    ┌─────────────┐
│ Enter Text │───▶│ Filters   │───▶│ AI Search  │───▶│ Results     │
│  in Search │    │ Applied   │    │  Query     │    │  Displayed │
└────────────┘    └───────────┘    └────────────┘    └─────────────┘
```

---

## 5. Screen Inventory

| Screen | Route | Purpose |
|--------|-------|---------|
| Landing | `/` | Brand introduction, CTA buttons |
| Sign In | `/signin` | Authentication form |
| Home | `/home` | Dashboard with pinned/recent notes |
| Recording | `/recording` | Voice capture with waveform |
| Search | `/search` | Full-text search with filters |
| History | `/history` | Timeline view of all notes |
| Edit Note | `/edit` | Note editing with attachments |
| Settings | `/settings` | Profile, preferences, export |

---

## 6. Success Metrics

### Engagement Metrics
- Daily Active Users (DAU)
- Notes created per user per day
- Voice vs text note ratio
- Average note length

### Retention Metrics
- 7-day retention rate
- Streak completion rate
- Return visit rate

### Performance Metrics
- Initial load time < 3s
- Voice recording latency < 100ms
- AI processing time < 5s

---

## 7. Non-Functional Requirements

### Performance
- Smooth 60fps animations
- Lazy loading for heavy components
- Optimized bundle size

### Accessibility
- Keyboard navigation support
- Screen reader friendly labels
- Sufficient color contrast

### Security
- XSS prevention via sanitization
- No sensitive data in logs
- Secure random ID generation

### Browser Support
- Chrome 90+
- Safari 14+
- Firefox 88+
- Edge 90+

---

## 8. Technical Constraints

### Current Limitations
- Authentication is mocked (localStorage only)
- No real backend (notes stored in localStorage)
- AI features require Gemini API key
- No offline mode (PWA not implemented)
- No real-time sync

### Dependencies
- Node.js 18+
- npm or yarn
- Gemini API key required for AI features

---

## 9. Future Considerations

### Phase 2 Features
- Real Firebase authentication
- Cloud Firestore for data persistence
- Push notifications
- Voice-to-text with Web Speech API
- PWA with service workers
- Offline support with IndexedDB

### Phase 3 Features
- Collaboration features
- Note sharing
- Categories/Folders
- Rich text editor
- Audio playback for voice notes

---

## 10. Glossary

| Term | Definition |
|------|------------|
| **Note** | A single voice/text entry with title, content, body, type, attachments |
| **Recording** | Voice capture session with live waveform |
| **AI Processing** | Gemini API call to structure raw transcript into note |
| **Streak** | Consecutive days with at least one note created |
| **Pinned Note** | Note prioritized at top of list |
| **Attachment** | Link, image, or file attached to note |

---

*Document Version: 1.0*  
*Last Updated: March 2026*
