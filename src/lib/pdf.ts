// Client-side PDF typesetting for a daily edition, in a broadsheet style.
import type { EditionStory } from "./queries";
import { topicLabel } from "./feeds";
import { formatEditionDate } from "./dates";

type Img = { dataUrl: string; format: "JPEG" | "PNG" };

export interface PdfInput {
  date: string;
  editionNumber: number;
  readerName: string | null;
  note: string | null;
  stories: EditionStory[];
  images: Record<string, Img>;
}

function clean(s: string) {
  // jsPDF core fonts are WinAnsi; normalise typographic characters.
  return s
    .replace(/[\u2018\u2019\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");
}

export async function buildEditionPdf(input: PdfInput): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const ink: [number, number, number] = [30, 26, 22];
  const red: [number, number, number] = [158, 32, 28];
  const grey: [number, number, number] = [110, 104, 96];
  const paper: [number, number, number] = [250, 246, 238];
  let page = 1;

  const paintPaper = () => {
    doc.setFillColor(...paper);
    doc.rect(0, 0, W, H, "F");
  };

  const footer = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...grey);
    doc.text(clean(`The Morning Paper  |  ${formatEditionDate(input.date)}  |  Page ${page}`), W / 2, H - 18, { align: "center" });
  };

  const masthead = () => {
    paintPaper();
    doc.setTextColor(...ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(clean(`VOL. I  -  NO. ${input.editionNumber}`), M, M + 4);
    doc.text(clean(input.readerName ? `PREPARED FOR ${input.readerName.toUpperCase()}` : "YOUR PERSONAL EDITION"), W - M, M + 4, { align: "right" });
    doc.setLineWidth(1.6);
    doc.setDrawColor(...ink);
    doc.line(M, M + 12, W - M, M + 12);
    doc.setFont("times", "bold");
    doc.setFontSize(52);
    doc.text("The Morning Paper", W / 2, M + 62, { align: "center" });
    doc.setLineWidth(0.6);
    doc.line(M, M + 76, W - M, M + 76);
    doc.line(M, M + 79, W - M, M + 79);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(clean(`${formatEditionDate(input.date).toUpperCase()}   -   ${input.stories.length} STORIES FROM REAL NEWSROOMS`), W / 2, M + 92, { align: "center" });
    doc.setLineWidth(0.3);
    doc.line(M, M + 98, W - M, M + 98);
    return M + 114;
  };

  const runningHead = () => {
    paintPaper();
    doc.setTextColor(...ink);
    doc.setFont("times", "bold");
    doc.setFontSize(16);
    doc.text("The Morning Paper", M, M + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(clean(formatEditionDate(input.date).toUpperCase()), W - M, M + 8, { align: "right" });
    doc.setLineWidth(0.8);
    doc.line(M, M + 16, W - M, M + 16);
    return M + 32;
  };

  let y = masthead();

  // Editor's note
  if (input.note) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...red);
    doc.text("FROM THE EDITOR", M, y);
    doc.setFont("times", "italic");
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    const lines = doc.splitTextToSize(clean(input.note), W - 2 * M);
    doc.text(lines, M, y + 14);
    y += 14 + lines.length * 13 + 10;
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 16;
  }

  const [lead, ...rest] = input.stories;
  const summaryOf = (s: EditionStory) => s.article.ai_summary || s.article.description || "";

  // Lead story
  if (lead) {
    const img = lead.article.image_url ? input.images[lead.article.image_url] : undefined;
    const colW = W - 2 * M;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...red);
    doc.text(clean(`${topicLabel(lead.article.category).toUpperCase()}  -  LEAD STORY`), M, y);
    y += 8;
    doc.setFont("times", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...ink);
    const hl = doc.splitTextToSize(clean(lead.article.title), colW);
    doc.text(hl, M, y + 22);
    y += 22 + (hl.length - 1) * 28 + 12;
    if (img) {
      try {
        const props = doc.getImageProperties(img.dataUrl);
        const ih = Math.min(240, (colW * props.height) / props.width);
        doc.addImage(img.dataUrl, img.format, M, y, colW, ih, undefined, "FAST");
        y += ih + 6;
      } catch {
        /* ignore bad image */
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...grey);
    doc.text(clean(`${lead.article.source.toUpperCase()}${lead.article.published_at ? "  -  " + new Date(lead.article.published_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : ""}`), M, y + 8);
    y += 22;
    doc.setFont("times", "normal");
    doc.setFontSize(11.5);
    doc.setTextColor(...ink);
    const body = doc.splitTextToSize(clean(summaryOf(lead)), colW);
    doc.text(body, M, y);
    y += body.length * 14.5 + 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...red);
    doc.textWithLink("Read the full story at the source >", M, y, { url: lead.article.url });
    y += 14;
    doc.setDrawColor(...ink);
    doc.setLineWidth(1.2);
    doc.line(M, y, W - M, y);
    y += 18;
  }

  // Three-column flow for remaining stories
  const cols = 3;
  const gap = 16;
  const colW = (W - 2 * M - gap * (cols - 1)) / cols;
  let col = 0;
  let colTop = y;
  let cy = y;
  const bottom = H - 40;

  const nextColumn = () => {
    col++;
    if (col >= cols) {
      footer();
      doc.addPage();
      page++;
      colTop = runningHead();
      col = 0;
    }
    cy = colTop;
  };

  const drawColumnRules = () => {
    /* subtle vertical rules between columns */
  };
  drawColumnRules();

  for (const s of rest) {
    const x = M + col * (colW + gap);
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    const hl = doc.splitTextToSize(clean(s.article.title), colW);
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    const body = doc.splitTextToSize(clean(summaryOf(s)), colW);
    const img = s.article.image_url ? input.images[s.article.image_url] : undefined;
    let imgH = 0;
    if (img) {
      try {
        const p = doc.getImageProperties(img.dataUrl);
        imgH = Math.min(110, (colW * p.height) / p.width);
      } catch {
        imgH = 0;
      }
    }
    const need = 10 + hl.length * 15 + (imgH ? imgH + 6 : 0) + 14 + body.length * 12 + 26;
    if (cy + Math.min(need, 160) > bottom) nextColumn();
    const cx = M + col * (colW + gap);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...red);
    doc.text(clean(topicLabel(s.article.category).toUpperCase()), cx, cy);
    cy += 10;
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...ink);
    for (const line of hl) {
      if (cy > bottom) { nextColumn(); }
      doc.text(line, M + col * (colW + gap), cy + 9);
      cy += 15;
    }
    if (img && imgH) {
      if (cy + imgH > bottom) nextColumn();
      try {
        doc.addImage(img.dataUrl, img.format, M + col * (colW + gap), cy, colW, imgH, undefined, "FAST");
        cy += imgH + 6;
      } catch {
        /* ignore */
      }
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...grey);
    doc.text(clean(s.article.source.toUpperCase()), M + col * (colW + gap), cy + 6);
    cy += 14;
    doc.setFont("times", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...ink);
    for (const line of body) {
      if (cy + 12 > bottom) nextColumn();
      doc.text(line, M + col * (colW + gap), cy + 8);
      cy += 12;
    }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...red);
    doc.textWithLink("Read at source >", M + col * (colW + gap), cy + 8, { url: s.article.url });
    cy += 16;
    doc.setDrawColor(200, 192, 180);
    doc.setLineWidth(0.4);
    doc.line(M + col * (colW + gap), cy, M + col * (colW + gap) + colW, cy);
    cy += 12;
    void x;
  }
  footer();
  return doc.output("blob");
}
