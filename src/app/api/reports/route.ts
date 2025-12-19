import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NO_STORE_HEADERS } from "@/lib/utils";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const reports = await prisma.report.findMany({
      where: { userId: session.user.id },
      orderBy: { generatedAt: "desc" },
      select: {
        id: true,
        status: true,
        generatedAt: true,
        verificationHash: true,
      },
    });

    return NextResponse.json(reports, { headers: NO_STORE_HEADERS });
  } catch (error) {
    console.error("Reports fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
