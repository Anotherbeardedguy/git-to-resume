import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeGitHubActivity, generateCVInsert } from "@/lib/github";
import { generateSemanticSummary } from "@/lib/openai";
import { NO_STORE_HEADERS, rateLimit } from "@/lib/utils";
import { getUserPlan } from "@/lib/subscription";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const rl = rateLimit(`analyze:${session.user.id}`, {
      windowMs: 10 * 60 * 1000,
      max: 5,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many requests" },
        { status: 429, headers: rl.headers }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    const githubAccount = user.accounts.find(
      (a: { provider: string; access_token: string | null }) =>
        a.provider === "github"
    );

    if (!githubAccount?.access_token) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const plan = await getUserPlan(session.user.id);
    if (plan.maxReports > 0) {
      const reportCount = await prisma.report.count({
        where: { userId: session.user.id },
      });
      if (reportCount >= plan.maxReports) {
        return NextResponse.json(
          {
            error:
              "Free plan limit reached. Delete an existing report to generate a new one.",
          },
          { status: 403, headers: NO_STORE_HEADERS }
        );
      }
    }

    const body = await request.json().catch(() => null);
    if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const includedRepoFullNamesRaw = (body as { includedRepoFullNames?: unknown } | null)
      ?.includedRepoFullNames;
    const timeWindowMonthsRaw = (body as { timeWindowMonths?: unknown } | null)
      ?.timeWindowMonths;
    const maxReposRaw = (body as { maxRepos?: unknown } | null)?.maxRepos;

    const timeWindowMonths =
      timeWindowMonthsRaw === 12 || timeWindowMonthsRaw === 24 || timeWindowMonthsRaw === 36
        ? timeWindowMonthsRaw
        : 12;

    let maxRepos: number | null = null;
    if (typeof maxReposRaw !== "undefined") {
      if (typeof maxReposRaw !== "number" || !Number.isFinite(maxReposRaw)) {
        return NextResponse.json(
          { error: "maxRepos must be a number" },
          { status: 400, headers: NO_STORE_HEADERS }
        );
      }
      maxRepos = Math.max(1, Math.min(50, Math.floor(maxReposRaw)));
    }

    if (
      typeof includedRepoFullNamesRaw !== "undefined" &&
      !Array.isArray(includedRepoFullNamesRaw)
    ) {
      return NextResponse.json(
        { error: "includedRepoFullNames must be an array of strings" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const includedRepoFullNames = Array.isArray(includedRepoFullNamesRaw)
      ? includedRepoFullNamesRaw
          .filter((v: unknown): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0 && v.length <= 200)
          .slice(0, maxRepos ?? 50)
      : null;

    const verificationHash = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        verificationHash,
        status: "processing",
        expiresAt,
        timeWindow: timeWindowMonths,
        includedRepos: includedRepoFullNames?.length
          ? JSON.stringify(includedRepoFullNames)
          : null,
      },
    });

    try {
      const metrics = await analyzeGitHubActivity(
        githubAccount.access_token,
        user.username || user.name || "user",
        timeWindowMonths,
        {
          includedRepoFullNames: includedRepoFullNames?.length
            ? includedRepoFullNames
            : undefined,
          maxRepos: maxRepos ?? undefined,
        }
      );

      const cvInsert = generateCVInsert(metrics);

      let aiSummary: string | null = null;
      let aiSummaryModel: string | null = null;
      let aiSummaryGeneratedAt: Date | null = null;

      try {
        const ai = await generateSemanticSummary({
          metrics,
          cvInsert,
          username: user.username || user.name || "user",
          timeWindowMonths,
        });
        if (ai) {
          aiSummary = ai.summary;
          aiSummaryModel = ai.model;
          aiSummaryGeneratedAt = new Date();
        }
      } catch {
        aiSummary = null;
        aiSummaryModel = null;
        aiSummaryGeneratedAt = null;
      }

      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "completed",
          metrics: JSON.stringify(metrics),
          cvInsert,
          aiSummary,
          aiSummaryModel,
          aiSummaryGeneratedAt,
        },
      });

      return NextResponse.json({
        reportId: report.id,
        status: "completed",
      }, { headers: NO_STORE_HEADERS });
    } catch (analysisError) {
      await prisma.report.update({
        where: { id: report.id },
        data: { status: "failed" },
      });
      throw analysisError;
    }
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze GitHub activity" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
