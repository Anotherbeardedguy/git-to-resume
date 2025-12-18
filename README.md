# Git-to-Resume

Transform your GitHub activity into CV-ready evidence. Generate verified, recruiter-readable reports from your contributions.

## Features

- **GitHub OAuth** - Securely connect your GitHub account
- **Activity Analysis** - Analyze commits, PRs, issues, and reviews
- **4 Core Metrics** - Consistency, Recency, Ownership, Collaboration indices
- **CV Insert** - Auto-generated recruiter-ready text
- **Shareable Links** - Verified, timestamped public reports

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Database**: SQLite + Prisma ORM
- **Auth**: NextAuth.js with GitHub OAuth

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- GitHub OAuth App credentials

### Setup

1. **Clone and install dependencies**
   ```bash
   git clone <repo-url>
   cd git-to-resume
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your credentials:
   ```env
   DATABASE_URL="file:./dev.db"
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="generate-a-secret-key"
   GITHUB_CLIENT_ID="your-client-id"
   GITHUB_CLIENT_SECRET="your-client-secret"
   ```

3. **Create GitHub OAuth App**
   - Go to [GitHub Developer Settings](https://github.com/settings/developers)
   - Create new OAuth App
   - Set Homepage URL: `http://localhost:3000`
   - Set Callback URL: `http://localhost:3000/api/auth/callback/github`

4. **Initialize database**
   ```bash
   npx prisma db push
   ```

5. **Run development server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes
│   ├── dashboard/     # Dashboard page
│   ├── report/[id]/   # Report view page
│   ├── r/[hash]/      # Public verification page
│   └── page.tsx       # Landing page
├── components/        # React components
├── lib/               # Utilities (auth, prisma, github)
└── types/             # TypeScript types
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/auth/[...nextauth]` | NextAuth handlers |
| POST | `/api/analyze` | Generate new report |
| GET | `/api/report/[id]` | Get report by ID |
| GET | `/api/reports` | List user's reports |

## License

MIT
