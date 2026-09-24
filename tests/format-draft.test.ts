import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DraftFormatter } from '../server/format-draft';

type JevRequest = {
  state: {
    text?: string;
    lines?: Array<{ id: string }>;
    candidates?: Array<{ id: string; mark: string }>;
    blocks?: Array<{ id: string; text: string }>;
  };
  questions: Record<string, unknown>;
};

function fakeJev(choose: (request: JevRequest, id: string) => string) {
  const requests: JevRequest[] = [];
  const fetchMock = (async (_url: URL | RequestInfo, init?: RequestInit) => {
    const request = JSON.parse(String(init?.body)) as JevRequest;
    requests.push(request);
    const answers = Object.fromEntries(Object.keys(request.questions).map(id => [id, {
      type: 'choice', choice: choose(request, id), confidence: 0.9,
    }]));
    return Response.json({ model: 'jev-1.13.0', answers, usage: { input_tokens: 100, output_tokens: 20 } });
  }) as typeof fetch;
  return { formatter: new DraftFormatter({ key: 'test-key', fetch: fetchMock }), requests };
}

test('Jev can leave punctuation and blank lines inside one editable block', async () => {
  const text = 'Introduction:Body\n\nMore text';
  const { formatter, requests } = fakeJev(request =>
    request.state.lines ? 'multiple' : request.state.candidates ? 'same' : 'paragraph');
  const result = await formatter.format(text, new AbortController().signal);

  assert.deepEqual(result.blocks.map(block => [block.kind, block.text]), [['paragraph', text]]);
  assert.ok(requests.filter(request => request.state.lines || request.state.candidates).every(request => request.state.text === text));
  assert.ok(requests.some(request => request.state.candidates?.some(candidate => candidate.mark === ':')));
  assert.ok(requests.some(request => request.state.candidates?.some(candidate => candidate.mark === '\n\n')));
});

test('Jev alone selects internal heading cut and final block roles', async () => {
  const text = 'Introduction:Keywords from unstructured text can be powerful predictors.';
  const { formatter } = fakeJev((request, id) => {
    if (request.state.lines) return 'multiple';
    if (request.state.candidates) return request.state.candidates.find(candidate => candidate.id === id)?.mark === ':' ? 'split' : 'same';
    return id === 'block-0' ? 'heading' : 'paragraph';
  });
  const result = await formatter.format(text, new AbortController().signal);
  assert.deepEqual(result.blocks.map(block => [block.kind, block.text]), [
    ['heading', 'Introduction:'],
    ['paragraph', 'Keywords from unstructured text can be powerful predictors.'],
  ]);
});

test('whole-text judgments preserve every dialogue turn as a separate quote', async () => {
  const text = [
    'Cafe Catch-Up',
    '**Aarav:** Hi, Riya! Is that you? It has been a long time.',
    '**Riya:** Oh, Aarav! I am so happy to see you. How are you doing?',
    '**Aarav:** I am doing great. I am studying computer science in college now. What about you?',
    '**Riya:** I am studying art and design. I love it!',
    '**Aarav:** That sounds wonderful. We should grab coffee and talk more soon.',
    '**Riya:** Yes, I would love that. Let us plan for next week. Bye for now!',
    '**Aarav:** Bye, see you soon.',
  ].join('\n');
  const { formatter, requests } = fakeJev((request, id) => {
    if (request.state.lines) return 'one';
    if (request.state.candidates) return 'split';
    return id === 'block-0' ? 'title' : 'quote';
  });
  const result = await formatter.format(text, new AbortController().signal);

  assert.deepEqual(result.blocks.map(block => block.kind), ['title', ...Array(7).fill('quote')]);
  assert.deepEqual(result.blocks.map(block => block.text), text.split('\n'));
  assert.ok(requests.filter(request => request.state.candidates).every(request =>
    Object.keys(request.questions).every(id => request.state.candidates?.find(candidate => candidate.id === id)?.mark === '\n')));
  assert.deepEqual(requests.at(-1)?.state.blocks?.map(block => block.text), text.split('\n'));
});

test('table-like text has no automatic table parser', async () => {
  const text = 'Name | Role\nAlice | Research';
  const { formatter } = fakeJev(request =>
    request.state.lines ? 'one' : request.state.candidates ? 'same' : 'paragraph');
  const result = await formatter.format(text, new AbortController().signal);
  assert.deepEqual(result.blocks.map(block => [block.kind, block.text]), [['paragraph', text]]);
});

test('missing or invalid Jev choices fail instead of inventing structure', async () => {
  const { formatter } = fakeJev(request =>
    request.state.lines ? 'invalid' : request.state.candidates ? 'same' : 'paragraph');
  await assert.rejects(formatter.format('A draft', new AbortController().signal), /incomplete line shape result/);
});
