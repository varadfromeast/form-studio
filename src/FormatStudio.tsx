import { useEffect, useRef, useState } from 'react';
import { BlockNoteView } from '@blocknote/mantine';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Copy, RotateCcw, Sparkles } from 'lucide-react';
import type { FormattedDocument } from '../shared/studio-document';
import { useStudioEditor } from './studio-editor';
import '@blocknote/mantine/style.css';
import './format-studio.css';

export default function FormatStudio() {
  const [text, setText] = useState('');
  const [result, setResult] = useState<FormattedDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSource, setShowSource] = useState(false);
  const [copied, setCopied] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();
  const studioEditor = useStudioEditor();

  useEffect(() => {
    document.title = 'Form — Find the shape in your words';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Paste rough text and shape it into an editable document with Jev and BlockNote.');
    return () => controller.current?.abort();
  }, []);

  async function format() {
    if (!text.trim() || loading) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/format-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal: abort.signal,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message ?? 'Formatting failed. Try again.');
      const formatted = data as FormattedDocument;
      studioEditor.show(formatted.blocks);
      setResult(formatted);
      setShowSource(false);
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Formatting failed. Try again.');
    } finally {
      if (!abort.signal.aborted) setLoading(false);
    }
  }

  function reset() {
    controller.current?.abort();
    controller.current = null;
    studioEditor.clear();
    setLoading(false);
    setResult(null);
    setText('');
    setError('');
    setShowSource(false);
    setCopied(false);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(studioEditor.markdown());
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Could not copy. Select the formatted text and copy it instead.');
    }
  }

  return <div className="studio-shell">
    <header className="studio-header">
      <a className="studio-wordmark" href="/" aria-label="Form home">form<span>.</span></a>
    </header>
    <main className="studio-main" id="main">
      <div className="studio-intro">
        <h1>{result ? 'Your document.' : 'Paste your text.'}</h1>
        <p>{result ? 'Edit the blocks below, then copy the result.' : 'Turn rough text into an editable document.'}</p>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {!result ? <motion.section key="input" className="studio-workspace" aria-label="Text to format" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={{ duration: .22 }}>
          <div className="studio-workspace-top"><span>Source text</span><span>Plain text</span></div>
          <label className="sr-only" htmlFor="studio-input">Text to format</label>
          <textarea id="studio-input" ref={textarea} value={text} onChange={event => setText(event.target.value)} onKeyDown={event => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); void format(); } }} placeholder="Paste a draft, notes, a list, or a conversation…" spellCheck rows={15}/>
          <div className="studio-workspace-bottom"><span>{text.trim() ? `${text.trim().split(/\s+/).length} words` : 'Your text stays in this browser until you format it.'}</span></div>
        </motion.section> : <motion.section key="result" className="studio-workspace studio-result" aria-label="Formatted document" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -8 }} transition={{ duration: .24 }}>
          <div className="studio-workspace-top"><span><span className="studio-live-dot"/>Formatted document</span><span>Editable</span></div>
          <div className="studio-editor"><BlockNoteView editor={studioEditor.editor} theme="light"/></div>
          <div className="studio-workspace-bottom"><span>Editable · {result.model} · {(result.durationMs / 1000).toFixed(1)}s</span><button type="button" onClick={() => setShowSource(value => !value)} aria-expanded={showSource}>{showSource ? 'Hide original' : 'View original'}</button></div>
          {showSource && <pre className="studio-source">{text}</pre>}
        </motion.section>}
      </AnimatePresence>

      {error && <p className="studio-error" role="alert">{error}</p>}
      <div className={`studio-actions${result ? ' studio-actions-result' : ''}`}>
        {result ? <><button className="studio-quiet-button" type="button" onClick={reset}><RotateCcw size={16}/> Reset</button><button className="studio-primary-button" type="button" onClick={() => void copy()}>{copied ? <Check size={16}/> : <Copy size={16}/>} {copied ? 'Copied Markdown' : 'Copy Markdown'}</button></> : <button className="studio-primary-button" type="button" onClick={() => void format()} disabled={!text.trim() || loading}>{loading ? <><Sparkles size={16} className="studio-pulse"/> Finding structure…</> : <>Format text <ArrowRight size={16}/></>}</button>}
      </div>
      {!result && <p className="studio-footnote">Formatting sends your text to Jev. It judges block breaks and types without rewriting your words.</p>}
    </main>
  </div>;
}
