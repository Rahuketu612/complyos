# CA-Client Collaboration Workflows

This document describes the API endpoints and role permissions for the CA-Client collaboration features in COMPLYOS.

## Overview

The CA-Client collaboration layer enables Chartered Accountants to manage compliance workflows for multiple client businesses within organized workspaces.

### Key Concepts

- **Firm**: A CA firm profile containing firm details and associated members
- **ClientWorkspace**: A collaborative workspace linking a CA firm to a specific client business
- **WorkspaceMember**: User membership with role-based permissions within a workspace
- **DocumentVault**: Secure document storage with categorization and retention policies

## Base URL

```
/api/ca
```

## Authentication

All endpoints require Bearer token authentication:
```
Authorization: Bearer <access_token>
```

## Endpoints

### Health Check

```http
GET /api/ca/health
```

Returns service health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "ca-service",
  "timestamp": "2026-05-22T00:00:00.000Z"
}
```

---

### Workspace Management

#### List Firms

```http
GET /api/ca/workspace/firms
```

Lists all firms the authenticated user is associated with.

**Response:**
```json
{
  "id": "firm-id",
  "name": "Sharma & Associates",
  "email": "contact@sharma-ca.com",
  "firmType": "partnership",
  "workspaces": [...],
  "_count": {
    "workspaces": 5,
    "workspaceMembers": 12
  }
}
```

#### Get Firm

```http
GET /api/ca/workspace/firms/:firmId
```

Gets detailed firm information including workspaces and members.

#### List Workspaces

```http
GET /api/ca/workspace/workspaces
```

Lists all workspaces the authenticated user has access to.

**Response:**
```json
[
  {
    "id": "workspace-id",
    "name": "Test Business - Compliance Workspace",
    "firm": { "name": "Sharma & Associates" },
    "role": "ADMIN",
    "_count": { "tasks": 10, "documents": 25 }
  }
]
```

#### Get Workspace

```http
GET /api/ca/workspace/workspaces/:workspaceId
```

Gets workspace details including members, tasks, and documents.

**Response:**
```json
{
  "id": "workspace-id",
  "name": "Workspace Name",
  "firm": { "id": "...", "name": "..." },
  "business": { "id": "...", "name": "..." },
  "members": [...],
  "currentUserRole": "ADMIN"
}
```

#### Create Workspace

```http
POST /api/ca/workspace/workspaces
```

Creates a new client workspace (ADMIN only).

**Request:**
```json
{
  "name": "Client Workspace Name",
  "description": "Workspace description",
  "businessId": "business-id-required"
}
```

#### Add Workspace Member

```http
POST /api/ca/workspace/workspaces/:workspaceId/members
```

Adds a new member to the workspace (ADMIN/CA only).

**Request:**
```json
{
  "email": "user@example.com",
  "role": "CLIENT"
}
```

---

### Task Management

#### Get My Tasks

```http
GET /api/ca/tasks/my
```

Gets all tasks assigned to the authenticated user.

**Response:**
```json
[
  {
    "id": "task-id",
    "title": "GSTR-3B Filing - May 2026",
    "status": "PENDING",
    "priority": "HIGH",
    "complianceType": "GST",
    "dueDate": "2026-05-20",
    "workspace": { "id": "...", "name": "..." }
  }
]
```

#### List Tasks

```http
GET /api/ca/tasks/workspace/:workspaceId
```

Lists all tasks in a workspace.

**Query Parameters:**
- `status`: PENDING | IN_PROGRESS | COMPLETED | CANCELLED | BLOCKED
- `priority`: LOW | MEDIUM | HIGH | URGENT
- `complianceType`: GST | TDS | INCOME_TAX | ROC | EPFO | ESIC | PROFESSIONAL_TAX | OTHER
- `assignedTo`: User ID to filter by assignee
- `dueBefore`: ISO date string
- `dueAfter`: ISO date string

**Response:**
```json
[
  {
    "id": "task-id",
    "title": "Task title",
    "description": "Task description",
    "status": "PENDING",
    "priority": "HIGH",
    "complianceType": "GST",
    "dueDate": "2026-05-20",
    "assignee": { "firstName": "John", "lastName": "Doe" },
    "creator": { "firstName": "Jane", "lastName": "Doe" },
    "business": { "id": "...", "name": "..." }
  }
]
```

#### Get Task

```http
GET /api/ca/tasks/:taskId
```

Gets detailed task information.

#### Create Task

```http
POST /api/ca/tasks
```

Creates a new compliance task.

**Request:**
```json
{
  "title": "Task title",
  "description": "Task description",
  "status": "PENDING",
  "priority": "HIGH",
  "complianceType": "GST",
  "dueDate": "2026-05-20",
  "assignedTo": "user-id",
  "linkedBusinessId": "business-id"
}
```

#### Update Task

```http
PUT /api/ca/tasks/:taskId
```

Updates a task (any member with access).

**Request:**
```json
{
  "title": "Updated title",
  "status": "COMPLETED",
  "notes": "Task notes"
}
```

#### Delete Task

```http
DELETE /api/ca/tasks/:taskId
```

Deletes a task (ADMIN/CA only).

---

### Document Management

#### List Documents

```http
GET /api/ca/documents/workspace/:workspaceId
```

Lists all documents in a workspace.

**Query Parameters:**
- `category`: GST_NOTICE | INVOICE | CHALLAN | ROC_FILING | TAX_DOCUMENT | BANK_STATEMENT | ANNUAL_RETURN | PROFIT_LOSS | BALANCE_SHEET | OTHER
- `businessId`: Filter by linked business
- `uploadedBy`: Filter by uploader
- `search`: Search in file name, original name, or tags

**Response:**
```json
[
  {
    "id": "doc-id",
    "fileName": "gstr3b_may2026.pdf",
    "originalName": "GSTR-3B_May_2026.pdf",
    "category": "TAX_DOCUMENT",
    "mimeType": "application/pdf",
    "size": 102400,
    "uploadedBy": { "firstName": "Jane", "email": "jane@ca.com" },
    "createdAt": "2026-05-20T10:00:00Z"
  }
]
```

#### Get Document

```http
GET /api/ca/documents/:documentId
```

Gets document metadata.

#### Upload Document

```http
POST /api/ca/documents
```

Creates document metadata (file upload handled separately).

**Request:**
```json
{
  "fileName": "invoice_may2026.pdf",
  "originalName": "Invoice_May_2026.pdf",
  "fileType": "pdf",
  "mimeType": "application/pdf",
  "size": 102400,
  "category": "INVOICE",
  "businessId": "business-id",
  "tags": ["may-2026", "input-tax-credit"],
  "notes": "Purchase invoice for ITC claim"
}
```

#### Update Document

```http
PUT /api/ca/documents/:documentId
```

Updates document metadata (tags, notes).

**Request:**
```json
{
  "tags": ["verified", "may-2026"],
  "notes": "Verified and processed"
}
```

#### Delete Document

```http
DELETE /api/ca/documents/:documentId
```

Soft-deletes a document (ADMIN/CA/uploader only).

---

### Notifications

#### Get Notifications

```http
GET /api/ca/notifications
```

Gets user notifications with pagination.

**Query Parameters:**
- `workspaceId`: Filter by workspace
- `isRead`: true | false
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "notifications": [
    {
      "id": "notif-id",
      "type": "TASK_ASSIGNED",
      "title": "New Task Assigned",
      "message": "You have been assigned: GSTR-3B Filing",
      "isRead": false,
      "createdAt": "2026-05-20T10:00:00Z"
    }
  ],
  "total": 15,
  "unreadCount": 5
}
```

#### Mark as Read

```http
PUT /api/ca/notifications/:notificationId/read
```

Marks a notification as read.

#### Mark All as Read

```http
PUT /api/ca/notifications/read-all?workspaceId=workspace-id
```

Marks all notifications as read.

#### Get Unread Count

```http
GET /api/ca/notifications/unread-count
```

**Response:**
```json
{
  "count": 5
}
```

---

### Dashboard

#### Get Widgets

```http
GET /api/ca/dashboard/widgets
```

Gets dashboard widget data including stats, pending tasks, overdue items, and alerts.

**Response:**
```json
{
  "stats": {
    "totalWorkspaces": 5,
    "totalTasks": 45,
    "pendingTasksCount": 12,
    "overdueTasksCount": 3,
    "documentsCount": 156,
    "unreadNotifications": 5
  },
  "pendingTasks": [...],
  "overdueCompliances": [...],
  "recentNotices": [...],
  "msmeAlerts": [...],
  "upcomingReturns": [...]
}
```

#### Get Stats

```http
GET /api/ca/dashboard/stats
```

Gets quick summary statistics.

---

## Role Permissions Matrix

| Action | ADMIN | CA | ACCOUNTANT | CLIENT | VIEWER |
|--------|-------|-----|------------|---------|--------|
| **Workspace Management** |
| Create workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| View workspace | ✅ | ✅ | ✅ | ✅ | ✅ |
| Delete workspace | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Member Management** |
| Add member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Remove member | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update member role | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Task Management** |
| Create task | ✅ | ✅ | ✅ | ❌ | ❌ |
| View task | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update task | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete task | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Document Management** |
| Upload document | ✅ | ✅ | ✅ | ❌ | ❌ |
| View document | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update document | ✅ | ✅ | ✅ | ❌ | ❌ |
| Delete document | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Notifications** |
| View notifications | ✅ | ✅ | ✅ | ✅ | ✅ |
| Mark as read | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Tenant Isolation

All endpoints enforce strict tenant isolation:

1. All queries include `tenantId` filtering
2. Cross-tenant access returns 404 (not 403) to prevent enumeration
3. Workspaces are scoped to the authenticated user's tenant
4. Business relations are validated against tenant context

---

## Error Responses

```json
{
  "statusCode": 403,
  "message": "Access denied",
  "error": "Forbidden"
}
```

```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "Not Found"
}
```

---

## Audit Logging

Key actions are logged for compliance:

- `FIRM_CREATED` - New CA firm created
- `WORKSPACE_CREATED` - Client workspace created
- `MEMBER_ADDED` - Member added to workspace
- `TASK_CREATED` - Compliance task created
- `TASK_UPDATED` - Task status changed
- `DOCUMENT_UPLOADED` - Document uploaded
- `DOCUMENT_DELETED` - Document deleted

---

## Environment Variables

```env
NODE_ENV=development
PORT=3007
DATABASE_URL=postgresql://complyos:password@localhost:5432/complyos
```

---

## Docker Deployment

The CA service is deployed via docker-compose on port 3007:

```yaml
ca-service:
  build: ./apps/ca-service
  ports:
    - "3007:3007"
  environment:
    - DATABASE_URL=postgresql://...
    - PORT=3007
  healthcheck:
    test: curl -f http://localhost:3007/health
```

Health endpoint: `GET /health`