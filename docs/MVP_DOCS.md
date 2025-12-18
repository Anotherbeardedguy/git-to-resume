# Git-to-Resume Documentation

## Product Overview

**Git-to-Resume** is a web application that connects to your GitHub account, analyzes your contribution activity, and generates a verified, CV-ready report. The report translates raw GitHub data into meaningful engineering signals that recruiters and hiring managers understand.

### Value Proposition

> A verified engineering activity supplement — not a skills assessment.

The app produces **evidence-based activity reports**, not arbitrary skill ratings. This makes the output credible, defensible, and recruiter-safe.

---

## Core Concepts

### Signal Over Noise

Traditional GitHub metrics (total commits, stars, contribution graphs) are easily gamed and provide limited insight. Git-to-Resume focuses on **normalized indicators**:

| Metric | What It Measures |
|--------|------------------|
| **Consistency Index** | Regular activity over time (not bursts) |
| **Recency Score** | Recent engagement weighted higher |
| **Ownership Score** | Depth of contribution to specific projects |
| **Collaboration Index** | Team interaction via PRs and reviews |

### Recruiter-Readable Output

All output is designed for non-technical readers:
- Short bullet points, not data dumps
- No jargon or inflated claims
- Time-bounded (last 12 months)
- Verifiable via unique link

---

## User Flow

### 1. Authentication
```
User clicks "Connect GitHub"
    ↓
Redirected to GitHub OAuth
    ↓
Grants access to public repos
    ↓
Redirected back with session
```

### 2. Dashboard
After authentication, the user sees:
- Profile summary (username, account age, avatar)
- Primary languages breakdown
- "Generate Report" button

### 3. Report Generation
```
User clicks "Generate Report"
    ↓
System fetches GitHub data via API
    ↓
Analyzes commits, PRs, issues, reviews
    ↓
Calculates metrics
    ↓
Generates report (typically < 60 seconds)
```

### 4. Report View
The completed report includes:
- **Executive Summary** - Key highlights
- **Metric Cards** - Visual score indicators
- **Top Repositories** - Contribution breakdown
- **CV Insert** - Copy-ready text block
- **Actions** - Download PDF, Copy link

### 5. Sharing
Reports have unique verification links:
```
https://git-to-resume.app/r/{verificationHash}
```
Anyone with the link can verify the report's authenticity and timestamp.

---

## Report Structure

### Page 1: Executive Summary

```
GitHub Activity Report (Last 12 Months)
Verified on: 2024-12-18

• Consistent weekly contributor (87% active weeks)
• Primary languages: TypeScript (45%), Python (33%)
• Contributor across 9 repositories
• Strong collaboration signal (21 merged PRs, 14 reviews)
```

### Page 2: Activity Metrics

Visual cards showing:
- Consistency Index (0-100)
- Recency Score (0-100)
- Ownership Score (0-100)
- Collaboration Index (0-100)

Plus:
- Contribution timeline (compressed graph)
- Language distribution chart

### Page 3: Repository Breakdown

For top 5 repositories:
| Repository | Role | Commits | PRs | Ownership |
|------------|------|---------|-----|-----------|
| project-a | Owner | 142 | 8 | 78% |
| project-b | Contributor | 56 | 12 | 23% |

### Page 4: CV Insert

Auto-generated, copy-ready text:

```
GitHub Activity (Verified)
• Active contributor across 9 repositories (12 months)
• Maintainer of 2 production-grade projects
• Consistent weekly activity with sustained ownership
• Strong collaboration via PRs and code reviews

Verify: https://git-to-resume.app/r/abc123
```

---

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  GitHub OAuth   │
│   (Frontend)    │◀────│                 │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐     ┌─────────────────┐
│   API Routes    │────▶│   GitHub API    │
│   (Backend)     │◀────│  (REST/GraphQL) │
└────────┬────────┘     └─────────────────┘
         │
         ▼
┌─────────────────┐
│   SQLite DB     │
│   (Prisma ORM)  │
└─────────────────┘
```

### Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | Next.js 15.1.3 |
| UI | React 19, Tailwind CSS, shadcn/ui |
| Language | TypeScript 5.0 |
| Database | SQLite with Prisma ORM |
| Auth | GitHub OAuth 2.0 |
| PDF | Server-side generation |

---

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/github` | Start OAuth flow |
| GET | `/api/auth/callback` | Handle OAuth callback |
| POST | `/api/auth/logout` | End session |

### User
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user/profile` | Get user profile |

### Reports
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/analyze` | Start report generation |
| GET | `/api/report/{id}` | Get report data |
| GET | `/api/report/{id}/pdf` | Download PDF |
| GET | `/api/report/{id}/verify` | Public verification |

---

## Metric Definitions

### Consistency Index

**What it measures:** Regular contribution pattern over time.

**Formula:**
```
consistencyIndex = (activeWeeks / totalWeeks) * 100
```

**Why it matters:** Recruiters value predictable, sustained effort over sporadic bursts.

### Recency Score

**What it measures:** How recent the activity is.

**Formula:**
```
Weighted by time decay:
- Last 30 days: 100% weight
- 31-60 days: 60% weight  
- 61-90 days: 30% weight
```

**Why it matters:** Recent activity indicates current engagement and relevance.

### Ownership Score

**What it measures:** Depth of contribution to specific codebases.

**Factors:**
- Percentage of files modified
- Repeated commits to same modules
- Maintainer privileges

**Why it matters:** Shows ability to own and maintain code, not just drive-by contributions.

### Collaboration Index

**What it measures:** Team interaction and contribution quality.

**Factors:**
- PR merge rate (merged ÷ opened)
- Code reviews given
- Cross-repository contributions

**Why it matters:** Engineering is a team sport; collaboration signals are highly valued.

---

## Privacy & Security

### Data Access
- **MVP:** Public repositories only
- OAuth tokens encrypted at rest
- No tracking or analytics

### Data Retention
- Reports expire after 90 days
- Users can delete all data on request
- No data sold or shared with third parties

### Verification
- Each report has a unique, non-guessable hash
- Public verification shows timestamp and authenticity
- Cannot be modified after generation

---

## What We Avoid

Based on hiring manager feedback, the report deliberately **avoids**:

| ❌ Avoided | Why |
|-----------|-----|
| "Expert/Senior/Advanced" labels | Unverifiable claims |
| Total commit counts | Easily gamed |
| Raw star counts | Popularity ≠ quality |
| Contribution heatmaps | Visual noise |
| AI-written competence claims | Not credible |
| Composite "skill scores" | Meaningless without context |

---

## Future Roadmap

### Phase 2: Role Profiles
- Backend Engineer view
- Frontend Engineer view
- DevOps Engineer view
- OSS Maintainer view

### Phase 3: Premium Features
- Private repository analysis
- Time window selection (6/12/24 months)
- LinkedIn-compatible export
- Periodic auto-updates

### Phase 4: B2B
- Recruiter verification portal
- Team/organization reports
- ATS integration

---

## Getting Started (Development)

### Prerequisites
- Node.js 20+
- npm 10+
- GitHub OAuth App credentials

### Setup
```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Add GitHub OAuth credentials

# Initialize database
npx prisma db push

# Run development server
npm run dev
```

### Environment Variables
```env
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
DATABASE_URL=file:./dev.db
```

---

## Legal Notice

Git-to-Resume provides **activity evidence** only. The reports:
- Do not claim skill levels
- Do not guarantee employment suitability
- Are based solely on publicly available GitHub data
- Are timestamped and verifiable

Users are responsible for accuracy of their GitHub profiles.
