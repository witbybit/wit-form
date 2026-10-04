// Path segments that would let a field name/path write to (or read from) object prototypes
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export function getPathInObj(
  obj: any,
  path: string,
  defaultValue = undefined,
  ancestors: { name: string; index: number }[] = []
) {
  if (ancestors?.length) {
    let prefix = '';
    for (const ancestor of ancestors) {
      prefix = prefix + `${ancestor.name}[${ancestor.index}].`;
    }
    path = prefix + path;
  }
  const travel = (regexp: RegExp) =>
    String.prototype.split
      .call(path ?? '', regexp)
      .filter(Boolean)
      .reduce<any>(
        (res, key) =>
          res !== null && res !== undefined && !UNSAFE_KEYS.has(key)
            ? res[key]
            : undefined,
        obj
      );
  const result = travel(/[,[\]]+?/) || travel(/[,[\].]+?/);
  return result === undefined || result === obj ? defaultValue : result;
}

// Note that a[2].b behaves as if a is an array while a.2.b behaves like a is an object.
export function setPathInObj(
  obj: any,
  path: string,
  fieldValue: any,
  ancestors?: { name: string; index: number }[]
) {
  if (path && obj) {
    const value = cloneDeep(fieldValue);
    if (ancestors?.length) {
      let prefix = '';
      for (const ancestor of ancestors) {
        prefix = prefix + `${ancestor.name}[${ancestor.index}].`;
      }
      path = prefix + path;
    }
    const pathArray = path.matchAll(/([^[.\]])+/g);
    let pathMatch = pathArray.next();
    let key: string = '';
    let objInFocus = obj;
    while (!pathMatch.done) {
      const match = pathMatch.value;
      const nextPathMatch = pathArray.next();
      const isLastKey = nextPathMatch.done;
      const nextMatch = nextPathMatch.value;
      key = match[0];
      if (UNSAFE_KEYS.has(key)) {
        return obj;
      }
      const isKeyArrIdx =
        !isLastKey &&
        nextMatch?.index !== undefined &&
        path.charAt(nextMatch.index - 1) === '[';
      if (isLastKey) {
        objInFocus[key] = value;
      } else {
        if (objInFocus[key] === undefined || objInFocus[key] === null) {
          objInFocus[key] = isKeyArrIdx ? [] : {};
        }
        objInFocus = objInFocus[key];
      }
      pathMatch = nextPathMatch;
    }
  }
  return obj;
}

// Taken from https://dev.to/sanderdebr/deep-equality-checking-of-objects-in-vanilla-javascript-5592
export function isDeepEqual(
  obj1: any,
  obj2: any,
  eq?: (a: any, b: any) => boolean
) {
  if ((eq && eq(obj1, obj2)) || obj1 === obj2) return true;

  if (
    typeof obj1 !== 'object' ||
    typeof obj2 !== 'object' ||
    obj1 == null ||
    obj2 == null
  ) {
    return false;
  }

  if (obj1 instanceof Date && obj2 instanceof Date) {
    return obj1.getTime() === obj2.getTime();
  }

  // Objects other than arrays and plain objects (File, Blob, Map, class instances, etc.) are compared by reference
  if (
    (!Array.isArray(obj1) && !isPlainObject(obj1)) ||
    (!Array.isArray(obj2) && !isPlainObject(obj2))
  ) {
    return false;
  }

  const keysA = Object.keys(obj1).filter((k) => !isUndefined(obj1[k]));
  const keysB = Object.keys(obj2).filter((k) => !isUndefined(obj2[k]));

  if (keysA.length !== keysB.length) {
    return false;
  }

  let result = true;

  keysA.forEach((key) => {
    if (!keysB.includes(key)) {
      result = false;
    }

    if (typeof obj1[key] === 'function' || typeof obj2[key] === 'function') {
      if (obj1[key].toString() !== obj2[key].toString()) {
        result = false;
      }
    }

    if (!isDeepEqual(obj1[key], obj2[key])) {
      result = false;
    }
  });

  return result;
}

function isPlainObject(val: any) {
  if (val === null || typeof val !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
}

/**
 * Deep clones arrays and plain objects.
 * Other objects (Date, File, Blob, Map, class instances, etc.) are kept as is
 * since copying their own enumerable keys would turn them into empty objects.
 */
export function cloneDeep(src: any): any {
  if (Array.isArray(src)) {
    return src.map(cloneDeep);
  }
  if (!isPlainObject(src)) {
    return src;
  }
  const result: any = {};
  for (const key of Object.keys(src)) {
    if (!UNSAFE_KEYS.has(key)) {
      result[key] = cloneDeep(src[key]);
    }
  }
  return result;
}

export function isUndefined(val: any) {
  return val === undefined || Number.isNaN(val);
}
