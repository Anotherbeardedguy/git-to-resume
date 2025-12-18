import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { analyzeGitHubActivity, generateCVInsert } from "@/lib/github";
import crypto from "crypto";

export async function POST() {
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

    const githubAccount = user.accounts.find((a) => a.provider === "github");

    if (!githubAccount?.access_token) {
      return NextResponse.json(
        { error: "GitHub account not connected" },
        { status: 400 }
      );
    }

    const verificationHash = crypto.randomBytes(16).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const report = await prisma.report.create({
      data: {
        userId: user.id,
        verificationHash,
        status: "processing",
        expiresAt,
      },
    });

    try {
      const metrics = await analyzeGitHubActivity(
        githubAccount.access_token,
        user.username || user.name || "user",
        12
      );

      const cvInsert = generateCVInsert(metrics);

      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: "completed",
          metrics: JSON.stringify(metrics),
          cvInsert,
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
