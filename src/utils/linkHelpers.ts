import { NoteAttachment, Note } from '../types';

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

export const extractWikiLinks = (body: string): string[] => {
  if (!body) return [];
  const regex = /\[\[([^\]]+)\]\]/g;
  const matches = [];
  let match;
  while ((match = regex.exec(body)) !== null) {
    matches.push(match[1].trim());
  }
  return matches;
};

export const resolveLinks = (titles: string[], allNotes: Note[]): string[] => {
  return titles
    .map(title => {
      const found = allNotes.find(n =>
        n.title.toLowerCase().trim() === title.toLowerCase().trim()
      );
      return found?.id;
    })
    .filter(Boolean) as string[];
};
