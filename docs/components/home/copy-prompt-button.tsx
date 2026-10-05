'use client';

import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { gitConfig } from '@/lib/shared';

function buildPrompt() {
  // This button lives on the home page, which sits at the site root (including any basePath)
  const root = window.location.href.replace(/[?#].*$/, '').replace(/\/?$/, '/');
  const docsUrl = new URL('llms-full.txt', root).href;

  return `I want to build forms in my React app with wit-form (https://github.com/${gitConfig.user}/${gitConfig.repo}), a headless form library where every field is its own Jotai atom.

Read the full documentation first: ${docsUrl}

Then help me:
1. Install it with \`pnpm add wit-form jotai\` (or my package manager).
2. Wrap the form in a <FormProvider> and set it up with useForm.
3. Write reusable field components with useField, styled for my app, with validation and accessible error messages.

Use only the APIs described in those docs.`;
}

/** Copies a prompt that points an AI assistant at the docs, for "build this with AI" workflows */
export function CopyPromptButton(props: { className?: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildPrompt());
      setCopied(true);
    } catch {
      // Clipboard can be blocked, e.g. on insecure origins
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="Copy a prompt for ChatGPT, Claude, Cursor or any AI assistant"
      className={cn(
        'group inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-fd-background/60 px-5 text-sm font-medium text-fd-foreground backdrop-blur transition outline-none hover:border-indigo-500/40 hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-fd-background active:scale-[0.98]',
        props.className
      )}
    >
      {copied ? (
        <Check className="size-4 text-emerald-500" />
      ) : (
        <Sparkles className="size-4 text-indigo-600 transition group-hover:rotate-12 dark:text-indigo-300" />
      )}
      {copied ? 'Prompt copied' : 'Copy AI prompt'}
      <span aria-live="polite" className="sr-only">
        {copied ? 'Prompt copied to clipboard' : ''}
      </span>
    </button>
  );
}
