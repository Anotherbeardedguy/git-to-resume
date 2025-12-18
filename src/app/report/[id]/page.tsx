"use client";

import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { AuthButton } from "@/components/auth-button";
import { MetricCard } from "@/components/metric-card";
import { LanguageChart } from "@/components/language-chart";
import { CVInsertBox } from "@/components/cv-insert-box";
import {
  Github,
  ArrowLeft,
  Share2,
  Download,
  Calendar,
  GitBranch,
  GitPullRequest,
  MessageSquare,
  Copy,
  Check,
  Activity,
  Target,
  Users,
  Clock,
} from "lucide-react";
import { ReportMetrics } from "@/types";

interface ReportData {
  id: string;
  status: string;
  generatedAt: string;
  verificationHash: string;
  metrics: ReportMetrics;
  cvInsert: string;
  user: {
    username: string;
    name: string;
    image: string;
    accountAge: number;
  };
  shareableLink: string;
}

export default function ReportPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session && params.id) {
      fetchReport();
    }
  }, [session, params.id]);

  const fetchReport = async () => {
    try {
      const res = await fetch(`/api/report/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Failed to fetch report:", error);
      router.push("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const copyShareLink = async () => {
    if (report?.shareableLink) {
      await navigator.clipboard.writeText(report.shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (status === "loading" || loading || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const { metrics } = report;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <header className="border-b bg-white">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Github className="h-6 w-6" />
              <span className="text-lg font-bold">Git-to-Resume</span>
            </div>
            <AuthButton />
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.push("/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {report.user.image && (
                  <img
                    src={report.user.image}
                    alt={report.user.name || "User"}
                    className="w-16 h-16 rounded-full"
                  />
                )}
                <div>
                  <CardTitle className="text-2xl">
                    GitHub Activity Report
                  </CardTitle>
                  <p className="text-muted-foreground">
                    @{report.user.username}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Last 12 Months</Badge>
                <Button variant="outline" size="sm" onClick={copyShareLink}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4 text-green-600" />
                  ) : (
                    <Share2 className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Share"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Generated: {new Date(report.generatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <GitBranch className="h-4 w-4" />
                <span>{metrics.activeRepos} active repositories</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            label="Consistency"
            value={metrics.consistencyIndex}
            description="Active weeks ratio"
            icon={<Clock className="h-4 w-4" />}
          />
          <MetricCard
            label="Recency"
            value={metrics.recencyScore}
            description="Recent activity weight"
            icon={<Activity className="h-4 w-4" />}
          />
          <MetricCard
            label="Ownership"
            value={metrics.ownershipScore}
            description="Code ownership depth"
            icon={<Target className="h-4 w-4" />}
          />
          <MetricCard
            label="Collaboration"
            value={metrics.collaborationIndex}
            description="Team interaction"
            icon={<Users className="h-4 w-4" />}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Primary Languages</CardTitle>
            </CardHeader>
            <CardContent>
              <LanguageChart languages={metrics.primaryLanguages} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <StatItem
                  icon={<GitBranch className="h-4 w-4" />}
                  label="Commits"
                  value={metrics.contributionSummary.totalCommits}
                />
                <StatItem
                  icon={<GitPullRequest className="h-4 w-4" />}
                  label="Pull Requests"
                  value={metrics.contributionSummary.totalPRs}
                />
                <StatItem
                  icon={<Check className="h-4 w-4" />}
                  label="Merged PRs"
                  value={metrics.contributionSummary.mergedPRs}
                />
                <StatItem
                  icon={<MessageSquare className="h-4 w-4" />}
                  label="Code Reviews"
                  value={metrics.contributionSummary.reviewsGiven}
                />
              </div>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">
                <p>
                  Active {metrics.contributionSummary.activeWeeks} out of{" "}
                  {metrics.contributionSummary.totalWeeks} weeks
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Top Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topRepositories.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No repository activity found in the last 12 months.
              </p>
            ) : (
              <div className="space-y-4">
                {metrics.topRepositories.map((repo) => (
                  <div
                    key={repo.name}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{repo.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {repo.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {repo.description || "No description"}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        {repo.languages.map((lang) => (
                          <span
                            key={lang}
                            className="text-xs px-2 py-0.5 bg-slate-200 rounded"
                          >
                            {lang}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right text-sm ml-4">
                      <p className="font-medium">{repo.commits} commits</p>
                      <p className="text-muted-foreground">
                        {repo.ownershipPercentage}% ownership
                      </p>
                      {repo.stars > 0 && (
                        <p className="text-muted-foreground">
                          ⭐ {repo.stars}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <CVInsertBox text={report.cvInsert} shareableLink={report.shareableLink} />

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Verification Hash: {report.verificationHash}
          </p>
          <Button variant="outline" onClick={copyShareLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Shareable Link
          </Button>
        </div>
      </main>
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-100 rounded-lg">{icon}</div>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
