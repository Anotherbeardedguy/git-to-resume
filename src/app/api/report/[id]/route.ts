import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    if (report.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      id: report.id,
      status: report.status,
      generatedAt: report.generatedAt,
      verificationHash: report.verificationHash,
      metrics: report.metrics ? JSON.parse(report.metrics) : null,
      cvInsert: report.cvInsert,
      user: report.user,
      shareableLink: `${process.env.NEXTAUTH_URL}/r/${report.verificationHash}`,
    });
  } catch (error) {
    console.error("Report fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch report" },
      { status: 500 }
    );
  }
}
