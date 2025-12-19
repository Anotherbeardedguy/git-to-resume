import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar, User } from "lucide-react";
import { notFound } from "next/navigation";
import { ReportMetrics } from "@/types";

interface Props {
  params: Promise<{ hash: string }>;
}

export default async function PublicReportPage({ params }: Props) {
  const { hash } = await params;

  const report = await prisma.report.findUnique({
    where: { verificationHash: hash },
    include: {
      user: {
        select: {
          username: true,
          name: true,
          image: true,
        },
      },
    },
  });

  if (!report || report.status !== "completed") {
    notFound();
  }

  if (report.expiresAt.getTime() < Date.now()) {
    notFound();
  }

  let metrics: ReportMetrics | null = null;
  try {
    metrics = report.metrics ? (JSON.parse(report.metrics) as ReportMetrics) : null;
  } catch {
    metrics = null;
  }

  if (metrics && typeof metrics.privateRepoCount !== "undefined") {
    metrics.privateRepoCount = null;
  }

  if (!metrics) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-2 mb-8 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-800 font-medium">
            Verified GitHub Activity Report
          </span>
        </div>

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
                    {report.user.name || report.user.username}
                  </CardTitle>
                  <p className="text-muted-foreground">
                    @{report.user.username}
                  </p>
                </div>
              </div>
              <Badge variant="secondary" className="text-sm">
                Last {report.timeWindow} Months
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                <span>
                  Generated:{" "}
                  {new Date(report.generatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
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
          />
          <MetricCard
            label="Recency"
            value={metrics.recencyScore}
            description="Recent activity weight"
          />
          <MetricCard
            label="Ownership"
            value={metrics.ownershipScore}
            description="Code ownership depth"
          />
          <MetricCard
            label="Collaboration"
            value={metrics.collaborationIndex}
            description="Team interaction"
          />
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Primary Languages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.primaryLanguages.map((lang) => (
                <div
                  key={lang.language}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: lang.color }}
                  />
                  <span className="font-medium">{lang.language}</span>
                  <span className="text-muted-foreground">
                    {lang.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Activity Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <StatItem
                label="Total Commits"
                value={metrics.contributionSummary.totalCommits}
              />
              <StatItem
                label="Pull Requests"
                value={metrics.contributionSummary.totalPRs}
              />
              <StatItem
                label="Merged PRs"
                value={metrics.contributionSummary.mergedPRs}
              />
              <StatItem
                label="Code Reviews"
                value={metrics.contributionSummary.reviewsGiven}
              />
              <StatItem
                label="Issues Opened"
                value={metrics.contributionSummary.issuesOpened}
              />
              <StatItem
                label="Issues Closed"
                value={metrics.contributionSummary.issuesClosed}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Repositories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metrics.topRepositories.map((repo) => (
                <div
                  key={repo.name}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{repo.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {repo.description || "No description"}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{repo.role}</Badge>
                      {repo.languages.map((lang) => (
                        <span key={lang} className="text-xs text-muted-foreground">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p>{repo.commits} commits</p>
                    <p className="text-muted-foreground">
                      {repo.ownershipPercentage}% ownership
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          This report was generated by Git-to-Resume and verified against GitHub
          data.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: number;
  description: string;
}) {
  const getColor = (v: number) => {
    if (v >= 70) return "text-green-600";
    if (v >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-3xl font-bold ${getColor(value)}`}>{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
