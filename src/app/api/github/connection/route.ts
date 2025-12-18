import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "github",
      },
      select: {
        id: true,
        scope: true,
        providerAccountId: true,
      },
    });

    return NextResponse.json({
      connected: Boolean(account),
      scope: account?.scope ?? null,
      providerAccountId: account?.providerAccountId ?? null,
    });
  } catch (error) {
    console.error("GitHub connection fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch GitHub connection" },
      { status: 500 }
    );
  }
}
