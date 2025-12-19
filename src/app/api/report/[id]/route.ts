import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NO_STORE_HEADERS } from "@/lib/utils";

function parseIncludedRepos(value: string | null): string[] | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return null;
  }
}

function parseMetrics(value: string | null): unknown | null {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            name: true,
            image: true,
            accountAge: true,
          },
        },
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    return NextResponse.json(
      {
        id: report.id,
        status: report.status,
        generatedAt: report.generatedAt,
        verificationHash: report.verificationHash,
        timeWindow: report.timeWindow,
        metrics: parseMetrics(report.metrics),
        cvInsert: report.cvInsert,
        includedRepos: parseIncludedRepos(report.includedRepos),
        aiSummary: report.aiSummary,
        aiSummaryModel: report.aiSummaryModel,
        aiSummaryGeneratedAt: report.aiSummaryGeneratedAt,
        user: report.user,
        shareableLink: `${process.env.NEXTAUTH_URL}/r/${report.verificationHash}`,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const report = await prisma.report.findUnique({
      where: { id },
      select: { id: true, userId: true },
    });

    if (!report) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404, headers: NO_STORE_HEADERS }
      );
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    await prisma.report.delete({ where: { id } });

    return NextResponse.json({ ok: true }, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Report delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete report" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
