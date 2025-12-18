import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PDFDocument from "pdfkit/js/pdfkit.standalone.js";
import { PassThrough, Readable } from "stream";
import { ReportMetrics } from "@/types";

export const runtime = "nodejs";

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

    if (report.status !== "completed" || !report.metrics || !report.cvInsert) {
      return NextResponse.json(
        { error: "Report not ready" },
        { status: 400 }
      );
    }

    const metrics: ReportMetrics = JSON.parse(report.metrics);

    const doc = new PDFDocument({
      size: "A4",
      margin: 50,
      info: {
        Title: "GitHub Activity Report",
        Author: "Git-to-Resume",
      },
    });

    const pass = new PassThrough();
    doc.pipe(pass);

    const displayName = report.user.name || report.user.username || "User";

    const COLORS = {
      primary: "#2563EB",
      slate900: "#0F172A",
      slate700: "#334155",
      slate500: "#64748B",
      slate200: "#E2E8F0",
      slate100: "#F1F5F9",
      green: "#16A34A",
      amber: "#D97706",
      red: "#DC2626",
    };

    const PAGE = {
      margin: 50,
      headerH: 64,
      footerH: 32,
      gap: 14,
      radius: 10,
    };

    const safeText = (value: string, maxLen: number) =>
      value.length > maxLen ? `${value.slice(0, maxLen - 1)}…` : value;

    const contentX = PAGE.margin;
    const contentW = doc.page.width - PAGE.margin * 2;

    const withSavedCursor = (fn: () => void) => {
      const prevX = doc.x;
      const prevY = doc.y;
      fn();
      doc.x = prevX;
      doc.y = prevY;
    };

    const truncateLineToWidth = (line: string, w: number) => {
      const ellipsis = "…";
      const trimmed = line.trimEnd();
      if (doc.widthOfString(trimmed) <= w) return trimmed;
      if (w <= doc.widthOfString(ellipsis)) return ellipsis;

      let low = 0;
      let high = trimmed.length;

      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        const candidate = `${trimmed.slice(0, mid).trimEnd()}${ellipsis}`;
        if (doc.widthOfString(candidate) <= w) low = mid;
        else high = mid - 1;
      }

      return `${trimmed.slice(0, low).trimEnd()}${ellipsis}`;
    };

    const wrapText = (text: string, w: number) => {
      const paragraphs = text.split(/\n+/g);
      const lines: string[] = [];

      for (const paragraph of paragraphs) {
        const words = paragraph.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
        if (words.length === 0) {
          lines.push("");
          continue;
        }

        let current = "";
        for (const word of words) {
          const next = current ? `${current} ${word}` : word;
          if (doc.widthOfString(next) <= w) {
            current = next;
            continue;
          }

          if (current) lines.push(current);

          if (doc.widthOfString(word) <= w) {
            current = word;
          } else {
            lines.push(truncateLineToWidth(word, w));
            current = "";
          }
        }
        if (current) lines.push(current);
      }

      return lines;
    };

    const drawWrappedTextInBox = (
      text: string,
      x: number,
      y: number,
      w: number,
      h: number,
      options?: PDFKit.Mixins.TextOptions
    ) => {
      withSavedCursor(() => {
        doc.save();
        doc.rect(x, y, w, h).clip();

        const lineHeight = doc.currentLineHeight(true);
        const maxLines = Math.max(1, Math.floor(h / lineHeight));
        const align = options?.align;

        const allLines = wrapText(text, w);
        const needsEllipsis = allLines.length > maxLines;
        const lines = allLines.slice(0, maxLines);

        if (needsEllipsis) {
          const lastIdx = lines.length - 1;
          lines[lastIdx] = truncateLineToWidth(`${lines[lastIdx]} …`, w);
        }

        for (let i = 0; i < lines.length; i += 1) {
          const lineY = y + i * lineHeight;
          if (lineY > y + h - lineHeight) break;
          doc.text(lines[i] ?? "", x, lineY, {
            width: w,
            align,
            lineBreak: false,
          });
        }

        doc.restore();
      });
    };

    const drawPreformattedTextInBox = (
      text: string,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      withSavedCursor(() => {
        doc.save();
        doc.rect(x, y, w, h).clip();

        const lineHeight = doc.currentLineHeight(true);
        const maxLines = Math.max(1, Math.floor(h / lineHeight));

        const rawLines = text.split("\n");
        const lines = rawLines.slice(0, maxLines);

        if (rawLines.length > maxLines) {
          const lastIdx = lines.length - 1;
          lines[lastIdx] = truncateLineToWidth(`${lines[lastIdx]} …`, w);
        }

        for (let i = 0; i < lines.length; i += 1) {
          const lineY = y + i * lineHeight;
          if (lineY > y + h - lineHeight) break;
          doc.text(lines[i] ?? "", x, lineY, {
            width: w,
            lineBreak: false,
          });
        }

        doc.restore();
      });
    };

    const header = () => {
      const y = 0;
      doc.save();
      doc.rect(0, y, doc.page.width, PAGE.headerH).fill(COLORS.slate900);
      doc
        .fillColor("#FFFFFF")
        .fontSize(16)
        .text("Git-to-Resume", contentX, y + 18, { width: contentW });
      doc
        .fillColor(COLORS.slate200)
        .fontSize(10)
        .text("GitHub Activity Report", contentX, y + 40, { width: contentW });
      doc.restore();

      doc.x = contentX;
      doc.y = PAGE.headerH + 18;
    };

    const footer = () => {
      const y = doc.page.height - PAGE.footerH;
      doc.save();
      doc
        .strokeColor(COLORS.slate200)
        .lineWidth(1)
        .moveTo(PAGE.margin, y)
        .lineTo(doc.page.width - PAGE.margin, y)
        .stroke();

      doc
        .fillColor(COLORS.slate500)
        .fontSize(9)
        .text(
          `Verification: ${report.verificationHash}`,
          PAGE.margin,
          y + 10,
          { width: contentW }
        );

      doc
        .fillColor(COLORS.slate500)
        .fontSize(9)
        .text(
          `Generated: ${new Date(report.generatedAt).toLocaleDateString()}`,
          PAGE.margin,
          y + 10,
          { width: contentW, align: "right" }
        );
      doc.restore();
    };

    const ensureSpace = (height: number) => {
      const bottom = doc.page.height - PAGE.footerH - 18;
      if (doc.y + height <= bottom) return;
      footer();
      doc.addPage();
      header();
    };

    const sectionTitle = (title: string) => {
      ensureSpace(34);
      doc
        .fillColor(COLORS.slate900)
        .fontSize(13)
        .text(title, { width: contentW });
      const y = doc.y + 6;
      doc
        .strokeColor(COLORS.slate200)
        .lineWidth(1)
        .moveTo(contentX, y)
        .lineTo(contentX + contentW, y)
        .stroke();
      doc.y = y + 12;
    };

    const scoreColor = (value: number) => {
      if (value >= 70) return COLORS.green;
      if (value >= 40) return COLORS.amber;
      return COLORS.red;
    };

    const metricCard = (
      x: number,
      y: number,
      w: number,
      h: number,
      label: string,
      value: number,
      hint: string
    ) => {
      withSavedCursor(() => {
        doc.save();
        doc.roundedRect(x, y, w, h, PAGE.radius).fill(COLORS.slate100);
        doc
          .strokeColor(COLORS.slate200)
          .lineWidth(1)
          .roundedRect(x, y, w, h, PAGE.radius)
          .stroke();

        doc.fillColor(COLORS.slate500).fontSize(9);
        drawWrappedTextInBox(label.toUpperCase(), x + 12, y + 10, w - 24, 12);

        doc.fillColor(COLORS.slate900).fontSize(22);
        drawWrappedTextInBox(String(value), x + 12, y + 26, w - 24, 24);

        const barX = x + 12;
        const barY = y + h - 28;
        const barW = w - 24;
        const barH = 6;
        doc.roundedRect(barX, barY, barW, barH, 3).fill("#E5E7EB");
        doc
          .roundedRect(
            barX,
            barY,
            (barW * Math.max(0, Math.min(100, value))) / 100,
            barH,
            3
          )
          .fill(scoreColor(value));

        doc.fillColor(COLORS.slate500).fontSize(9);
        drawWrappedTextInBox(hint, x + 12, y + h - 18, w - 24, 12);

        doc.restore();
      });
    };

    const statPill = (
      x: number,
      y: number,
      w: number,
      label: string,
      value: string
    ) => {
      withSavedCursor(() => {
        doc.save();
        doc.roundedRect(x, y, w, 30, 8).fill(COLORS.slate100);
        doc
          .strokeColor(COLORS.slate200)
          .lineWidth(1)
          .roundedRect(x, y, w, 30, 8)
          .stroke();
        doc.fillColor(COLORS.slate500).fontSize(9);
        drawWrappedTextInBox(label, x + 10, y + 7, w - 20, 12);
        doc.fillColor(COLORS.slate900).fontSize(11);
        drawWrappedTextInBox(value, x + 10, y + 16, w - 20, 12, { align: "right" });
        doc.restore();
      });
    };

    const repoCard = (
      x: number,
      y: number,
      w: number,
      repo: ReportMetrics["topRepositories"][number]
    ) => {
      const h = 92;
      withSavedCursor(() => {
        doc.save();
        doc.roundedRect(x, y, w, h, PAGE.radius).fill("#FFFFFF");
        doc
          .strokeColor(COLORS.slate200)
          .lineWidth(1)
          .roundedRect(x, y, w, h, PAGE.radius)
          .stroke();

        doc.fillColor(COLORS.slate900).fontSize(11);
        drawWrappedTextInBox(safeText(repo.name, 28), x + 12, y + 12, w - 24, 14);

        doc.fillColor(COLORS.slate500).fontSize(9);
        drawWrappedTextInBox(
          safeText(repo.description || "No description", 220),
          x + 12,
          y + 28,
          w - 24,
          32
        );

        const meta = [
          repo.role,
          repo.languages.slice(0, 2).join(", ") || "N/A",
          `${repo.commits} commits`,
          `${repo.ownershipPercentage}% ownership`,
        ].join(" • ");

        doc.fillColor(COLORS.slate700).fontSize(9);
        drawWrappedTextInBox(safeText(meta, 140), x + 12, y + 66, w - 24, 18);

        doc.restore();
      });
      return h;
    };

    header();

    doc
      .fillColor(COLORS.slate900)
      .fontSize(22)
      .text("GitHub Activity Report", { width: contentW });
    doc
      .fillColor(COLORS.slate500)
      .fontSize(11)
      .text(
        `${displayName} (@${report.user.username ?? ""}) • Last 12 months`,
        { width: contentW }
      );
    doc.moveDown(1);

    const summaryBoxY = doc.y;
    const summaryBoxH = 74;
    ensureSpace(summaryBoxH + 16);
    doc.save();
    doc.roundedRect(contentX, summaryBoxY, contentW, summaryBoxH, PAGE.radius).fill("#FFFFFF");
    doc
      .strokeColor(COLORS.slate200)
      .lineWidth(1)
      .roundedRect(contentX, summaryBoxY, contentW, summaryBoxH, PAGE.radius)
      .stroke();
    doc.restore();

    doc.x = contentX + 16;
    doc.y = summaryBoxY + 14;
    doc
      .fillColor(COLORS.slate500)
      .fontSize(9)
      .text("EXECUTIVE SUMMARY", { width: contentW - 32 });
    doc
      .fillColor(COLORS.slate900)
      .fontSize(12)
      .text(`Active repos: ${metrics.activeRepos}`, { width: contentW - 32 });
    doc
      .fillColor(COLORS.slate700)
      .fontSize(10)
      .text(
        `Primary languages: ${metrics.primaryLanguages
          .map((l) => `${l.language} (${l.percentage}%)`)
          .join(", ")}`,
        { width: contentW - 32 }
      );

    doc.x = contentX;
    doc.y = summaryBoxY + summaryBoxH + 18;

    sectionTitle("Core Metrics");

    const cardH = 84;
    const colGap = 14;
    const colW = (contentW - colGap) / 2;
    const rowGap = 14;

    ensureSpace(cardH * 2 + rowGap + 18);
    const startY = doc.y;

    metricCard(
      contentX,
      startY,
      colW,
      cardH,
      "Consistency",
      metrics.consistencyIndex,
      "Active weeks ratio"
    );
    metricCard(
      contentX + colW + colGap,
      startY,
      colW,
      cardH,
      "Recency",
      metrics.recencyScore,
      "Recent activity weight"
    );
    metricCard(
      contentX,
      startY + cardH + rowGap,
      colW,
      cardH,
      "Ownership",
      metrics.ownershipScore,
      "Contribution depth"
    );
    metricCard(
      contentX + colW + colGap,
      startY + cardH + rowGap,
      colW,
      cardH,
      "Collaboration",
      metrics.collaborationIndex,
      "Team interaction"
    );

    doc.y = startY + cardH * 2 + rowGap + 20;

    sectionTitle("Activity Summary");

    const pillW = (contentW - colGap) / 2;
    const pillY = doc.y;
    ensureSpace(78);
    statPill(
      contentX,
      pillY,
      pillW,
      "Commits (estimated)",
      String(metrics.contributionSummary.totalCommits)
    );
    statPill(
      contentX + pillW + colGap,
      pillY,
      pillW,
      "Pull requests",
      String(metrics.contributionSummary.totalPRs)
    );
    statPill(
      contentX,
      pillY + 40,
      pillW,
      "Code reviews",
      String(metrics.contributionSummary.reviewsGiven)
    );
    statPill(
      contentX + pillW + colGap,
      pillY + 40,
      pillW,
      "Active weeks",
      `${metrics.contributionSummary.activeWeeks}/${metrics.contributionSummary.totalWeeks}`
    );

    doc.y = pillY + 84;

    sectionTitle("Top Repositories");

    const repoGap = 12;
    const repoCardH = 92;
    const repoRowH = repoCardH + repoGap;
    const repoColW = (contentW - repoGap) / 2;

    const repos = metrics.topRepositories.slice(0, 6);
    if (repos.length === 0) {
      doc
        .fillColor(COLORS.slate500)
        .fontSize(10)
        .text("No repository activity found in the last 12 months.", {
          width: contentW,
        });
      doc.moveDown(1);
    } else {
      let repoY = doc.y;

      for (let i = 0; i < repos.length; i += 2) {
        const bottom = doc.page.height - PAGE.footerH - 18;
        if (repoY + repoCardH > bottom) {
          footer();
          doc.addPage();
          header();
          sectionTitle("Top Repositories");
          repoY = doc.y;
        }

        const left = repos[i];
        const right = repos[i + 1];

        repoCard(contentX, repoY, repoColW, left);
        if (right) {
          repoCard(contentX + repoColW + repoGap, repoY, repoColW, right);
        }

        repoY += repoRowH;
      }

      doc.y = repoY;
    }

    footer();

    doc.addPage();
    header();

    sectionTitle("CV Insert");
    ensureSpace(220);

    const boxY = doc.y;
    const boxH = 260;
    doc.save();
    doc.roundedRect(contentX, boxY, contentW, boxH, PAGE.radius).fill(COLORS.slate100);
    doc
      .strokeColor(COLORS.slate200)
      .lineWidth(1)
      .roundedRect(contentX, boxY, contentW, boxH, PAGE.radius)
      .stroke();
    doc.restore();

    doc.fillColor(COLORS.slate700).fontSize(10);
    drawPreformattedTextInBox(
      report.cvInsert,
      contentX + 16,
      boxY + 16,
      contentW - 32,
      boxH - 32
    );

    doc.x = contentX;
    doc.y = boxY + boxH + 18;

    const shareableLink = `${process.env.NEXTAUTH_URL}/r/${report.verificationHash}`;
    doc
      .fillColor(COLORS.slate900)
      .fontSize(11)
      .text("Verification link", { width: contentW });
    doc
      .fillColor(COLORS.primary)
      .fontSize(10)
      .text(shareableLink, { width: contentW, link: shareableLink });
    doc.moveDown(0.5);
    doc
      .fillColor(COLORS.slate500)
      .fontSize(9)
      .text(
        "This report provides activity evidence only. It does not claim skill level.",
        { width: contentW }
      );

    footer();

    doc.end();

    const webStream = Readable.toWeb(pass) as unknown as ReadableStream;

    return new Response(webStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="github-activity-report-${id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
