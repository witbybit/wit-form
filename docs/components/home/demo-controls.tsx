'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';

/** Play (Pause while it runs) and Reset, the same in every hero demo's window bar */
export function DemoControls(props: {
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}) {
  return (
    <div className="ml-auto flex shrink-0 gap-1">
      <button
        type="button"
        onClick={props.playing ? props.onPause : props.onPlay}
        className="inline-flex h-7 items-center gap-1.5 rounded-md border bg-fd-background px-2.5 text-xs font-medium transition outline-none hover:bg-fd-accent focus-visible:ring-2 focus-visible:ring-emerald-500 active:scale-[0.98]"
      >
        {props.playing ? (
          <Pause className="size-3.5" />
        ) : (
          <Play className="size-3.5" />
        )}
        {props.playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        onClick={props.onReset}
        className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-fd-muted-foreground transition outline-none hover:bg-fd-accent hover:text-fd-foreground focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <RotateCcw className="size-3.5" /> Reset
      </button>
    </div>
  );
}
