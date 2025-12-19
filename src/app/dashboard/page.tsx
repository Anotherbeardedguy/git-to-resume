"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthButton } from "@/components/auth-button";
import {
  Github,
  FileText,
  Loader2,
  Plus,
  ExternalLink,
  Clock,
  Trash2,
} from "lucide-react";

interface Report {
  id: string;
  status: string;
  generatedAt: string;
  verificationHash: string;
}

interface RepoOption {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  pushedAt: string;
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [githubLoading, setGithubLoading] = useState(true);
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubScope, setGithubScope] = useState<string | null>(null);
  const [showRepoPicker, setShowRepoPicker] = useState(false);
  const [reposLoading, setReposLoading] = useState(false);
  const [repos, setRepos] = useState<RepoOption[]>([]);
  const [selectedRepos, setSelectedRepos] = useState<Record<string, boolean>>(
    {}
  );
  const [includePrivateRepoCount, setIncludePrivateRepoCount] = useState(false);
  const [timeWindowMonths, setTimeWindowMonths] = useState<12 | 24 | 36>(12);
  const [maxRepos, setMaxRepos] = useState<number>(10);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    }
  }, [status, router]);

  useEffect(() => {
    if (session) {
      fetchReports();
      fetchGitHubConnection();
    }
  }, [session]);

  const fetchGitHubConnection = async () => {
    setGithubLoading(true);
    try {
      const res = await fetch("/api/github/connection");
      if (res.ok) {
        const data = (await res.json()) as {
          connected: boolean;
          scope: string | null;
        };
        setGithubConnected(Boolean(data.connected));
        setGithubScope(data.scope ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch GitHub connection:", error);
    } finally {
      setGithubLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch("/api/reports");
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (error) {
      console.error("Failed to fetch reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const unlinkGitHub = async () => {
    const ok = window.confirm(
      "Unlink GitHub? You will be signed out and need to reconnect to generate reports."
    );
    if (!ok) return;

    try {
      const res = await fetch("/api/github/unlink", { method: "POST" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Failed to unlink GitHub");
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch (error) {
      console.error("Failed to unlink GitHub:", error);
      alert("Failed to unlink GitHub");
    }
  };

  const reauthorizeGitHub = async (scope: "minimal" | "repo") => {
    const scopeValue =
      scope === "repo" ? "read:user user:email repo" : "read:user user:email";

    await signIn(
      "github",
      { callbackUrl: "/dashboard" },
      { scope: scopeValue, prompt: "consent" }
    );
  };

  const fetchRepos = async () => {
    if (reposLoading || repos.length > 0) return;

    setReposLoading(true);
    try {
      const res = await fetch("/api/github/repos");
      if (res.ok) {
        const data = (await res.json()) as RepoOption[];
        setRepos(data);
        const defaults: Record<string, boolean> = {};
        data.slice(0, Math.max(1, Math.min(50, maxRepos))).forEach((r) => {
          defaults[r.fullName] = true;
        });
        setSelectedRepos(defaults);
      }
    } catch (error) {
      console.error("Failed to fetch repos:", error);
    } finally {
      setReposLoading(false);
    }
  };

  const generateReport = async (includedRepoFullNames?: string[]) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          includedRepoFullNames,
          includePrivateRepoCount,
          timeWindowMonths,
          maxRepos,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        router.push(`/report/${data.reportId}`);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to generate report");
      }
    } catch (error) {
      console.error("Failed to generate report:", error);
      alert("Failed to generate report. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const deleteReport = async (id: string) => {
    const ok = window.confirm(
      "Delete this report? This cannot be undone and will remove the verification link."
    );
    if (!ok) return;

    try {
      const res = await fetch(`/api/report/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        alert(error.error || "Failed to delete report");
        return;
      }
      await fetchReports();
    } catch (error) {
      console.error("Failed to delete report:", error);
      alert("Failed to delete report");
    }
  };

  const onGenerateClick = async () => {
    const included = Object.entries(selectedRepos)
      .filter(([, v]) => v)
      .map(([k]) => k);

    // If the user has loaded repos and made selections, apply them even when
    // the repo picker UI is currently hidden.
    const hasRepoSelection = repos.length > 0 && included.length > 0;

    await generateReport(hasRepoSelection ? included : undefined);
  };

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-12 w-48 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

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
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {session.user?.name}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Window
              <select
                className="h-10 rounded-md border bg-white px-3 text-sm"
                value={timeWindowMonths}
                onChange={(e) => setTimeWindowMonths(Number(e.target.value) as 12 | 24 | 36)}
                disabled={generating}
              >
                <option value={12}>12 mo</option>
                <option value={24}>24 mo</option>
                <option value={36}>36 mo</option>
              </select>
            </label>
            <label className="text-sm text-muted-foreground flex items-center gap-2">
              Max repos
              <input
                className="h-10 w-20 rounded-md border bg-white px-3 text-sm"
                type="number"
                min={1}
                max={50}
                value={maxRepos}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setMaxRepos(Number.isFinite(next) ? Math.max(1, Math.min(50, Math.floor(next))) : 10);
                }}
                disabled={generating}
              />
            </label>
            <Button
              variant="outline"
              onClick={() => {
                setShowRepoPicker((v) => !v);
                if (!showRepoPicker) void fetchRepos();
              }}
              disabled={generating}
              size="lg"
            >
              Manage repos
            </Button>
            <Button onClick={onGenerateClick} disabled={generating} size="lg">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Generate Report
              </>
            )}
            </Button>
          </div>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>GitHub Connection</CardTitle>
          </CardHeader>
          <CardContent>
            {githubLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {githubConnected ? "Connected" : "Not connected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Scope: {githubScope ?? "unknown"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void reauthorizeGitHub("minimal")}
                  >
                    Re-authorize (minimal)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void reauthorizeGitHub("repo")}
                  >
                    Re-authorize (repo)
                  </Button>
                  {githubConnected && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => void unlinkGitHub()}
                    >
                      Unlink
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {showRepoPicker && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Included repositories</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex items-center gap-2 mb-4 text-sm">
                <input
                  type="checkbox"
                  checked={includePrivateRepoCount}
                  onChange={(e) => setIncludePrivateRepoCount(e.target.checked)}
                />
                Include private repo count only (no private repo content is accessed)
              </label>
              {reposLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : repos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No repositories found.
                </p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        repos.forEach((r) => {
                          next[r.fullName] = true;
                        });
                        setSelectedRepos(next);
                      }}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedRepos({})}
                    >
                      Select none
                    </Button>
                  </div>

                  <div className="max-h-[340px] overflow-auto rounded-md border bg-white">
                    {repos.map((r) => (
                      <label
                        key={r.fullName}
                        className="flex items-start gap-3 px-3 py-2 border-b last:border-b-0 hover:bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={!!selectedRepos[r.fullName]}
                          onChange={(e) => {
                            setSelectedRepos((prev) => ({
                              ...prev,
                              [r.fullName]: e.target.checked,
                            }));
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium truncate">{r.fullName}</p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              ★ {r.stars}
                            </p>
                          </div>
                          {r.description && (
                            <p className="text-sm text-muted-foreground truncate">
                              {r.description}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground mt-3">
                    If you select none, the report will include all public non-fork repos.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Your Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : reports.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No reports yet</h3>
                <p className="text-muted-foreground mb-4">
                  Generate your first GitHub activity report to get started.
                </p>
                <Button onClick={onGenerateClick} disabled={generating}>
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Generate Report
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-3 h-3 rounded-full ${
                          report.status === "completed"
                            ? "bg-green-500"
                            : report.status === "processing"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                        }`}
                      />
                      <div>
                        <p className="font-medium">
                          Report #{report.id.slice(0, 8)}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(report.generatedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm px-2 py-1 rounded ${
                          report.status === "completed"
                            ? "bg-green-100 text-green-700"
                            : report.status === "processing"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {report.status}
                      </span>
                      {report.status === "completed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => router.push(`/report/${report.id}`)}
                        >
                          View
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => void deleteReport(report.id)}
                      >
                        <Trash2 className="mr-2 h-3 w-3" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">What&apos;s Analyzed</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Public repository activity</li>
                <li>• Commits, PRs, and issues</li>
                <li>• Code reviews and collaboration</li>
                <li>• Language distribution</li>
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <h3 className="font-semibold mb-2">Report Includes</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• 4 core metric scores</li>
                <li>• Top repository breakdown</li>
                <li>• CV-ready text insert</li>
                <li>• Shareable verification link</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
