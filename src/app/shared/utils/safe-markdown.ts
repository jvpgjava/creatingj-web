export type InlineSegment =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'code'; readonly text: string }
  | { readonly kind: 'bold'; readonly text: string };

export type MarkdownBlock =
  | { readonly kind: 'code'; readonly language: string; readonly code: string }
  | { readonly kind: 'heading'; readonly level: 1 | 2 | 3; readonly text: string }
  | { readonly kind: 'list'; readonly items: readonly InlineSegment[][] }
  | { readonly kind: 'paragraph'; readonly segments: readonly InlineSegment[] };

export function parseInlineSegments(input: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = regex.exec(input);

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ kind: 'text', text: input.slice(lastIndex, match.index) });
    }
    const token = match[0];
    if (token.startsWith('`') && token.endsWith('`')) {
      segments.push({ kind: 'code', text: token.slice(1, -1) });
    } else if (token.startsWith('**') && token.endsWith('**')) {
      segments.push({ kind: 'bold', text: token.slice(2, -2) });
    }
    lastIndex = match.index + token.length;
    match = regex.exec(input);
  }

  if (lastIndex < input.length) {
    segments.push({ kind: 'text', text: input.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ kind: 'text', text: input }];
}

export function parseSafeMarkdown(raw: string): MarkdownBlock[] {
  const normalized = raw.replace(/\r\n/g, '\n');
  const lines = normalized.split('\n');
  const blocks: MarkdownBlock[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trimStart().startsWith('```')) {
      const language = line.trimStart().slice(3).trim() || 'text';
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        i++;
      }
      blocks.push({ kind: 'code', language, code: codeLines.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(line.trim());
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3;
      blocks.push({ kind: 'heading', level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: InlineSegment[][] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const text = lines[i].replace(/^\s*[-*]\s+/, '');
        items.push(parseInlineSegments(text));
        i++;
      }
      blocks.push({ kind: 'list', items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trimStart().startsWith('```') &&
      !/^(#{1,3})\s+/.test(lines[i].trim()) &&
      !/^\s*[-*]\s+/.test(lines[i])
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    blocks.push({
      kind: 'paragraph',
      segments: parseInlineSegments(paragraphLines.join('\n')),
    });
  }

  return blocks;
}
