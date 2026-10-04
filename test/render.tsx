import { act, type ReactElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';

export const flushEffects = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

let root: Root | null = null;
export let container: HTMLDivElement = document.createElement('div');

export async function render(element: ReactElement) {
  unmount();
  container = document.createElement('div');
  root = createRoot(container);
  await act(async () => {
    root!.render(element);
    await flushEffects();
  });
}

export async function run<T>(fn: () => T): Promise<T> {
  let result: T;
  await act(async () => {
    result = fn();
    await flushEffects();
    await flushEffects();
  });
  return result!;
}

export function unmount() {
  if (root) {
    const currentRoot = root;
    root = null;
    act(() => currentRoot.unmount());
  }
}
