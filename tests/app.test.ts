import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createApp } from '../server/app';
import { DraftFormatter } from '../server/format-draft';

test('studio API formats text and exposes no timeline route', async () => {
  const formatter = new DraftFormatter({
    key: 'test-key',
    fetch: (async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { questions: Record<string, unknown>; state: { lines?: unknown; candidates?: unknown } };
      const choice = body.state.lines ? 'one' : body.state.candidates ? 'same' : 'paragraph';
      const answers = Object.fromEntries(Object.keys(body.questions).map(id => [id, {
        type: 'choice', choice, confidence: 0.9,
      }]));
      return Response.json({ model: 'jev-1.13.0', answers, usage: { input_tokens: 1, output_tokens: 1 } });
    }) as typeof fetch,
  });
  const app = await createApp({ formatter });
  try {
    const health = await app.inject('/api/health');
    assert.equal(health.json().formatter, 'ready');

    const result = await app.inject({ method: 'POST', url: '/api/format-draft', payload: { text: 'A small note' } });
    assert.equal(result.statusCode, 200);
    assert.deepEqual(result.json().blocks.map((block: { kind: string; text: string }) => [block.kind, block.text]), [
      ['paragraph', 'A small note'],
    ]);

    assert.equal((await app.inject('/api/timelines/example')).statusCode, 404);
  } finally {
    await app.close();
  }
});
