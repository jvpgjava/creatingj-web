export interface SseFrame {
  readonly event: string;
  readonly data: string;
  readonly id?: string;
}

function readXsrfCookie(): string | null {
  if (typeof document === 'undefined' || !document.cookie) {
    return null;
  }
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith('XSRF-TOKEN=')) {
      return decodeURIComponent(trimmed.slice('XSRF-TOKEN='.length));
    }
  }
  return null;
}

export function parseSseBlock(block: string): SseFrame | null {
  let event = 'message';
  let id: string | undefined;
  const dataLines: string[] = [];

  for (const rawLine of block.split('\n')) {
    const line = rawLine.replace(/\r$/, '');
    if (!line || line.startsWith(':')) {
      continue;
    }
    if (line.startsWith('event:')) {
      event = line.slice(6).trim() || 'message';
    } else if (line.startsWith('data:')) {
      const value = line.slice(5);
      dataLines.push(value.startsWith(' ') ? value.slice(1) : value);
    } else if (line.startsWith('id:')) {
      id = line.slice(3).trim();
    }
  }

  if (dataLines.length === 0 && event === 'message' && !id) {
    return null;
  }

  return { event, data: dataLines.join('\n'), id };
}

export async function consumeSseResponse(
  response: Response,
  onFrame: (frame: SseFrame) => void,
): Promise<void> {
  if (!response.body) {
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    let sepIndex = findFrameBoundary(buffer);
    while (sepIndex !== null) {
      const rawBlock = buffer.slice(0, sepIndex.index);
      buffer = buffer.slice(sepIndex.index + sepIndex.length);
      const frame = parseSseBlock(rawBlock);
      if (frame) {
        onFrame(frame);
      }
      sepIndex = findFrameBoundary(buffer);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) {
    const frame = parseSseBlock(buffer);
    if (frame) {
      onFrame(frame);
    }
  }
}

function findFrameBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf('\n\n');
  const crlf = buffer.indexOf('\r\n\r\n');
  if (lf === -1 && crlf === -1) {
    return null;
  }
  if (lf !== -1 && (crlf === -1 || lf <= crlf)) {
    return { index: lf, length: 2 };
  }
  return { index: crlf, length: 4 };
}

export async function postSseStream(
  url: string,
  body: unknown,
  onFrame: (frame: SseFrame) => void,
  signal: AbortSignal,
): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };
  const xsrf = readXsrfCookie();
  if (xsrf) {
    headers['X-XSRF-TOKEN'] = xsrf;
  }

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    let detail = `Erro HTTP ${response.status}`;
    try {
      const problem = (await response.json()) as { detail?: string; title?: string };
      detail = problem.detail ?? problem.title ?? detail;
    } catch {
      // ignore non-json body
    }
    throw new Error(detail);
  }

  await consumeSseResponse(response, onFrame);
}
