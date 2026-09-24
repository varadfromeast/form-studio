export const studioBlockKinds = [
  'title', 'heading', 'paragraph', 'bullet', 'numbered', 'task', 'toggle', 'quote', 'callout', 'code',
] as const;

export type StudioBlockKind = (typeof studioBlockKinds)[number];

export type FormattedDocument = {
  blocks: Array<{ id: string; text: string; kind: StudioBlockKind; confidence: number }>;
  model: string;
  durationMs: number;
};
