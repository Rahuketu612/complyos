# COMPLYOS Product Analytics
## Privacy-Safe, First-Party Analytics for Beta

---

## Overview

COMPLYOS uses lightweight first-party analytics to understand user behavior and improve the product. **No third-party analytics tools** (Google Analytics, Mixpanel, etc.) are used during the beta phase.

---

## What We Track

### User Actions
| Event | Category | Description |
|-------|----------|-------------|
| `user_login` | conversion | User logs in |
| `dashboard_view` | navigation | User views dashboard |
| `workspace_created` | action | New workspace created |
| `notice_created` | action | GST notice added |
| `notice_resolved` | conversion | Notice marked resolved |
| `thread_created` | action | Communication thread started |
| `document_uploaded` | action | Document uploaded |
| `task_completed` | conversion | Compliance task completed |
| `ai_summarize` | action | AI summarization used |
| `ai_insight` | action | AI insight generated |

### Error Events
| Event | Category | Description |
|-------|----------|-------------|
| `error_page_crash` | error | Page crashed |
| `error_api_failed` | error | API call failed |
| `error_runtime` | error | Runtime exception |

---

## Data Collected

### Event Data Structure
```typescript
interface AnalyticsEvent {
  id: string
  tenantId: string        // Tenant for isolation
  userId?: string         // User performing action
  workspaceId?: string    // Workspace context
  
  eventType: string       // e.g., "dashboard_view"
  eventCategory: string   // "navigation" | "action" | "conversion" | "error"
  severity?: string       // "info" | "warning" | "error"
  
  page?: string           // Route/path
  action?: string         // Button clicked, form submitted
  target?: string         // Entity type affected
  
  metadata?: Record       // Flexible JSON
  ipAddress?: string      // Hashed for privacy
  
  createdAt: DateTime
}
```

### Privacy-Safe Fields
- **IP Address**: Hashed (not stored raw)
- **User Agent**: Stored for debugging only
- **No PII**: No names, emails, or sensitive data

---

## Storage

### Database Tables
- `AnalyticsEvent`: All tracking events
- `Feedback`: User-submitted feedback
- `OnboardingProgress`: User onboarding status

### Data Retention
- Events kept for 90 days
- Older events aggregated and deleted
- Feedback kept indefinitely for product improvement

---

## Analytics Dashboard

### Pilot Admin Metrics
Available at `/admin/metrics` (admin-only):

| Metric | Description |
|--------|-------------|
| Active Users | Users who logged in last 7 days |
| Active Workspaces | Workspaces with recent activity |
| AI Usage | Number of AI requests |
| Notices Resolved | Resolution rate |
| Overdue Tasks | Compliance risk indicator |
| Activity Trends | Daily logins and actions |

### Usage Limits
Displayed in dashboard:
- Workspaces used / limit
- Users used / limit
- Documents used / limit
- AI requests today / limit

---

## Event Collection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Web App)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  User Action    →    Track Event    →    Batch Events      │
│  (click, etc.)       (immediate)         (every 30s or     │
│                                          on page leave)     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (CA Service)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Receive Events → Validate → Store → Update Metrics         │
│                                                             │
│  Response: { success: true, eventId: "..." }              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     DATABASE (PostgreSQL)                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  analytics_events table                                     │
│  - Tenant-isolated                                          │
│  - Indexed by tenantId, eventType, createdAt               │
│  - Partitioned by month (future)                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## No Third-Party Analytics

### Why?
1. **Privacy**: User data stays in our infrastructure
2. **Compliance**: GDPR/CCPA compliant by default
3. **Control**: Full control over data and insights
4. **Performance**: No external script loading

### Future (Post-Beta)
When ready for production:
- Consider self-hosted analytics (Plausible, PostHog)
- Option for enterprise customers to opt-out
- Anonymized aggregate reporting

---

## Frontend Integration

### Using the Analytics Hook
```typescript
import { useAnalytics } from '@/hooks/useAnalytics'

function MyComponent() {
  const { track } = useAnalytics()
  
  const handleClick = () => {
    track({
      eventType: 'button_click',
      action: 'click',
      target: 'my_button',
      page: '/dashboard',
    })
  }
}
```

### Using Convenience Methods
```typescript
// Track login
trackLogin(userId)

// Track dashboard view
trackDashboardView(userId, workspaceId)

// Track task completion
trackTaskCompleted(userId, taskId)
```

---

## Error Tracking

### Client Errors (Frontend)
- Caught by `ErrorBoundary` component
- Stored in localStorage (synced to backend)
- Maximum 50 errors kept locally

### API Errors (Backend)
- Caught by global exception filter
- Logged via `ErrorTrackingService`
- Viewable in admin metrics

---

## Analytics Privacy

### Data Minimization
- Only collect what's necessary
- No cookies for tracking
- No cross-site tracking
- Session-based only

### User Control
- Users can request data export
- Users can request data deletion
- No personal identification

### Security
- Tenant isolation enforced
- IP addresses hashed
- Access logged in audit trail

---

## Future Enhancements

| Feature | Priority | Timeline |
|---------|----------|----------|
| Real-time dashboard | MEDIUM | Q3 2026 |
| Funnel analysis | MEDIUM | Q3 2026 |
| Cohort tracking | LOW | Q4 2026 |
| A/B testing framework | LOW | Q4 2026 |

---

## Questions?

- **Documentation**: docs/PILOT_FEEDBACK_PROCESS.md
- **Email**: contact@complyos.com

---

*Last updated: May 2026*
