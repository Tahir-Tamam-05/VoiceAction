import { Note } from '../types';

export function exportAsMarkdown(items: Note[]): void {
  const md = items.map(item => `
## ${item.title}
**Type:** ${item.type} | **Date:** ${item.timestamp}

${item.content}

${item.body ? `**Notes:** ${item.body}` : ""}
${item.attachments?.map(a => `- [${a.label}](${a.content})`).join("\n") || ""}
---`).join("\n");

  downloadFile("voiceaction-notes.md", md, "text/markdown");
}

export function exportAsCSV(items: Note[]): void {
  const headers = "Title,Type,Content,Date,Pinned\n";
  const rows = items.map(i =>
    `"${i.title}","${i.type}","${i.content}","${i.timestamp}","${i.pinned}"`
  ).join("\n");
  downloadFile("voiceaction-notes.csv", headers + rows, "text/csv");
}

function downloadFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
