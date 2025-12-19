Deploy to Vercel (new project)
1) One small deploy-readiness change I made
Added postinstall: prisma generate in package.json so Vercel reliably has Prisma Client available during build/runtime.
2) Confirm: is this a new Vercel project?
Reply with:

Project name (subdomain), e.g. git-to-resume-yourname
Custom domain? yes/no
3) Vercel setup steps (new project)
In Vercel: Add New… → Project → Import your GitHub repo.
Framework should be detected automatically (Next.js).
Set Node.js Version = 20.x (Project Settings → General), if Vercel doesn’t default to it.
4) Environment variables to add in Vercel
Add these under Project Settings → Environment Variables (at least for Production; you can also set Preview if you want previews to work).

DATABASE_URL (Supabase pooler 6543)
Must include: sslmode=require&pgbouncer=true
DIRECT_URL (direct 5432)
Must include: sslmode=require
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
OPENAI_API_KEY
NextAuth v5 URL/secret
Set both for compatibility:
AUTH_URL = https://<your-vercel-domain>
NEXTAUTH_URL = https://<your-vercel-domain>
AUTH_SECRET = a long random secret
NEXTAUTH_SECRET = same value as AUTH_SECRET
If you paste your intended Vercel URL, I’ll format the exact values.

5) Update GitHub OAuth App settings
In GitHub OAuth App:

Homepage URL
https://<your-vercel-domain>
Authorization callback URL
https://<your-vercel-domain>/api/auth/callback/github
6) Deploy
Once env vars + GitHub OAuth URLs are set:

Trigger a deploy (Vercel usually auto-deploys after env var save, or push a commit).
Status
TODO: Deployment is in progress.
Ready: Reliability + Supabase pooler fix are done.
Answer these 2 so I can give you the exact env var values to paste:

What Vercel subdomain/project name are you using?
Are you deploying with a custom domain? yes/no
Feedback submitted