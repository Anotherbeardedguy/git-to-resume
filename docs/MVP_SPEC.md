# Git-to-Resume MVP Specification

## Overview

**Product Name:** Git-to-Resume  
**Version:** MVP 1.0  
**Purpose:** Automated, verifiable GitHub Activity Report that converts raw contribution data into CV-ready evidence.

**Core Principle:**  
> Translate activity → competence → impact, not vanity metrics.

---

## 1. Scope Definition

### In Scope (MVP)
- GitHub OAuth authentication
- Public repository analysis only
- Single role profile: **General Developer**
- 12-month time window (fixed)
- PDF report generation
- Shareable verification link
- CV insert text generation

### Out of Scope (Post-MVP)
- Private repository analysis
- Multiple role profiles (Backend, Frontend, DevOps, OSS Maintainer)
- Configurable time windows (6/12/24 months)
- LinkedIn integration
- Periodic auto-updated reports
- B2B recruiter features

---

## 2. Technical Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Next.js | ^15.1.3 |
| UI Framework | React | ^19.0.0 |
| Styling | Tailwind CSS | ^3.4.17 |
| Components | shadcn/ui | ^2.1.8 |
| Language | TypeScript | ^5.0.0 |
| Runtime | Node.js | ^20.0.0 |
| Database | SQLite + Prisma | ^3.0.0 / ^5.0.0 |
| Auth | GitHub OAuth | - |
| PDF Generation | Server-side (e.g., Puppeteer/React-PDF) | - |

---

## 3. Data Model

### 3.1 User
```typescript
interface User {
  id: string;
  githubId: string;
  username: string;
  avatarUrl: string;
  accountAge: number; // in months
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.2 Report
```typescript
interface Report {
  id: string;
  userId: string;
  verificationHash: string;
  timeWindow: 12; // fixed for MVP
  generatedAt: Date;
  expiresAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  metrics: ReportMetrics;
  cvInsert: string;
}
```

### 3.3 Metrics
```typescript
interface ReportMetrics {
  consistencyIndex: number;      // 0-100
  recencyScore: number;          // 0-100
  ownershipScore: number;        // 0-100
  collaborationIndex: number;    // 0-100
  
  totalRepos: number;
  activeRepos: number;
  primaryLanguages: LanguageStat[];
  contributionSummary: ContributionSummary;
  topRepositories: RepositorySummary[];
}

interface LanguageStat {
  language: string;
  percentage: number;
}

interface ContributionSummary {
  totalCommits: number;
  totalPRs: number;
  mergedPRs: number;
  issuesOpened: number;
  issuesClosed: number;
  reviewsGiven: number;
  activeWeeks: number;
  totalWeeks: number;
}

interface RepositorySummary {
  name: string;
  role: 'owner' | 'maintainer' | 'contributor';
  languages: string[];
  commits: number;
  prs: number;
  ownershipPercentage: number;
}
```

---

## 4. API Specification

### 4.1 Authentication

#### `GET /api/auth/github`
Initiates GitHub OAuth flow.

#### `GET /api/auth/callback`
Handles OAuth callback, creates/updates user session.

#### `POST /api/auth/logout`
Destroys user session.

### 4.2 User

#### `GET /api/user/profile`
Returns authenticated user profile.

**Response:**
```json
{
  "id": "string",
  "username": "string",
  "avatarUrl": "string",
  "accountAge": 24,
  "primaryLanguages": [
    { "language": "TypeScript", "percentage": 45 }
  ]
}
```

### 4.3 Analysis

#### `POST /api/analyze`
Triggers GitHub data analysis and report generation.

**Request:**
```json
{
  "timeWindow": 12
}
```

**Response:**
```json
{
  "reportId": "string",
  "status": "pending",
  "estimatedTime": 30
}
```

### 4.4 Report

#### `GET /api/report/{id}`
Retrieves generated report.

**Response:**
```json
{
  "id": "string",
  "status": "completed",
  "generatedAt": "ISO8601",
  "verificationHash": "string",
  "metrics": { ... },
  "cvInsert": "string",
  "shareableLink": "string"
}
```

#### `GET /api/report/{id}/pdf`
Downloads PDF version of report.

#### `GET /api/report/{id}/verify`
Public endpoint to verify report authenticity.

---

## 5. Metric Calculations

### 5.1 Consistency Index (0-100)
```
consistencyIndex = (activeWeeks / totalWeeks) * 100
```
- Penalize bursty behavior (optional for MVP)
- Active week = at least 1 contribution

### 5.2 Recency Score (0-100)
```
Weighted decay over last 90 days:
- Days 1-30: weight 1.0
- Days 31-60: weight 0.6
- Days 61-90: weight 0.3
```

### 5.3 Ownership Score (0-100)
```
Based on:
- % of files modified in owned repos
- Repeated commits to same modules
- Maintainer privileges
```

### 5.4 Collaboration Index (0-100)
```
collaborationIndex = weighted average of:
- PR merge rate (merged / opened)
- Reviews given
- Cross-repo contributions
```

---

## 6. UI/UX Requirements

### 6.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Landing | `/` | Hero, features, CTA to connect GitHub |
| Dashboard | `/dashboard` | User overview, generate report button |
| Report | `/report/{id}` | Full report view |
| Public Report | `/r/{hash}` | Shareable verification page |

### 6.2 Components

- **AuthButton** - GitHub login/logout
- **MetricCard** - Display single metric with visual indicator
- **LanguageChart** - Primary languages breakdown
- **RepoList** - Top repositories summary
- **CVInsertBox** - Copyable CV text block
- **PDFDownloadButton** - Trigger PDF generation

### 6.3 Design Principles
- Clean, professional aesthetic
- Recruiter-readable typography
- Mobile-responsive
- Minimal animations

---

## 7. Security & Privacy

### 7.1 Requirements
- OAuth tokens stored securely (encrypted at rest)
- No private repo access in MVP
- Rate limiting on API endpoints
- CORS configured properly
- Report links use non-guessable hashes

### 7.2 Data Retention
- Reports expire after 90 days
- User can delete account and all data
- No analytics tracking in MVP

---

## 8. Constraints & Limitations

| Constraint | Limit |
|------------|-------|
| GitHub API Rate | 5000 requests/hour (authenticated) |
| Report Generation Time | < 60 seconds target |
| PDF Size | < 2MB |
| Concurrent Users | 100 (MVP target) |

---

## 9. Success Criteria

### MVP Launch Checklist
- [ ] User can authenticate via GitHub OAuth
- [ ] System analyzes public repositories (last 12 months)
- [ ] Report generates with all 4 core metrics
- [ ] PDF export functional
- [ ] Shareable verification link works
- [ ] CV insert text is recruiter-readable

### Quality Gates
- No "skill level" or "expert" labels
- All metrics have clear explanations
- Report is verifiable and timestamped
- < 3 second page load time

---

## 10. Future Considerations

After MVP validation:
1. Add role-based profiles (Backend, Frontend, DevOps)
2. Enable private repository analysis (paid tier)
3. Time window selection (6/12/24 months)
4. LinkedIn-compatible export
5. B2B recruiter verification portal
6. Periodic auto-updated reports
