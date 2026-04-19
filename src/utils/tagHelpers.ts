export const TAG_TAXONOMY = [
  'WORK', 'PERSONAL', 'IDEA', 'URGENT', 'HEALTH',
  'FINANCE', 'TRAVEL', 'LEARNING', 'CREATIVE', 'SOCIAL',
  'SHOPPING', 'REMINDER', 'GOAL', 'RESEARCH', 'MEETING',
  'PROJECT', 'NOTE', 'REFLECTION', 'JOURNAL', 'OTHER'
] as const;

export type Tag = typeof TAG_TAXONOMY[number];

export const normalizeTags = (raw: string[] | undefined): Tag[] => {
  if (!raw || !Array.isArray(raw)) return [];
  return raw
    .map(t => typeof t === 'string' ? t.toUpperCase().trim() : '')
    .filter(t => TAG_TAXONOMY.includes(t as Tag))
    .slice(0, 3) as Tag[];
};
