import { describe, expect, it } from 'vitest';
import {
  cloneDeep,
  getPathInObj,
  isDeepEqual,
  setPathInObj,
} from '../src/utils';

describe('setPathInObj / getPathInObj', () => {
  it('sets and gets nested object and array paths', () => {
    const obj: any = {};
    setPathInObj(obj, 'a.b', 1);
    setPathInObj(obj, 'list[1].name', 'x');
    expect(obj).toEqual({ a: { b: 1 }, list: [undefined, { name: 'x' }] });
    expect(getPathInObj(obj, 'a.b')).toBe(1);
    expect(getPathInObj(obj, 'list[1].name')).toBe('x');
  });

  it('never writes to or reads from object prototypes', () => {
    const obj: any = {};
    setPathInObj(obj, '__proto__.polluted', true);
    setPathInObj(obj, 'constructor.prototype.polluted', true);
    setPathInObj(obj, 'a.__proto__.polluted', true);
    expect(({} as any).polluted).toBeUndefined();
    expect(Object.prototype.hasOwnProperty('polluted')).toBe(false);
    expect(getPathInObj({}, '__proto__')).toBeUndefined();
    expect(getPathInObj({}, 'constructor.prototype')).toBeUndefined();
  });
});

describe('cloneDeep', () => {
  it('clones plain objects/arrays and keeps other objects intact', () => {
    const date = new Date('2024-01-01');
    const file = new File(['content'], 'a.txt');
    const src = { a: [{ b: 1 }], date, file };
    const clone = cloneDeep(src);
    expect(clone).toEqual(src);
    expect(clone.a).not.toBe(src.a);
    expect(clone.a[0]).not.toBe(src.a[0]);
    expect(clone.date).toBe(date);
    expect(clone.file).toBe(file);
  });

  it('does not copy __proto__ keys', () => {
    const src = JSON.parse('{"__proto__": {"polluted": true}, "a": 1}');
    const clone = cloneDeep(src);
    expect(clone).toEqual({ a: 1 });
    expect(clone.polluted).toBeUndefined();
  });
});

describe('isDeepEqual', () => {
  it('compares dates by value and other objects by reference', () => {
    expect(isDeepEqual({ d: new Date(1) }, { d: new Date(1) })).toBe(true);
    expect(isDeepEqual({ d: new Date(1) }, { d: new Date(2) })).toBe(false);
    const file = new File(['a'], 'a.txt');
    expect(isDeepEqual({ f: file }, { f: file })).toBe(true);
    expect(isDeepEqual({ f: file }, { f: new File(['b'], 'b.txt') })).toBe(
      false
    );
    expect(isDeepEqual({ a: [1, { b: 2 }] }, { a: [1, { b: 2 }] })).toBe(true);
    expect(isDeepEqual({ a: 1, b: undefined }, { a: 1 })).toBe(true);
  });
});
