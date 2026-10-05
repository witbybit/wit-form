/**
 * Shows an example's full source in a collapsible panel under the story.
 * Used as a story decorator: `decorators: [withSource(source)]`.
 */
import { useState } from 'react';
import type { Decorator } from '@storybook/react-vite';

function SourcePanel(props: { source: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(props.source);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be blocked; the code is still selectable
    }
  };
  return (
    <details className="group mt-8 max-w-6xl rounded-xl border border-slate-200 bg-white font-sans">
      <summary className="flex cursor-pointer select-none items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
        <span>
          <span className="inline-block w-4 transition-transform group-open:rotate-90">
            ›
          </span>
          Source code
        </span>
        <span className="text-xs font-normal text-slate-400">
          {props.source.split('\n').length} lines
        </span>
      </summary>
      <div className="relative border-t border-slate-200">
        <button
          type="button"
          onClick={copy}
          className="absolute right-3 top-3 rounded-md bg-slate-700 px-2 py-1 text-xs text-slate-100 hover:bg-slate-600"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <pre className="max-h-[640px] overflow-auto rounded-b-xl bg-slate-900 p-4 font-mono text-xs leading-relaxed text-slate-100">
          <code>{props.source}</code>
        </pre>
      </div>
    </details>
  );
}

export const withSource =
  (source: string): Decorator =>
  (Story) => (
    <>
      <Story />
      <SourcePanel source={source} />
    </>
  );
