import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeGitHubActivity, generateCVInsert } from "@/lib/github";
import { generateSemanticSummary } from "@/lib/openai";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const githubAccount = user.accounts.find(
      (a: { provider: string; access_token: string | null }) =>
        a.provider === "github"
    );

    if (!githubAccount?.access_token) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => null);
    if (body !== null && (typeof body !== "object" || Array.isArray(body))) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const includedRepoFullNamesRaw = (body as { includedRepoFullNames?: unknown } | null)
      ?.includedRepoFullNames;
    const includePrivateRepoCountRaw = (body as { includePrivateRepoCount?: unknown } | null)
      ?.includePrivateRepoCount;

    if (
      typeof includePrivateRepoCountRaw !== "undefined" &&
      typeof includePrivateRepoCountRaw !== "boolean"
    ) {
      return NextResponse.json(
        { error: "includePrivateRepoCount must be a boolean" },
        { status: 400 }
      );
    }
    const includePrivateRepoCount = includePrivateRepoCountRaw === true;

    if (
      typeof includedRepoFullNamesRaw !== "undefined" &&
      !Array.isArray(includedRepoFullNamesRaw)
    ) {
      return NextResponse.json(
        { error: "includedRepoFullNames must be an array of strings" },
        { status: 400 }
      );
    }

    const includedRepoFullNames = Array.isArray(includedRepoFullNamesRaw)
      ? includedRepoFullNamesRaw
          .filter((v: unknown): v is string => typeof v === "string")
          .map((v) => v.trim())
          .filter((v) => v.length > 0 && v.length <= 200)
          .slice(0, 50)
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
        includedRepos: includedRepoFullNames?.length
          ? JSON.stringify(includedRepoFullNames)
          : null,
      },
    });

    try {
      const metrics = await analyzeGitHubActivity(
        githubAccount.access_token,
        user.username || user.name || "user",
        12,
        {
          includedRepoFullNames: includedRepoFullNames?.length
            ? includedRepoFullNames
            : undefined,
          includePrivateRepoCount,
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
          timeWindowMonths: 12,
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
      });
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
      { status: 500 }
    );
  }
}
