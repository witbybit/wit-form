import { type Atom, atom, type WritableAtom } from 'jotai';
import { cloneDeep } from './utils';

export function gan(atomName: string) {
  return `WitForm_${atomName}`;
}

/**
 * Passing RESET to a form atom setter resets the atom back to its default value
 */
export const RESET: unique symbol = Symbol(gan('Reset'));

export type SetStateAction<V> = V | ((prev: V) => V);

export type FormAtom<V> = WritableAtom<
  V,
  [SetStateAction<V> | typeof RESET],
  void
>;

export type FormGetter = <V>(atom: Atom<V>) => V;

export type FormSetter = <V>(
  atom: WritableAtom<V, [SetStateAction<V>], void>,
  valOrUpdater: SetStateAction<V>
) => void;

export type FormResetter = (atom: FormAtom<any>) => void;

export interface ITransactionInterface {
  get: FormGetter;
  set: FormSetter;
  reset: FormResetter;
}

/**
 * Write-only atom used to run several reads/writes against the store as a single unit.
 * Jotai notifies subscribers only after the outer write completes, so components never see intermediate state.
 */
export const transactionAtom = atom(
  null,
  (get, set, fn: (ops: ITransactionInterface) => any) =>
    fn({
      get: get as FormGetter,
      set: set as FormSetter,
      reset: (a) => set(a, RESET),
    })
);

/**
 * Creates a primitive atom which can be reset back to its default value by passing RESET.
 * onSet is invoked synchronously whenever the value changes (similar to recoil atom effects).
 */
export function atomWithDefault<V>(
  defaultValue: V,
  onSet?: (newValue: V, set: FormSetter) => void
): FormAtom<V> {
  const baseAtom = atom(defaultValue);
  return atom(
    (get) => get(baseAtom),
    (get, set, update: SetStateAction<V> | typeof RESET) => {
      const prevValue = get(baseAtom);
      const newValue =
        update === RESET
          ? defaultValue
          : typeof update === 'function'
            ? (update as (prev: V) => V)(prevValue)
            : update;
      if (Object.is(prevValue, newValue)) {
        return;
      }
      set(baseAtom, newValue);
      onSet?.(newValue, set as FormSetter);
    }
  );
}

/**
 * Serializes params with sorted object keys so that params with the same value always map to the same atom
 * (same behavior as recoil's atomFamily/selectorFamily).
 */
export function stableStringify(value: any): string {
  if (value === undefined) {
    return '';
  }
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value
      .map((v) => (v === undefined ? 'null' : stableStringify(v)))
      .join(',')}]`;
  }
  return `{${Object.keys(value)
    .filter((k) => value[k] !== undefined)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`)
    .join(',')}}`;
}

export interface IAtomFamily<P, A> {
  (param: P): A;
  /**
   * Remove cached atoms for which the predicate returns true (used for freeing memory once a form unmounts)
   */
  removeWhere: (predicate: (param: P) => boolean) => void;
}

export function atomFamily<P, A extends Atom<any>>(
  name: string,
  createAtom: (param: P, key: string) => A
): IAtomFamily<P, A> {
  const atoms = new Map<string, { atom: A; param: P }>();
  const family = (param: P) => {
    const key = `${gan(name)}__${stableStringify(param)}`;
    let cached = atoms.get(key);
    if (!cached) {
      // Callers can mutate the param later (e.g. ancestors array), so keep a copy
      const paramCopy = cloneDeep(param);
      const newAtom = createAtom(paramCopy, key);
      newAtom.debugLabel = key;
      cached = { atom: newAtom, param: paramCopy };
      atoms.set(key, cached);
    }
    return cached.atom;
  };
  family.removeWhere = (predicate: (param: P) => boolean) => {
    for (const [key, { param }] of Array.from(atoms.entries())) {
      if (predicate(param)) {
        atoms.delete(key);
      }
    }
  };
  return family;
}

export function getNewRowId(rowIds: number[]) {
  let val = Math.floor(Math.random() * 10000);
  while (rowIds.indexOf(val) !== -1) {
    val++;
  }
  return val;
}

export function generateFormId() {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}
