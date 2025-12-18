import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await prisma.$transaction([
      prisma.account.deleteMany({
        where: {
          userId: session.user.id,
          provider: "github",
        },
      }),
      prisma.session.deleteMany({
        where: {
          userId: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("GitHub unlink error:", error);
    return NextResponse.json({ error: "Failed to unlink GitHub" }, { status: 500 });
  }
}
