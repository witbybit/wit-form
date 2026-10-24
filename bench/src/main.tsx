import { Profiler, type ComponentType } from 'react';
import { createRoot } from 'react-dom/client';
import { counter, makeRows, type Line } from './shared';

const params = new URLSearchParams(location.search);
const lib = params.get('lib') ?? 'wit';
const rowCount = Number(params.get('rows') ?? 500);

const loaders: Record<
  string,
  () => Promise<{ App: ComponentType<{ rows: Line[] }> }>
> = {
  wit: () => import('./libs/wit'),
  rhf: () => import('./libs/rhf'),
  'rhf-controller': () => import('./libs/rhf-controller'),
  tanstack: () => import('./libs/tanstack'),
};

const state = { lastCommit: 0, lastFrame: 0, keyAt: 0, keyFrame: 0 };

/** Calls back once the browser has painted the next frame */
function afterNextPaint(callback: (time: number) => void) {
  requestAnimationFrame(() => {
    const channel = new MessageChannel();
    channel.port1.onmessage = () => callback(performance.now());
    channel.port2.postMessage(null);
  });
}

function onCommit() {
  state.lastCommit = performance.now();
  afterNextPaint((time) => {
    state.lastFrame = Math.max(state.lastFrame, time);
  });
}

addEventListener(
  'keydown',
  (e) => {
    state.keyAt = e.timeStamp;
    state.keyFrame = 0;
    afterNextPaint((time) => {
      state.keyFrame = time;
    });
  },
  true
);

/** Resolves once React has committed nothing for `quietMs` and the last commit is on screen */
function settled(since: number, quietMs: number) {
  return new Promise<void>((resolve) => {
    const check = () => {
      const last = Math.max(state.lastCommit, since);
      const painted = state.lastFrame >= state.lastCommit;
      if (performance.now() - last >= quietMs && painted) resolve();
      else setTimeout(check, 20);
    };
    setTimeout(check, 20);
  });
}

let App: ComponentType<{ rows: Line[] }>;

Object.assign(window, {
  bench: {
    async load() {
      App = (await loaders[lib]()).App;
    },
    /** Time from render() until the last commit caused by mounting is painted */
    async mount() {
      const rows = makeRows(rowCount);
      const root = createRoot(document.getElementById('root')!);
      const start = performance.now();
      root.render(
        <Profiler id="bench" onRender={onCommit}>
          <App rows={rows} />
        </Profiler>
      );
      await settled(start, 300);
      const inputs = document.querySelectorAll('[data-cell]').length;
      if (inputs !== rowCount * 4) throw new Error(`Rendered ${inputs} inputs`);
      return state.lastFrame - start;
    },
    resetRenders() {
      counter.renders = 0;
    },
    renders: () => counter.renders,
    /** Time from the last keydown until its final commit (or, with no commit, its frame) is painted */
    async keystroke() {
      await settled(state.keyAt, 150);
      const commitFrame = state.lastCommit > state.keyAt ? state.lastFrame : 0;
      return Math.max(state.keyFrame, commitFrame) - state.keyAt;
    },
  },
});
