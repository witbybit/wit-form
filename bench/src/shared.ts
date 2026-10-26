export const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
export type Quarter = (typeof quarters)[number];
export type Line = { name: string } & Record<Quarter, string>;

/** Deterministic rows, so every library starts from the same values */
export function makeRows(count: number): Line[] {
  return Array.from({ length: count }, (_, i) => ({
    name: `Cost center ${i + 1}`,
    q1: String(1000 + ((i * 37) % 900)),
    q2: String(1200 + ((i * 53) % 700)),
    q3: String(900 + ((i * 71) % 1100)),
    q4: String(1500 + ((i * 29) % 500)),
  }));
}

export function sum(values: (string | undefined)[]) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

/** Every benchmarked component calls this while rendering, so we can count renders per keystroke */
export const counter = { renders: 0 };
export function tick() {
  counter.renders += 1;
}
