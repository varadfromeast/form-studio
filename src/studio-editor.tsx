import { BlockNoteSchema, type PartialBlock } from '@blocknote/core';
import { createReactBlockSpec, useCreateBlockNote } from '@blocknote/react';
import type { FormattedDocument } from '../shared/studio-document';

const createNote = createReactBlockSpec(
  { type: 'studioNote', content: 'inline', propSchema: {} },
  {
    render: ({ contentRef }) => <div className="studio-note"><span className="studio-note-dot" aria-hidden="true"/><div ref={contentRef}/></div>,
    toExternalHTML: ({ contentRef }) => <blockquote ref={contentRef}/>,
  },
);

const schema = BlockNoteSchema.create().extend({ blockSpecs: { studioNote: createNote() } });
type StudioBlock = PartialBlock<typeof schema.blockSchema, typeof schema.inlineContentSchema, typeof schema.styleSchema>;

function toBlock(line: FormattedDocument['blocks'][number]): StudioBlock {
  const content = line.text;
  switch (line.kind) {
    case 'title': return { type: 'heading', props: { level: 1 }, content };
    case 'heading': return { type: 'heading', props: { level: 2 }, content };
    case 'bullet': return { type: 'bulletListItem', content };
    case 'numbered': return { type: 'numberedListItem', content };
    case 'task': return { type: 'checkListItem', content };
    case 'toggle': return { type: 'toggleListItem', content };
    case 'quote': return { type: 'quote', content };
    case 'callout': return { type: 'studioNote', content };
    case 'code': return { type: 'codeBlock', content };
    default: return { type: 'paragraph', content };
  }
}

export function useStudioEditor() {
  const editor = useCreateBlockNote({ schema, tables: { headers: true } });

  return {
    editor,
    show(blocks: FormattedDocument['blocks']) {
      editor.replaceBlocks(editor.document, blocks.map(toBlock));
    },
    clear() {
      editor.replaceBlocks(editor.document, [{ type: 'paragraph' }]);
    },
    markdown() {
      return editor.blocksToMarkdownLossy(editor.document);
    },
  };
}
