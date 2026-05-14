import type { DocumentType } from "./types";

export interface ExtractedDocument {
  /** Plain-text content, when it can be read directly from the file. */
  text: string | null;
  /** For images: base64 data passed to Claude vision for reading. */
  imageBase64: string | null;
  imageMediaType: string | null;
  /** Best-guess at the kind of document, refined later by Claude. */
  typeHint: DocumentType | null;
}

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "image/jpeg",
  "image/jpg": "image/jpeg",
  "image/png": "image/png",
  "image/webp": "image/webp",
  "image/gif": "image/gif",
};

/**
 * Pull readable content out of an uploaded file.
 *  - PDF   → text via pdf-parse
 *  - DOCX  → text via mammoth
 *  - image → base64 for Claude vision (handles photos of printed sheets)
 *  - text  → decoded directly
 */
export async function extractFromFile(
  buffer: Buffer,
  mimeType: string,
  filename: string,
): Promise<ExtractedDocument> {
  const lower = filename.toLowerCase();

  // ── PDF ───────────────────────────────────────────────
  if (mimeType === "application/pdf" || lower.endsWith(".pdf")) {
    // Import the parser directly to skip pdf-parse's debug-mode index file.
    const pdfParse = (await import("pdf-parse/lib/pdf-parse.js"))
      .default as (b: Buffer) => Promise<{ text: string }>;
    const parsed = await pdfParse(buffer);
    return {
      text: parsed.text.trim(),
      imageBase64: null,
      imageMediaType: null,
      typeHint: guessType(parsed.text),
    };
  }

  // ── Word .docx ────────────────────────────────────────
  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value.trim(),
      imageBase64: null,
      imageMediaType: null,
      typeHint: guessType(result.value),
    };
  }

  // ── Images (photo / scan of a printed sheet) ──────────
  const imageType =
    IMAGE_TYPES[mimeType] ||
    (lower.match(/\.(jpe?g|png|webp|gif)$/)
      ? IMAGE_TYPES["image/" + lower.split(".").pop()!.replace("jpg", "jpeg")]
      : null);
  if (imageType) {
    return {
      text: null,
      imageBase64: buffer.toString("base64"),
      imageMediaType: imageType,
      typeHint: null,
    };
  }

  // ── Plain text / fallback ─────────────────────────────
  if (
    mimeType.startsWith("text/") ||
    lower.endsWith(".txt") ||
    lower.endsWith(".md")
  ) {
    const text = buffer.toString("utf-8").trim();
    return {
      text,
      imageBase64: null,
      imageMediaType: null,
      typeHint: guessType(text),
    };
  }

  throw new Error(
    `Unsupported file type "${mimeType || filename}". Upload a PDF, Word .docx, image, or plain text file.`,
  );
}

/** Lightweight heuristic; Claude makes the final call during adaptation. */
function guessType(text: string): DocumentType | null {
  const t = text.toLowerCase();
  if (/lesson plan|learning objective|starter activity|plenary/.test(t)) {
    return "lesson_plan";
  }
  if (/visual schedule|prompt card|communication aid|now and next/.test(t)) {
    return "support_document";
  }
  if (/worksheet|questions?\s*\d|name:\s*_|complete the/.test(t)) {
    return "worksheet";
  }
  return null;
}
