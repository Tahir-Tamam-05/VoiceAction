import { NoteAttachment } from '../types';

export function extractLinks(text: string): NoteAttachment[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex) || [];
  return matches.map(url => ({
    id: crypto.randomUUID(),
    type: "link" as const,
    content: url,
    label: getDomainName(url),
    createdAt: Date.now(),
  }));
}

export function getDomainName(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url;
  }
}
