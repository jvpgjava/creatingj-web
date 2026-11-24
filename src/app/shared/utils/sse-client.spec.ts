import { describe, expect, it } from 'vitest';
import { consumeSseResponse, parseSseBlock } from './sse-client';

describe('sse-client', () => {
  it('parses SSE frame with event, id and multi-line data', () => {
    const frame = parseSseBlock('id: 42\nevent: generation.delta\ndata: {"delta":"ola"}\n');
    expect(frame).toEqual({
      id: '42',
      event: 'generation.delta',
      data: '{"delta":"ola"}',
    });
  });

  it('decodes multi-byte UTF-8 characters split across chunks without corruption', async () => {
    const payload = new TextEncoder().encode(
      'event: generation.delta\ndata: {"status":"DELTA","delta":"ação 🚀"}\n\n',
    );
    const splitPoint = payload.length - 8;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(payload.slice(0, splitPoint));
        controller.enqueue(payload.slice(splitPoint));
        controller.close();
      },
    });

    const frames: string[] = [];
    await consumeSseResponse(new Response(stream), (f) => frames.push(f.data));
    expect(frames).toEqual(['{"status":"DELTA","delta":"ação 🚀"}']);
  });
});
