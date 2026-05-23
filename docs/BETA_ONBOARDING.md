# COMPLYOS Beta Onboarding Guide
## For Pilot CA Firms

---

## Welcome to COMPLYOS Beta

Thank you for participating in the COMPLYOS closed beta. This guide helps you get started quickly and make the most of your trial period.

---

## Getting Started

### 1. Access COMPLYOS

**URL**: http://localhost:3000 (local) or your deployed URL

**Demo Credentials**:
```
Email: demo@complyos.com
Password: Demo@123
```

> These credentials have full access to demo data. For your own data, you'll create a new tenant.

---

## Beta Limitations

During the beta phase:

| Feature | Status | Notes |
|---------|--------|-------|
| User Management | ✅ Available | Up to 25 users per firm |
| Client Workspaces | ✅ Available | Up to 100 client workspaces |
| GST Notice Management | ✅ Available | Full workflow |
| Communication Hub | ✅ Available | Thread management |
| Compliance Tasks | ✅ Available | Task creation & assignment |
| AI Insights | ✅ Available | Risk alerts & summaries |
| MSME Vendor Tracking | ✅ Available | Payment aging |
| Document Vault | ✅ Available | Upload & management |
| Export/Reporting | ⚠️ Limited | Basic exports only |
| Email Notifications | ⚠️ Limited | System notifications only |
| Custom Integrations | 🔜 Planned | Q3 2026 |
| White Label | 🔜 Planned | Q4 2026 |

---

## Onboarding Checklist

### Phase 1: Explore (Day 1)

- [ ] Login with demo credentials
- [ ] Review dashboard with sample data
- [ ] Navigate through main sections (Notices, Tasks, Communications, Vendors)
- [ ] Complete the demo walkthrough (see DEMO_SCRIPT.md)

### Phase 2: Your First Client (Day 2-3)

1. **Create Client Workspace**
   - Navigate to "Businesses" or "Workspaces"
   - Click "Add Client"
   - Enter client details (name, GSTIN, PAN)
   - Assign team members

2. **Add Team Members**
   - Navigate to Settings → Team
   - Click "Invite Member"
   - Enter email and role (Admin, Member, Client)
   - Team member receives invitation email

3. **Upload Initial Documents**
   - Navigate to Documents for the client
   - Click "Upload" or drag files
   - Supported: PDF, XLSX, DOCX (max 10MB each)

### Phase 3: Import Compliance Data (Day 3-5)

1. **Import GST Returns**
   - Navigate to GST → Returns
   - Click "Import GSTR Data"
   - Upload JSON/Excel from GST portal
   - Verify data matches GST records

2. **Add Existing Notices**
   - Navigate to Notices
   - Click "Add Notice"
   - Enter notice details manually
   - Set severity and due date

3. **Create Compliance Tasks**
   - Navigate to Tasks
   - Click "Create Task"
   - Set title, type, priority, deadline
   - Assign to team member

---

## Key Workflows

### GST Notice Response Workflow

```
1. Notice Received
   ↓
2. Review & Assess Severity
   ↓
3. Assign to Team Member
   ↓
4. Create Communication Thread (auto-linked)
   ↓
5. Request Documents from Client
   ↓
6. Prepare Response Draft
   ↓
7. Submit Response
   ↓
8. Track Resolution
```

### Client Onboarding Workflow

```
1. Add Client Business
   ↓
2. Create Workspace
   ↓
3. Invite Team Members
   ↓
4. Upload Historical Documents
   ↓
5. Import GST Data
   ↓
6. Create Compliance Calendar
   ↓
7. Set Up Notification Preferences
```

---

## User Roles

| Role | Permissions |
|------|-------------|
| **Organization Admin** | Full access, user management, billing |
| **CA Member** | Client access, notice management, communications |
| **Accountant** | Data entry, document upload, task management |
| **Client** | View own workspace, respond to requests, upload documents |

---

## Data & Security

### Your Data

- Data is stored in isolated tenant database
- Each firm has separate data storage
- No cross-tenant data sharing

### Access Control

- Role-based access control (RBAC)
- Workspace-level isolation
- Internal notes are CA-team only

### Security Best Practices

- Use strong passwords (Demo@123 is for demo only)
- Enable 2FA (coming in Q2 2026)
- Review access logs regularly
- Delete unused team members

---

## Integration Guide (Coming Soon)

### GST Portal Integration
Planned for Q2 2026 - Auto-import of GST returns and notices

### Tally Integration
Planned for Q3 2026 - Sync accounting data

### Email Integration
Planned for Q3 2026 - Send notifications via email

---

## Feedback & Support

### Providing Feedback

1. **In-App Feedback**: Click the feedback icon in the bottom-right corner
2. **GitHub Issues**: Report bugs at github.com/Rahuketu612/complyos/issues
3. **Email**: contact@complyos.com

### Getting Help

- **Documentation**: See `/docs` folder in the repository
- **Demo Script**: `DEMO_SCRIPT.md` for presentation guidance
- **Deployment Guide**: `DEPLOYMENT_GUIDE.md` for technical setup

### Beta Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| Closed Beta | May-June 2026 | 10 pilot CA firms |
| Feature Feedback | June 2026 | Collect and prioritize |
| Public Beta | July 2026 | Open to more firms |
| Production Launch | Q3 2026 | General availability |

---

## Frequently Asked Questions

### Q: How many clients can I manage?
**A**: Up to 100 client workspaces in the beta. Contact us for higher limits.

### Q: Can I import data from Excel?
**A**: GST returns can be imported from GST portal JSON. Full Excel import coming in Q2 2026.

### Q: Is there a mobile app?
**A**: Web app is mobile-responsive. Native apps planned for Q4 2026.

### Q: How do I export my data?
**A**: Export is available for notices and tasks in beta. Full export coming soon.

### Q: What happens to my data after beta?
**A**: Your data remains yours. Export anytime, or we'll help migrate to production.

---

## Success Metrics

Track these during your beta period:

- [ ] Time saved on notice tracking
- [ ] Reduction in missed deadlines
- [ ] Client communication efficiency
- [ ] Team collaboration improvement

---

## Contact

- **Email**: contact@complyos.com
- **Phone**: +91-22-45678900 (Mon-Fri, 10 AM - 6 PM IST)
- **WhatsApp**: Available on request

---

*Thank you for being part of COMPLYOS beta!*
*Your feedback helps us build the best compliance management platform.*
