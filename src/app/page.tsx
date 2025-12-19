import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AuthButton } from "@/components/auth-button";

import {
  Github,
  FileText,
  Shield,
  TrendingUp,
  Users,
  Clock,
} from "lucide-react";

export default async function Home() {
  const session = await auth();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="h-8 w-8" />
            <span className="text-xl font-bold">Git-to-Resume</span>
          </div>
          <AuthButton />
        </nav>
      </header>

      <main>
       
        <section className="container mt-0 mx-auto px-4 py-20 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl mb-6">
            Transform Your GitHub Activity
            <br />
            <span className="text-blue-600">Into CV-Ready Evidence</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
            Generate verified, recruiter-readable reports from your GitHub
            contributions. No vanity metrics — just meaningful engineering
            signals.
          </p>
          <div className="flex justify-center gap-4">
            <AuthButton />
          </div>
        </section>

        <section className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<TrendingUp className="h-8 w-8 text-blue-600" />}
              title="Signal Over Noise"
              description="Normalized metrics that actually matter: consistency, ownership, collaboration — not raw commit counts."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-green-600" />}
              title="Verified & Defensible"
              description="Each report is timestamped and verifiable. No self-reported data, only GitHub-verified activity."
            />
            <FeatureCard
              icon={<FileText className="h-8 w-8 text-purple-600" />}
              title="Recruiter-Ready"
              description="Auto-generated CV inserts written in recruiter language. Short, readable, and professional."
            />
          </div>
        </section>

        <section className="bg-slate-900 text-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              What Your Report Includes
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricPreview
                icon={<Clock className="h-6 w-6" />}
                label="Consistency Index"
                description="Regular activity over time"
              />
              <MetricPreview
                icon={<TrendingUp className="h-6 w-6" />}
                label="Recency Score"
                description="Recent engagement weighted"
              />
              <MetricPreview
                icon={<Github className="h-6 w-6" />}
                label="Ownership Score"
                description="Depth of contribution"
              />
              <MetricPreview
                icon={<Users className="h-6 w-6" />}
                label="Collaboration Index"
                description="Team interaction signals"
              />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">
              Sample CV Insert
            </h2>
            <div className="bg-slate-50 border rounded-lg p-6 font-mono text-sm">
              <p className="font-bold mb-2">GitHub Activity (Verified)</p>
              <ul className="space-y-1 text-slate-700">
                <li>• Active contributor across 9 repositories (12 months)</li>
                <li>• Maintainer of 2 production-grade projects</li>
                <li>• Consistent weekly activity with sustained ownership</li>
                <li>• Strong collaboration via PRs and code reviews</li>
                <li>• Primary languages: TypeScript (45%), Python (33%)</li>
              </ul>
              <p className="mt-4 text-slate-500">
                Verify: https://git-to-resume.app/r/abc123
              </p>
            </div>
          </div>
        </section>

        <section className="bg-blue-600 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Showcase Your Work?
            </h2>
            <p className="text-xl text-blue-100 mb-8">
              Connect your GitHub account and generate your first report in
              under a minute.
            </p>
            <AuthButton />
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 text-center text-slate-500">
        <p>
          {process.env.NEXT_PUBLIC_APP_VERSION ? `v${process.env.NEXT_PUBLIC_APP_VERSION} ` : ''}Git-to-Resume provides activity evidence only. Reports do not claim
          skill levels. Copyright {new Date().getFullYear()} Git-to-Resume. All rights reserved.
        </p>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-white border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-slate-600">{description}</p>
    </div>
  );
}

function MetricPreview({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-4">
      <div className="flex items-center gap-3 mb-2">
        {icon}
        <span className="font-semibold">{label}</span>
      </div>
      <p className="text-slate-400 text-sm">{description}</p>
    </div>
  );
}
