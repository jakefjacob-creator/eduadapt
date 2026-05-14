import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

/* Warm, calm document styling — matches the EduAdapt palette. */
const INK = rgb(0.24, 0.21, 0.19);
const CORAL = rgb(0.82, 0.4, 0.3);
const SAGE = rgb(0.37, 0.53, 0.44);
const MUTED = rgb(0.48, 0.44, 0.4);

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 56;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface RenderState {
  doc: PDFDocument;
  font: PDFFont;
  bold: PDFFont;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
}

function newPage(state: RenderState) {
  state.page = state.doc.addPage([PAGE_W, PAGE_H]);
  state.y = PAGE_H - MARGIN;
}

function ensureSpace(state: RenderState, needed: number) {
  if (state.y - needed < MARGIN) newPage(state);
}

/** Word-wrap a string to a max width at a given font size. */
function wrap(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const trial = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(trial, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function drawParagraph(
  state: RenderState,
  text: string,
  opts: {
    font: PDFFont;
    size: number;
    color: ReturnType<typeof rgb>;
    indent?: number;
    lineGap?: number;
    spaceAfter?: number;
  },
) {
  const indent = opts.indent ?? 0;
  const lineHeight = opts.size + (opts.lineGap ?? 5);
  const lines = wrap(text, opts.font, opts.size, CONTENT_W - indent);
  for (const line of lines) {
    ensureSpace(state, lineHeight);
    state.page.drawText(line, {
      x: MARGIN + indent,
      y: state.y - opts.size,
      size: opts.size,
      font: opts.font,
      color: opts.color,
    });
    state.y -= lineHeight;
  }
  state.y -= opts.spaceAfter ?? 0;
}

/**
 * Generate a clean, accessible A4 PDF from lightweight Markdown.
 * Supports: # / ## / ### headings, "- " bullets, "1." numbered lists,
 * blank-line paragraph breaks. Returns raw PDF bytes.
 */
export async function generatePdf(input: {
  title: string;
  subtitle?: string;
  body: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const state: RenderState = {
    doc,
    font,
    bold,
    page: doc.addPage([PAGE_W, PAGE_H]),
    y: PAGE_H - MARGIN,
  };

  // ── Title block ───────────────────────────────────────
  drawParagraph(state, input.title, {
    font: bold,
    size: 22,
    color: CORAL,
    lineGap: 6,
    spaceAfter: input.subtitle ? 2 : 10,
  });
  if (input.subtitle) {
    drawParagraph(state, input.subtitle, {
      font,
      size: 11,
      color: MUTED,
      spaceAfter: 12,
    });
  }

  // ── Body ──────────────────────────────────────────────
  const lines = input.body.replace(/\r\n/g, "\n").split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      state.y -= 6;
      continue;
    }

    // Headings
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const level = h[1].length;
      const size = level === 1 ? 16 : level === 2 ? 13 : 12;
      state.y -= 6;
      drawParagraph(state, h[2], {
        font: bold,
        size,
        color: level === 1 ? CORAL : SAGE,
        lineGap: 5,
        spaceAfter: 4,
      });
      continue;
    }

    // Bullets
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    if (bullet) {
      ensureSpace(state, 16);
      state.page.drawText("•", {
        x: MARGIN + 6,
        y: state.y - 11,
        size: 11,
        font: bold,
        color: SAGE,
      });
      drawParagraph(state, bullet[1], {
        font,
        size: 11,
        color: INK,
        indent: 22,
        spaceAfter: 2,
      });
      continue;
    }

    // Numbered list
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      ensureSpace(state, 16);
      state.page.drawText(`${numbered[1]}.`, {
        x: MARGIN + 4,
        y: state.y - 11,
        size: 11,
        font: bold,
        color: SAGE,
      });
      drawParagraph(state, numbered[2], {
        font,
        size: 11,
        color: INK,
        indent: 24,
        spaceAfter: 2,
      });
      continue;
    }

    // Plain paragraph (strip simple ** bold markers)
    drawParagraph(state, line.replace(/\*\*/g, ""), {
      font,
      size: 11,
      color: INK,
      spaceAfter: 4,
    });
  }

  // ── Footer on every page ──────────────────────────────
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    p.drawText(`Made with EduAdapt  ·  page ${i + 1} of ${pages.length}`, {
      x: MARGIN,
      y: MARGIN - 24,
      size: 8,
      font,
      color: MUTED,
    });
  });

  return doc.save();
}
