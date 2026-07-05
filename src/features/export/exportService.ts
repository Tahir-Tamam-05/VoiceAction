// Export Service - Markdown, PDF, CSV, and image generation
// Phase 2 Feature: Export & Share

import { Crystal, Note } from '../../types';

// Feature flag check
const isExportEnabled = (): boolean => {
  const features = localStorage.getItem('va_feature_flags');
  if (features) {
    try {
      const parsed = JSON.parse(features);
      return parsed.exportShare !== false;
    } catch {
      return true;
    }
  }
  return true;
};

// Export formats supported
export type ExportFormat = 'markdown' | 'csv' | 'json' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
  dateFormat?: 'iso' | 'locale' | 'relative';
}

// Download helper
const downloadFile = (filename: string, content: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Format date according to preference
const formatDate = (timestamp: number, format: ExportOptions['dateFormat'] = 'iso'): string => {
  const date = new Date(timestamp);
  switch (format) {
    case 'locale':
      return date.toLocaleDateString();
    case 'relative':
      const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
      if (days === 0) return 'Today';
      if (days === 1) return 'Yesterday';
      return `${days} days ago`;
    case 'iso':
    default:
      return date.toISOString();
  }
};

// Export single crystal to Markdown
const exportToMarkdown = (crystal: Crystal, options: ExportOptions): string => {
  const lines: string[] = [];

  lines.push(`# ${crystal.title}`);
  lines.push('');

  if (options.includeMetadata !== false) {
    lines.push(`**Type:** ${crystal.type}`);
    lines.push(`**Date:** ${formatDate(crystal.createdAt, options.dateFormat)}`);
    if (crystal.mood) lines.push(`**Mood:** ${crystal.mood}`);
    if (crystal.tags?.length) lines.push(`**Tags:** ${crystal.tags.join(', ')}`);
    lines.push('');
  }

  if (crystal.content) {
    lines.push(crystal.content);
    lines.push('');
  }

  if (crystal.body) {
    lines.push(crystal.body);
    lines.push('');
  }

  if (crystal.attachments?.length) {
    lines.push('## Attachments');
    lines.push('');
    crystal.attachments.forEach(att => {
      if (att.type === 'link') {
        lines.push(`- [${att.label || 'Link'}](${att.content})`);
      } else {
        lines.push(`- ${att.label || 'Attachment'} (${att.type})`);
      }
    });
    lines.push('');
  }

  if (crystal.linkedNoteIds?.length) {
    lines.push('## Connected Notes');
    lines.push('');
    lines.push(`This note is connected to ${crystal.linkedNoteIds.length} other crystal(s).`);
    lines.push('');
  }

  lines.push('---');
  lines.push(`Exported from VoiceAction on ${new Date().toLocaleDateString()}`);

  return lines.join('\n');
};

// Export multiple crystals to Markdown
const exportManyToMarkdown = (crystals: Crystal[], options: ExportOptions): string => {
  const lines: string[] = [];

  lines.push('# VoiceAction Export');
  lines.push('');
  lines.push(`**Total Notes:** ${crystals.length}`);
  lines.push(`**Exported:** ${new Date().toLocaleDateString()}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  crystals.forEach((crystal, index) => {
    lines.push(exportToMarkdown(crystal, { ...options, includeMetadata: false }));
    if (index < crystals.length - 1) {
      lines.push('');
      lines.push('---');
      lines.push('');
    }
  });

  return lines.join('\n');
};

// Export to CSV
const exportToCSV = (crystals: Crystal[], options: ExportOptions): string => {
  const headers = ['Title', 'Type', 'Content', 'Body', 'Date', 'Mood', 'Tags', 'Pinned'];

  const rows = crystals.map(c => {
    return [
      `"${c.title.replace(/"/g, '""')}"`,
      c.type,
      `"${(c.content || '').replace(/"/g, '""')}"`,
      `"${(c.body || '').slice(0, 500).replace(/"/g, '""')}"`,
      formatDate(c.createdAt, options.dateFormat),
      c.mood || '',
      `"${(c.tags || []).join(', ')}"`,
      c.pinned ? 'Yes' : 'No',
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

// Export to JSON
const exportToJSON = (crystals: Crystal[], options: ExportOptions): string => {
  const data = {
    exportedAt: new Date().toISOString(),
    count: crystals.length,
    crystals: crystals.map(c => ({
      ...c,
      formattedDate: formatDate(c.createdAt, options.dateFormat),
    })),
  };
  return JSON.stringify(data, null, 2);
};

// Export to plain text
const exportToTXT = (crystals: Crystal[], options: ExportOptions): string => {
  const lines: string[] = [];

  lines.push('VOICEACTION EXPORT');
  lines.push(`Generated: ${new Date().toLocaleDateString()}`);
  lines.push(`Total Notes: ${crystals.length}`);
  lines.push('');
  lines.push('='.repeat(50));
  lines.push('');

  crystals.forEach((crystal, index) => {
    lines.push(`${index + 1}. ${crystal.title}`);
    lines.push(`   Type: ${crystal.type}`);
    lines.push(`   Date: ${formatDate(crystal.createdAt, options.dateFormat)}`);
    if (crystal.mood) lines.push(`   Mood: ${crystal.mood}`);
    if (crystal.tags?.length) lines.push(`   Tags: ${crystal.tags.join(', ')}`);
    lines.push('');
    if (crystal.content) lines.push(`   ${crystal.content}`);
    if (crystal.body) lines.push(`   ${crystal.body.slice(0, 300)}${crystal.body.length > 300 ? '...' : ''}`);
    lines.push('');
    lines.push('-'.repeat(50));
    lines.push('');
  });

  return lines.join('\n');
};

// Main export function
export const exportCrystals = (
  crystals: Crystal | Crystal[],
  options: ExportOptions
): { success: boolean; filename: string; error?: string } => {
  if (!isExportEnabled()) {
    return { success: false, filename: '', error: 'Export feature is disabled' };
  }

  try {
    const crystalArray = Array.isArray(crystals) ? crystals : [crystals];
    const timestamp = new Date().toISOString().split('T')[0];
    let content = '';
    let filename = '';
    let mimeType = '';

    switch (options.format) {
      case 'markdown':
        content = crystalArray.length === 1
          ? exportToMarkdown(crystalArray[0], options)
          : exportManyToMarkdown(crystalArray, options);
        filename = `voiceaction-export-${timestamp}.md`;
        mimeType = 'text/markdown';
        break;

      case 'csv':
        content = exportToCSV(crystalArray, options);
        filename = `voiceaction-export-${timestamp}.csv`;
        mimeType = 'text/csv';
        break;

      case 'json':
        content = exportToJSON(crystalArray, options);
        filename = `voiceaction-export-${timestamp}.json`;
        mimeType = 'application/json';
        break;

      case 'txt':
        content = exportToTXT(crystalArray, options);
        filename = `voiceaction-export-${timestamp}.txt`;
        mimeType = 'text/plain';
        break;

      default:
        return { success: false, filename: '', error: 'Unknown export format' };
    }

    downloadFile(filename, content, mimeType);
    return { success: true, filename };
  } catch (error) {
    console.error('Export failed:', error);
    return { success: false, filename: '', error: 'Export failed' };
  }
};

// Generate shareable image (simplified version without html2canvas dependency)
export const generateShareImage = async (crystal: Crystal): Promise<string | null> => {
  if (!isExportEnabled()) return null;

  try {
    // Create a canvas element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set dimensions (Instagram story size)
    canvas.width = 1080;
    canvas.height = 1920;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#150d01');
    gradient.addColorStop(1, '#291e07');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add decorative elements
    ctx.beginPath();
    ctx.arc(canvas.width / 2, 400, 200, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(249, 115, 22, 0.1)';
    ctx.fill();

    // Title
    ctx.fillStyle = '#fdf4e3';
    ctx.font = 'bold 60px "Space Grotesk", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(crystal.title.slice(0, 40), canvas.width / 2, 800);

    // Content preview
    ctx.font = '500 36px "Manrope", sans-serif';
    ctx.fillStyle = '#a89276';
    const content = crystal.content || crystal.body?.slice(0, 200) || '';
    const words = content.split(' ');
    let line = '';
    let y = 1000;

    for (let i = 0; i < words.length && y < 1400; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 800 && i > 0) {
        ctx.fillText(line, canvas.width / 2, y);
        line = words[i] + ' ';
        y += 60;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, canvas.width / 2, y);

    // Tags
    if (crystal.tags?.length) {
      ctx.font = '600 28px "Manrope", sans-serif';
      ctx.fillStyle = '#f97316';
      ctx.fillText(crystal.tags.slice(0, 3).join(' • '), canvas.width / 2, 1600);
    }

    // Footer
    ctx.font = '500 24px "Manrope", sans-serif';
    ctx.fillStyle = '#525252';
    ctx.fillText('VoiceAction • Crystalized Thought', canvas.width / 2, 1800);

    // Return data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Image generation failed:', error);
    return null;
  }
};

// Copy to clipboard
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

// Share API wrapper (for mobile devices)
export const shareContent = async (data: { title: string; text: string; url?: string }): Promise<boolean> => {
  if (!navigator.share) return false;

  try {
    await navigator.share(data);
    return true;
  } catch {
    return false;
  }
};

// Generate PDF using browser print dialog
export const exportToPDF = (crystal: Crystal) => {
  if (!isExportEnabled()) return { success: false, error: 'Export disabled' };
  
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return { success: false, error: 'Could not create iframe' };

  const tagsHtml = crystal.tags?.length 
    ? crystal.tags.map(t => `<span style="display:inline-block;background:#f3f4f6;color:#374151;padding:4px 8px;border-radius:4px;margin-right:8px;font-size:12px;text-transform:uppercase;letter-spacing:1px;font-weight:bold;">${t}</span>`).join('')
    : '';

  const html = `
    <html>
      <head>
        <title>${crystal.title}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #111; padding: 40px; line-height: 1.6; max-width: 800px; margin: 0 auto; }
          h1 { font-size: 32px; font-weight: 800; margin-bottom: 8px; letter-spacing: -0.5px; }
          .meta { color: #6b7280; font-size: 14px; margin-bottom: 24px; font-weight: 500; }
          .tags { margin-bottom: 32px; }
          .content { font-size: 18px; color: #374151; margin-bottom: 32px; white-space: pre-wrap; }
          .body-text { font-size: 16px; color: #4b5563; white-space: pre-wrap; }
          .footer { margin-top: 64px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        </style>
      </head>
      <body>
        <h1>${crystal.title || 'Untitled Note'}</h1>
        <div class="meta">${new Date(crystal.createdAt).toLocaleDateString()} • ${crystal.type}</div>
        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ''}
        ${crystal.content ? `<div class="content">${crystal.content}</div>` : ''}
        ${crystal.body ? `<div class="body-text">${crystal.body}</div>` : ''}
        ${(!crystal.content && !crystal.body) ? '<div class="body-text">Empty note</div>' : ''}
        <div class="footer">Exported from VoiceAction</div>
      </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 1000);
  }, 250);

  return { success: true };
};

// Hook for export functionality
export const useExport = () => {
  return {
    exportCrystals,
    exportToPDF,
    generateShareImage,
    copyToClipboard,
    shareContent,
    isEnabled: isExportEnabled(),
  };
};
