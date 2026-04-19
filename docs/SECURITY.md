# SECURITY.md - Security & Privacy Documentation

## VoiceAction Security Architecture

---

## 1. Security Overview

### Security Principles
| Principle | Implementation |
|-----------|----------------|
| **Defense in Depth** | Multiple layers of protection |
| **Least Privilege** | Minimal data exposure |
| **Fail Securely** | Safe defaults on errors |
| **Privacy by Design** | Local-first data storage |

---

## 2. Input Validation & Sanitization

### XSS Prevention

#### Sanitization Function
```typescript
// File: src/utils/sanitization.ts
export const sanitize = (str: string): string => {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};
```

#### Sanitization Flow
```
┌─────────────────────────────────────────────────────────────────┐
│                     SANITIZATION PIPELINE                        │
│                                                                  │
│  User Input                                                      │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              HTML Entity Encoding                        │   │
│  │  < → &lt;    > → &gt;    " → &quot;              │   │
│  │  & → &amp;   ' → &#039;                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│      │                                                          │
│      ▼                                                          │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Validation Check                              │   │
│  │  - Empty string returns ''                              │   │
│  │  - Type safety via TypeScript                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│      │                                                          │
│      ▼                                                          │
│  Safe Output                                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Usage in Notes
```typescript
// File: src/hooks/useNotes.ts
const sanitizeNote = (note: Note): Note => ({
  ...note,
  title: sanitize(note.title),        // Sanitize title
  content: sanitize(note.content),    // Sanitize content
  body: note.body ? sanitize(note.body) : '',  // Sanitize body
  tags: note.tags?.map(sanitize) || [],        // Sanitize tags
});
```

---

## 3. Data Protection

### Local Storage Security
```
┌─────────────────────────────────────────────────────────────────┐
│                    LOCALSTORAGE SECURITY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  WHAT'S STORED:                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐          │
│  │ voiceaction_user     │  │ Notes Data           │          │
│  │ - User ID           │  │ - Titles             │          │
│  │ - Name              │  │ - Content            │          │
│  │ - Email             │  │ - Attachments        │          │
│  │ - Created Timestamp │  │ (base64 encoded)    │          │
│  └──────────────────────┘  └──────────────────────┘          │
│                                                                  │
│  SECURITY MEASURES:                                             │
│  ✓ Data sandboxed to app origin                                 │
│  ✓ Not accessible to other domains                             │
│  ✓ Cleared on logout                                           │
│  ✓ XSS sanitization on read/write                              │
│                                                                  │
│  POTENTIAL RISKS:                                               │
│  ⚠ Vulnerable to XSS (mitigated by sanitization)              │
│  ⚠ Local device access (user responsibility)                  │
│  ⚠ No encryption at rest (future enhancement)                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Sensitive Data Handling
```typescript
// What's NOT stored in localStorage:
// - Passwords (handled in-memory only during session)
// - API keys (environment variables only)
// - Session tokens (not implemented in current version)

// Future: Encrypted storage
interface SecureStorage {
  encrypt(data: string, key: string): string;
  decrypt(data: string, key: string): string;
}
```

---

## 4. API Security

### Gemini API Key Protection
```
┌─────────────────────────────────────────────────────────────────┐
│                    API KEY PROTECTION                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  STORAGE:                                                       │
│  - Environment variables only (not in code)                    │
│  - .env.local (gitignored)                                     │
│  - Vite define plugin for runtime access                       │
│                                                                  │
│  ACCESS PATTERN:                                                │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐       │
│  │ .env.local │───▶│ vite.config  │───▶│ Runtime     │       │
│  │ GEMINI_API │    │   .ts define │    │ process.env │       │
│  │   _KEY     │    │   plugin     │    │   .KEY     │       │
│  └─────────────┘    └─────────────┘    └─────────────┘       │
│                                                                  │
│  GRACEFUL DEGRADATION:                                          │
│  - Check if key exists before API call                         │
│  - Console warning instead of crash                            │
│  - Fallback to manual note creation                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### API Request Security
```typescript
// Current: No auth token in requests
// Future enhancements:
const secureApiRequest = async (endpoint: string, data: any) => {
  // 1. Add CSRF token
  const csrfToken = getCsrfToken();
  
  // 2. Use HTTPS
  const response = await fetch(`https://api.example.com${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken,
      // Future: 'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
    credentials: 'same-origin'
  });
  
  return response.json();
};
```

---

## 5. Authentication Security

### Current Implementation (Mocked)
```
┌─────────────────────────────────────────────────────────────────┐
│                    AUTH SECURITY (CURRENT)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IMPLEMENTATION: localStorage-based session                      │
│                                                                  │
│  USER OBJECT:                                                   │
│  {                                                              │
│    id: "user_1",           // Anonymous ID                     │
│    name: "John",           // From email prefix                │
│    email: "john@example.com",                                 │
│    createdAt: 1234567890   // Unix timestamp                  │
│  }                                                              │
│                                                                  │
│  SECURITY NOTES:                                                 │
│  ⚠ No password verification (mocked)                           │
│  ⚠ No token expiration                                         │
│  ⚠ Vulnerable to session hijacking                            │
│  ⚠ No MFA support                                              │
│                                                                  │
│  MITIGATIONS:                                                   │
│  ✓ Clear session on logout                                     │
│  ✓ Sanitize all user input                                     │
│  ✓ Validate data on read                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Future Authentication (Planned)
```typescript
// Firebase Auth (future implementation)
import { 
  getAuth, 
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut as firebaseSignOut
} from 'firebase/auth';

interface AuthSecurity {
  // Token-based sessions
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  
  // Security features
  emailVerified: boolean;
  MFAEnabled: boolean;
  
  // Session management
  lastSignInTime: string;
  createdAt: string;
}
```

---

## 6. Error Handling Security

### Secure Error Messages
```
┌─────────────────────────────────────────────────────────────────┐
│                    ERROR MESSAGE SECURITY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  USER-FACING ERRORS:                                            │
│  ┌────────────────────────┐  ┌────────────────────────┐       │
│  │  Generic Messages     │  │  Technical Details     │       │
│  ├────────────────────────┤  ├────────────────────────┤       │
│  │ "Something went wrong"│  │ Console only:         │       │
│  │ "Please try again"   │  │ - Stack traces        │       │
│  │ "Check your input"  │  │ - API error codes     │       │
│  └────────────────────────┘  │ - File paths          │       │
│                              │ - System info         │       │
│                              └────────────────────────┘       │
│                                                                  │
│  ERROR LOGGING:                                                 │
│  - Console.error() for debugging                               │
│  - No PII in logs                                              │
│  - Sanitize before logging                                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Error Boundary Security
```typescript
// File: src/components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component {
  componentDidCatch(error: any, errorInfo: any) {
    // Log to console only (not external service)
    console.error('ErrorBoundary caught an error', error, errorInfo);
    
    // Future: Send to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { extra: errorInfo });
  }
  
  render() {
    // Show generic error message
    if (this.state.hasError) {
      return <GenericErrorMessage />;
    }
    return this.props.children;
  }
}
```

---

## 7. Privacy Considerations

### Data Collection
```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA COLLECTION POLICY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  MINIMAL DATA PRINCIPLE:                                         │
│                                                                  │
│  ✓ Collect only what's necessary                                │
│  ✓ No third-party analytics (current)                          │
│  ✓ No tracking cookies                                          │
│  ✓ No data sold to third parties                               │
│                                                                  │
│  USER DATA RIGHTS:                                               │
│  ✓ Export all data (Markdown/CSV)                               │
│  ✓ Delete all data (logout clears localStorage)                │
│  ✓ No account required (local-first)                          │
│                                                                  │
│  FUTURE CONSIDERATIONS:                                          │
│  - Anonymous analytics (opt-in)                                 │
│  - Cloud sync (user-controlled)                                │
│  - Data residency options                                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Privacy Settings
```typescript
// File: src/Settings.tsx
interface PrivacySettings {
  biometric: boolean;       // Future: FaceID/TouchID
  encryption: boolean;      // Future: Local encryption
  analytics: boolean;       // Future: Anonymous usage data
}

const privacyOptions = {
  biometric: {
    label: "Biometric Lock",
    description: "Require FaceID or Fingerprint to open the app."
  },
  encryption: {
    label: "Local Encryption",
    description: "Encrypt all local storage data with a custom key."
  },
  analytics: {
    label: "Anonymous Analytics",
    description: "Help us improve by sharing non-identifiable usage data."
  }
};
```

---

## 8. Security Best Practices Implemented

### Implemented Measures
```
┌─────────────────────────────────────────────────────────────────┐
│                 SECURITY MEASURES CHECKLIST                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  INPUT VALIDATION                    ✅                        │
│  - XSS sanitization                  ✅                        │
│  - TypeScript type safety            ✅                        │
│  - Form validation                   ✅                        │
│                                                                  │
│  OUTPUT ENCODING                      ✅                        │
│  - React escapes by default          ✅                        │
│  - Sanitize before render            ✅                        │
│                                                                  │
│  ERROR HANDLING                       ✅                        │
│  - Generic error messages            ✅                        │
│  - Error boundaries                  ✅                        │
│  - Safe fallbacks                    ✅                        │
│                                                                  │
│  AUTHENTICATION                       🔲 (Mocked)              │
│  - Password verification              🔲                        │
│  - Token-based sessions              🔲                        │
│  - MFA support                       🔲                        │
│                                                                  │
│  DATA PROTECTION                      🔲 (Future)               │
│  - Encryption at rest                🔲                        │
│  - Secure storage                    🔲                        │
│  - HTTPS only                        🔲                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Security Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURITY LAYERS                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              PRESENTATION LAYER                           │   │
│  │  - React's default XSS protection                       │   │
│  │  - Sanitized content rendering                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              INPUT VALIDATION LAYER                      │   │
│  │  - sanitize() function                                  │   │
│  │  - TypeScript type checking                             │   │
│  │  - Form validation                                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              BUSINESS LOGIC LAYER                         │   │
│  │  - Error boundaries                                    │   │
│  │  - Graceful degradation                                │   │
│  │  - Console-only logging                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              STORAGE LAYER                               │   │
│  │  - Origin-scoped localStorage                          │   │
│  │  - Session clearing on logout                         │   │
│  │  - Future: encryption                                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              API LAYER                                   │   │
│  │  - Environment variable API keys                        │   │
│  │  - No exposed credentials                              │   │
│  │  - HTTPS enforced (future)                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 10. Future Security Enhancements

### Planned Improvements
```
┌─────────────────────────────────────────────────────────────────┐
│                 FUTURE SECURITY ENHANCEMENTS                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  PHASE 1:                                                       │
│  - Firebase Auth implementation                                  │
│  - Token-based sessions                                         │
│  - Secure cookie storage                                        │
│                                                                  │
│  PHASE 2:                                                       │
│  - End-to-end encryption for notes                              │
│  - AES-256 encryption at rest                                  │
│  - Secure key derivation                                        │
│                                                                  │
│  PHASE 3:                                                       │
│  - Biometric authentication (FaceID/TouchID)                   │
│  - MFA support                                                 │
│  - Certificate pinning                                          │
│                                                                  │
│  PHASE 4:                                                       │
│  - Security audit and penetration testing                       │
│  - SOC 2 compliance                                             │
│  - GDPR compliance                                              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Dependency Security
```bash
# Regular security audits
npm audit              # Check for vulnerabilities
npm audit fix         # Auto-fix vulnerabilities

# Keep dependencies updated
npm update            # Update to latest versions
npm outdated         # Check for outdated packages
```

---

## 11. Security Checklist for Development

### Before Deploying
- [ ] Run `npm audit` - No critical vulnerabilities
- [ ] Review environment variables - No secrets in code
- [ ] Test XSS sanitization - All inputs properly escaped
- [ ] Verify error messages - No sensitive data exposed
- [ ] Check localStorage - No PII stored without encryption
- [ ] Validate HTTPS - All external requests secure

### Code Review Security Questions
1. Does this code accept user input? → Is it sanitized?
2. Does this code store data? → Is it encrypted?
3. Does this code make API calls? → Are credentials secure?
4. Does this code display data? → Is output escaped?
5. Does this code handle errors? → Are messages generic?

---

*Document Version: 1.0*  
*Last Updated: March 2026*
