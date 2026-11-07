import fs from "node:fs";
import { bindPlaywrightTransform } from "./bindPlaywrightTransform.mjs";
import fsp from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { syncBuiltinESMExports } from "node:module";

const AUTHORIZED_FAST_EQUALS_DATA = {"repository":"planttheidea/fast-equals","commit":"52d52c27643c8769bff9a87896a2cd32564ea000","package":"fast-equals","version":"5.4.5","integrity":"sha512-yKEpcFuRPu/pTQL2VB8YKE2yFldrLlIsoWtJeBnAdqEhvu21OgkFT0C8njf/xYc2LSZGEr3K9JGjthHJxnVLvQ==","packageFiles":[{"relative":"LICENSE","sha256":"c0af1c3e74a891b408dc4365897482cc8c284365808e3837c56ea3c337ed7a2c","bytes":1069},{"relative":"dist/cjs/index.cjs","sha256":"6787b8578a3ecf21e7437afd2035da518979930ca9fe456b41de9f5fd8ad6cef","bytes":31642},{"relative":"dist/cjs/index.d.cts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"dist/umd/index.js","sha256":"2b201db3f2bd9421c67c73073db61df5dad473702d375f1fa5ddf190ec817693","bytes":35147},{"relative":"package.json","sha256":"36b33ecb1abdf77512e7e787e37f83562a8ffef7b9cf5a4012535064652c685f","bytes":3616},{"relative":"dist/cjs/index.cjs.map","sha256":"37fce55ce0b02a5578ccf4235bf4acfb1490a41333cd0b40d21178fcd8337714","bytes":54310},{"relative":"dist/umd/index.js.map","sha256":"5493694b81767cccbc483a37fe81a66fe1971c61bce01e8845461a6e7e5b2b87","bytes":54363},{"relative":"dist/es/index.mjs.map","sha256":"ae206b18e8a69b9724c787d9499a5bee067ed53b27282aa7da1ed1c9fb6186f9","bytes":54299},{"relative":"README.md","sha256":"49c8c84551ac313cb5875dab7fac49f375e02400bd46f94350a76983b44dc024","bytes":23582},{"relative":"dist/es/index.mjs","sha256":"e9edabbf10ec4c82e5cd23af035b648c7646360e653f78797bb17a8ddb7067c2","bytes":31353},{"relative":"dist/es/index.d.mts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"dist/umd/index.d.ts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715},{"relative":"index.d.ts","sha256":"1dfd37784b5600f911a09cb8a4b978975a1d92b172d9e8b4b4e563c649811b6c","bytes":8715}],"sources":[{"officialPath":"src/utils.ts","gitBlobOid":"70ca0dc0727fa472bcb44724ccb59497805d313d","sha256":"b7e5dec3d221429d7fec30e27eb0a9cacb576d03a1c6e118e4c652cc7c9d63df","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/utils.ts","outputIndex":0,"content":"import type {\n  AnyEqualityComparator,\n  Cache,\n  CircularState,\n  Dictionary,\n  State,\n  TypeEqualityComparator,\n} from './internalTypes.js';\n\nconst { getOwnPropertyNames, getOwnPropertySymbols } = Object;\n// eslint-disable-next-line @typescript-eslint/unbound-method\nconst { hasOwnProperty } = Object.prototype;\n\n/**\n * Combine two comparators into a single comparators.\n */\nexport function combineComparators<Meta>(\n  comparatorA: AnyEqualityComparator<Meta>,\n  comparatorB: AnyEqualityComparator<Meta>,\n) {\n  return function isEqual<A, B>(a: A, b: B, state: State<Meta>) {\n    return comparatorA(a, b, state) && comparatorB(a, b, state);\n  };\n}\n\n/**\n * Wrap the provided `areItemsEqual` method to manage the circular state, allowing\n * for circular references to be safely included in the comparison without creating\n * stack overflows.\n */\nexport function createIsCircular<AreItemsEqual extends TypeEqualityComparator<any, any>>(\n  areItemsEqual: AreItemsEqual,\n): AreItemsEqual {\n  return function isCircular(a: any, b: any, state: CircularState<Cache<any, any>>) {\n    if (!a || !b || typeof a !== 'object' || typeof b !== 'object') {\n      return areItemsEqual(a, b, state);\n    }\n\n    const { cache } = state;\n\n    const cachedA = cache.get(a);\n    const cachedB = cache.get(b);\n\n    if (cachedA && cachedB) {\n      return cachedA === b && cachedB === a;\n    }\n\n    cache.set(a, b);\n    cache.set(b, a);\n\n    const result = areItemsEqual(a, b, state);\n\n    cache.delete(a);\n    cache.delete(b);\n\n    return result;\n  } as AreItemsEqual;\n}\n\n/**\n * Get the `@@toStringTag` of the value, if it exists.\n */\nexport function getShortTag(value: any): string | undefined {\n  return value != null ? (value[Symbol.toStringTag] as string) : undefined;\n}\n\n/**\n * Get the properties to strictly examine, which include both own properties that are\n * not enumerable and symbol properties.\n */\nexport function getStrictProperties(object: Dictionary): Array<string | symbol> {\n  return (getOwnPropertyNames(object) as Array<string | symbol>).concat(getOwnPropertySymbols(object));\n}\n\n/**\n * Whether the object contains the property passed as an own property.\n */\nexport const hasOwn =\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\n  Object.hasOwn || ((object: Dictionary, property: number | string | symbol) => hasOwnProperty.call(object, property));\n\n/**\n * Whether the values passed are strictly equal or both NaN.\n */\nexport function sameValueZeroEqual(a: any, b: any): boolean {\n  return a === b || (!a && !b && a !== a && b !== b);\n}\n","origins":[{"sourceMappingURL":"index.cjs.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":0,"rawSource":"../../../src/utils.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/equals.ts","gitBlobOid":"0fa0d93f223b0516aab30182ec9f8ef3a8ee477e","sha256":"55a2709a7487872d1d3a3c3dbe789a09de292fa7fb776c4428dd7a973c1a7e2b","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/equals.ts","outputIndex":1,"content":"import type { Dictionary, PrimitiveWrapper, State, TypedArray } from './internalTypes.js';\nimport { getStrictProperties, hasOwn, sameValueZeroEqual } from './utils.js';\n\nconst PREACT_VNODE = '__v';\nconst PREACT_OWNER = '__o';\nconst REACT_OWNER = '_owner';\n\n/**\n * Above this many keys, out-of-position keys are checked with `propertyIsEnumerable` rather than by\n * scanning the other object's keys. Measured in V8: scanning wins up to 50 keys and loses from 100.\n */\nconst MAX_SCANNED_PROPERTIES = 64;\n\nconst { getOwnPropertyDescriptor, keys } = Object;\n// eslint-disable-next-line @typescript-eslint/unbound-method\nconst { propertyIsEnumerable } = Object.prototype;\n\n/**\n * Identify the element type of TypedArrays across realms and subclasses.\n */\n// eslint-disable-next-line @typescript-eslint/unbound-method\nconst getTypedArrayTag = getOwnPropertyDescriptor(Object.getPrototypeOf(Int8Array.prototype), Symbol.toStringTag)!.get!;\n\n/**\n * Whether the array buffers are equal in value.\n */\nexport function areArrayBuffersEqual(a: ArrayBuffer, b: ArrayBuffer): boolean {\n  return a.byteLength === b.byteLength && areTypedArraysEqual(new Uint8Array(a), new Uint8Array(b));\n}\n\n/**\n * Whether the arrays are equal in value.\n */\nexport function areArraysEqual(a: any[], b: any[], state: State<any>) {\n  let index = a.length;\n\n  if (b.length !== index) {\n    return false;\n  }\n\n  while (index-- > 0) {\n    if (!state.equals(a[index], b[index], index, index, a, b, state)) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\n/**\n * Whether the dataviews are equal in value.\n */\nexport function areDataViewsEqual(a: DataView, b: DataView): boolean {\n  return (\n    a.byteLength === b.byteLength\n    && areTypedArraysEqual(\n      new Uint8Array(a.buffer, a.byteOffset, a.byteLength),\n      new Uint8Array(b.buffer, b.byteOffset, b.byteLength),\n    )\n  );\n}\n\n/**\n * Whether the dates passed are equal in value.\n */\nexport function areDatesEqual(a: Date, b: Date): boolean {\n  return sameValueZeroEqual(a.getTime(), b.getTime());\n}\n\n/**\n * Whether the errors passed are equal in value.\n *\n * @note\n * `name`, `message` and `stack` are own properties but are not enumerable, so they are compared\n * explicitly. `cause` and `errors` are compared by value rather than by reference, matching how\n * every other nested value in the comparison is treated. They are compared exactly once, regardless\n * of whether they were assigned (enumerable) or set by the constructor (non-enumerable). Other own\n * enumerable properties (which custom `Error` subclasses commonly add) are compared afterward.\n *\n * The own property comparison is inlined rather than extracted, which measured faster in V8 when\n * recursing through `cause`. Keep the bytecode under V8's 460-byte TurboFan inlining limit (383 bytes\n * at time of writing; check with `node --print-bytecode --print-bytecode-filter=areErrorsEqual`), or\n * this stops being inlined into its callers.\n */\nexport function areErrorsEqual(a: Error, b: Error, state: State<any>): boolean {\n  if (a.name !== b.name || a.message !== b.message || a.stack !== b.stack) {\n    return false;\n  }\n\n  const causeA = a.cause;\n  const causeB = b.cause;\n\n  if (causeA !== causeB && !state.equals(causeA, causeB, 'cause', 'cause', a, b, state)) {\n    return false;\n  }\n\n  const errorsA = (a as AggregateError).errors;\n  const errorsB = (b as AggregateError).errors;\n\n  if (errorsA !== errorsB && !state.equals(errorsA, errorsB, 'errors', 'errors', a, b, state)) {\n    return false;\n  }\n\n  const propertiesA = keys(a);\n  const propertiesB = keys(b);\n\n  let index = propertiesA.length;\n\n  // Constructed errors rarely have enumerable own properties.\n  if (!index && !propertiesB.length) {\n    return true;\n  }\n\n  let compared = 0;\n  let property: string;\n\n  while (index-- > 0) {\n    property = propertiesA[index]!;\n\n    // Already compared above regardless of enumerability, so we can ignore them.\n    if (property === 'cause' || property === 'errors') {\n      continue;\n    }\n\n    // `propertyIsEnumerable` rather than `hasOwn`, so that a non-enumerable own property on `b` cannot\n    // stand in for an enumerable one. Keys in the same position are trivially enumerable on `b`.\n    if (\n      (property !== propertiesB[index] && !propertyIsEnumerable.call(b, property))\n      || !state.equals((a as Dictionary)[property], (b as Dictionary)[property], property, property, a, b, state)\n    ) {\n      return false;\n    }\n\n    ++compared;\n  }\n\n  // Every compared key is enumerable on `b`, so any of `b`'s keys left over must be `cause` / `errors`.\n  const remaining = propertiesB.length - compared;\n\n  return (\n    !remaining\n    || remaining === (propertyIsEnumerable.call(b, 'cause') ? 1 : 0) + (propertyIsEnumerable.call(b, 'errors') ? 1 : 0)\n  );\n}\n\n/**\n * Whether the functions passed are equal in value.\n */\nexport function areFunctionsEqual(a: (...args: any[]) => any, b: (...args: any[]) => any): boolean {\n  return a === b;\n}\n\n/**\n * Whether the errors passed are equal in value.\n *\n * @note\n * `name`, `message` and `stack` are own properties but are not enumerable, so they are compared\n * explicitly. `cause` and `errors` are own properties, so `areObjectsEqualStrict` compares them along\n * with every other own property; they are not compared explicitly to avoid comparing them twice.\n */\nexport function areErrorsEqualStrict(a: Error, b: Error, state: State<any>): boolean {\n  return a.name === b.name && a.message === b.message && a.stack === b.stack && areObjectsEqualStrict(a, b, state);\n}\n\n/**\n * Whether the `Map`s are equal in value.\n */\nexport function areMapsEqual(a: Map<any, any>, b: Map<any, any>, state: State<any>): boolean {\n  const size = a.size;\n\n  if (size !== b.size) {\n    return false;\n  }\n\n  if (!size) {\n    return true;\n  }\n\n  const matchedIndices = new Array<true | undefined>(size);\n  const aIterable = a.entries();\n\n  let aResult: IteratorResult<[any, any]>;\n  let bResult: IteratorResult<[any, any]>;\n  let index = 0;\n\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\n  while ((aResult = aIterable.next())) {\n    if (aResult.done) {\n      break;\n    }\n\n    const bIterable = b.entries();\n\n    let hasMatch = false;\n    let matchIndex = 0;\n\n    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\n    while ((bResult = bIterable.next())) {\n      if (bResult.done) {\n        break;\n      }\n\n      if (matchedIndices[matchIndex]) {\n        matchIndex++;\n        continue;\n      }\n\n      const aEntry = aResult.value;\n      const bEntry = bResult.value;\n\n      if (\n        state.equals(aEntry[0], bEntry[0], index, matchIndex, a, b, state)\n        && state.equals(aEntry[1], bEntry[1], aEntry[0], bEntry[0], a, b, state)\n      ) {\n        hasMatch = matchedIndices[matchIndex] = true;\n        break;\n      }\n\n      matchIndex++;\n    }\n\n    if (!hasMatch) {\n      return false;\n    }\n\n    index++;\n  }\n\n  return true;\n}\n\n/**\n * Whether the numbers are equal in value.\n */\nexport const areNumbersEqual = sameValueZeroEqual;\n\n/**\n * Whether the objects are equal in value.\n */\nexport function areObjectsEqual(a: Dictionary, b: Dictionary, state: State<any>): boolean {\n  const properties = keys(a);\n  const propertiesB = keys(b);\n\n  let index = properties.length;\n\n  if (propertiesB.length !== index) {\n    return false;\n  }\n\n  const isScannable = index <= MAX_SCANNED_PROPERTIES;\n\n  let property: string;\n\n  // Decrementing `while` showed faster results than either incrementing or\n  // decrementing `for` loop and than an incrementing `while` loop. Declarative\n  // methods like `some` / `every` were not used to avoid incurring the garbage\n  // cost of anonymous callbacks.\n  while (index-- > 0) {\n    property = properties[index]!;\n\n    if (isReactProperty(a, b, property)) {\n      continue;\n    }\n\n    // Objects built the same way list their keys in the same order, in which case the key is\n    // already known to be an own enumerable property of `b` and the lookup can be skipped.\n    // Otherwise, `propertiesB` is exactly `b`'s own enumerable keys. Scanning it is faster than\n    // `propertyIsEnumerable` for smaller objects, but it is linear per key, so larger objects\n    // (where reordering would make it quadratic) use the lookup instead.\n    if (\n      (property !== propertiesB[index]\n        && !(isScannable ? propertiesB.includes(property) : propertyIsEnumerable.call(b, property)))\n      || !state.equals(a[property], b[property], property, property, a, b, state)\n    ) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\n/**\n * Whether the objects are equal in value with strict property checking.\n */\nexport function areObjectsEqualStrict(a: Dictionary, b: Dictionary, state: State<any>): boolean {\n  const properties = getStrictProperties(a);\n\n  let index = properties.length;\n\n  if (getStrictProperties(b).length !== index) {\n    return false;\n  }\n\n  let property: string | symbol;\n  let descriptorA: ReturnType<typeof getOwnPropertyDescriptor>;\n  let descriptorB: ReturnType<typeof getOwnPropertyDescriptor>;\n\n  // Decrementing `while` showed faster results than either incrementing or\n  // decrementing `for` loop and than an incrementing `while` loop. Declarative\n  // methods like `some` / `every` were not used to avoid incurring the garbage\n  // cost of anonymous callbacks.\n  while (index-- > 0) {\n    property = properties[index]!;\n\n    if (\n      !isReactProperty(a, b, property)\n      && (!hasOwn(b, property) || !state.equals(a[property], b[property], property, property, a, b, state))\n    ) {\n      return false;\n    }\n\n    descriptorA = getOwnPropertyDescriptor(a, property);\n    descriptorB = getOwnPropertyDescriptor(b, property);\n\n    if (\n      (descriptorA || descriptorB)\n      && (!descriptorA\n        || !descriptorB\n        || descriptorA.configurable !== descriptorB.configurable\n        || descriptorA.enumerable !== descriptorB.enumerable\n        || descriptorA.writable !== descriptorB.writable)\n    ) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\n/**\n * Whether the primitive wrappers passed are equal in value.\n */\nexport function arePrimitiveWrappersEqual(a: PrimitiveWrapper, b: PrimitiveWrapper): boolean {\n  return sameValueZeroEqual(a.valueOf(), b.valueOf());\n}\n\n/**\n * Whether the regexps passed are equal in value.\n */\nexport function areRegExpsEqual(a: RegExp, b: RegExp): boolean {\n  return a.source === b.source && a.flags === b.flags;\n}\n\n/**\n * Whether the `Set`s are equal in value.\n */\nexport function areSetsEqual(a: Set<any>, b: Set<any>, state: State<any>): boolean {\n  const size = a.size;\n\n  if (size !== b.size) {\n    return false;\n  }\n\n  if (!size) {\n    return true;\n  }\n\n  const matchedIndices = new Array<true | undefined>(size);\n  const aIterable = a.values();\n\n  let aResult: IteratorResult<any>;\n  let bResult: IteratorResult<any>;\n\n  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\n  while ((aResult = aIterable.next())) {\n    if (aResult.done) {\n      break;\n    }\n\n    const bIterable = b.values();\n\n    let hasMatch = false;\n    let matchIndex = 0;\n\n    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition\n    while ((bResult = bIterable.next())) {\n      if (bResult.done) {\n        break;\n      }\n\n      if (\n        !matchedIndices[matchIndex]\n        && state.equals(aResult.value, bResult.value, aResult.value, bResult.value, a, b, state)\n      ) {\n        hasMatch = matchedIndices[matchIndex] = true;\n        break;\n      }\n\n      matchIndex++;\n    }\n\n    if (!hasMatch) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\n/**\n * Whether the TypedArray instances are equal in value.\n */\nexport function areTypedArraysEqual(a: TypedArray, b: TypedArray) {\n  let index = a.length;\n\n  if (b.length !== index || a.byteOffset !== b.byteOffset) {\n    return false;\n  }\n\n  // Only float-backed views can hold `NaN`, and the additional check needed to treat it as equal\n  // to itself measurably slows the loop, so integer views keep the plain comparison. This is\n  // hoisted out of the loop so the cost is paid once per call rather than once per element.\n  const tag = getTypedArrayTag.call(a);\n\n  if (tag === 'Float64Array' || tag === 'Float32Array' || tag === 'Float16Array') {\n    while (index-- > 0) {\n      // `NaN` is the only value not equal to itself, and it is treated as equal here to match\n      // the SameValueZero semantics used for every other numeric comparison in the library.\n      if (a[index] !== b[index] && (a[index] === a[index] || b[index] === b[index])) {\n        return false;\n      }\n    }\n\n    return true;\n  }\n\n  while (index-- > 0) {\n    if (a[index] !== b[index]) {\n      return false;\n    }\n  }\n\n  return true;\n}\n\n/**\n * Whether the URL instances are equal in value.\n */\nexport function areUrlsEqual(a: URL, b: URL): boolean {\n  // `href` is the normalized serialization of every component, so matching hrefs are equal without\n  // any further work. Only a difference in query parameter ordering can survive a mismatch here.\n  if (a.href === b.href) {\n    return true;\n  }\n\n  return (\n    a.protocol === b.protocol\n    && a.username === b.username\n    && a.password === b.password\n    // `host` covers both the hostname and the port.\n    && a.host === b.host\n    && a.pathname === b.pathname\n    && a.hash === b.hash\n    && areSearchParamsEqual(a.searchParams, b.searchParams)\n  );\n}\n\n/**\n * Whether the search params passed are equal in value.\n *\n * @note\n * Order is not significant, matching how the other unordered collections in the library are\n * compared. Repeated keys are, so this is a comparison of multisets rather than of sets:\n * `a=1&a=2` is equal to `a=2&a=1`, but not to `a=1&a=1`.\n */\nfunction areSearchParamsEqual(a: URLSearchParams, b: URLSearchParams): boolean {\n  const serializedA = a.toString();\n  const serializedB = b.toString();\n\n  // Identical serializations are equal under any ordering, and this is by far the common case, so\n  // it is worth checking before sorting anything.\n  return serializedA === serializedB || sortSearchParams(serializedA) === sortSearchParams(serializedB);\n}\n\n/**\n * Reorder a serialized query string so that params holding the same pairs compare as equal\n * regardless of the order they appear in.\n *\n * @note\n * The serializer percent-encodes `&` and `=` wherever they appear inside a name or a value, so\n * splitting on `&` recovers exactly the pairs and nothing else.\n */\nfunction sortSearchParams(serialized: string): string {\n  return serialized.split('&').sort().join('&');\n}\n\nfunction isReactProperty(a: Dictionary, b: Dictionary, property: string | symbol): boolean {\n  return (\n    (property === REACT_OWNER || property === PREACT_OWNER || property === PREACT_VNODE) && !!(a.$$typeof || b.$$typeof)\n  );\n}\n","origins":[{"sourceMappingURL":"index.cjs.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":1,"rawSource":"../../../src/equals.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/comparator.ts","gitBlobOid":"3e663d338ee8fc512a19e6cc5ec5c1b2e9637bea","sha256":"96e0a77376d33ded739a975f57d5a3951ede94455161fac2284f5c5c7631bb62","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/comparator.ts","outputIndex":2,"content":"import {\n  areArrayBuffersEqual,\n  areArraysEqual as areArraysEqualDefault,\n  areDataViewsEqual,\n  areDatesEqual as areDatesEqualDefault,\n  areErrorsEqual as areErrorsEqualDefault,\n  areFunctionsEqual as areFunctionsEqualDefault,\n  areErrorsEqualStrict as areErrorsEqualStrictDefault,\n  areMapsEqual as areMapsEqualDefault,\n  areNumbersEqual as areNumbersEqualDefault,\n  areObjectsEqual as areObjectsEqualDefault,\n  areObjectsEqualStrict as areObjectsEqualStrictDefault,\n  arePrimitiveWrappersEqual as arePrimitiveWrappersEqualDefault,\n  areRegExpsEqual as areRegExpsEqualDefault,\n  areSetsEqual as areSetsEqualDefault,\n  areTypedArraysEqual as areTypedArraysEqualDefault,\n  areUrlsEqual as areUrlsEqualDefault,\n} from './equals.js';\nimport type {\n  ComparatorConfig,\n  CreateState,\n  CustomEqualCreatorOptions,\n  EqualityComparator,\n  InternalEqualityComparator,\n  State,\n} from './internalTypes.js';\nimport { combineComparators, createIsCircular, getShortTag } from './utils.js';\n\nconst ARRAY_BUFFER_TAG = '[object ArrayBuffer]';\nconst ARGUMENTS_TAG = '[object Arguments]';\nconst BOOLEAN_TAG = '[object Boolean]';\nconst DATA_VIEW_TAG = '[object DataView]';\nconst DATE_TAG = '[object Date]';\nconst ERROR_TAG = '[object Error]';\nconst MAP_TAG = '[object Map]';\nconst NUMBER_TAG = '[object Number]';\nconst OBJECT_TAG = '[object Object]';\nconst REG_EXP_TAG = '[object RegExp]';\nconst SET_TAG = '[object Set]';\nconst STRING_TAG = '[object String]';\nconst TYPED_ARRAY_TAGS: Record<string, boolean> = {\n  '[object Int8Array]': true,\n  '[object Uint8Array]': true,\n  '[object Uint8ClampedArray]': true,\n  '[object Int16Array]': true,\n  '[object Uint16Array]': true,\n  '[object Int32Array]': true,\n  '[object Uint32Array]': true,\n  '[object Float16Array]': true,\n  '[object Float32Array]': true,\n  '[object Float64Array]': true,\n  '[object BigInt64Array]': true,\n  '[object BigUint64Array]': true,\n};\nconst URL_TAG = '[object URL]';\n\n// eslint-disable-next-line @typescript-eslint/unbound-method\nconst toString = Object.prototype.toString;\n\ninterface CreateIsEqualOptions<Meta> {\n  circular: boolean;\n  comparator: EqualityComparator<Meta>;\n  createState: CreateState<Meta> | undefined;\n  equals: InternalEqualityComparator<Meta>;\n  strict: boolean;\n}\n\n/**\n * Create a comparator method based on the type-specific equality comparators passed.\n */\nexport function createEqualityComparator<Meta>({\n  areArrayBuffersEqual,\n  areArraysEqual,\n  areDataViewsEqual,\n  areDatesEqual,\n  areErrorsEqual,\n  areFunctionsEqual,\n  areMapsEqual,\n  areNumbersEqual,\n  areObjectsEqual,\n  arePrimitiveWrappersEqual,\n  areRegExpsEqual,\n  areSetsEqual,\n  areTypedArraysEqual,\n  areUrlsEqual,\n  unknownTagComparators,\n}: ComparatorConfig<Meta>): EqualityComparator<Meta> {\n  /**\n   * compare the value of the two objects and return true if they are equivalent in values\n   */\n  return function comparator(a: any, b: any, state: State<Meta>): boolean {\n    // If the items are strictly equal, no need to do a value comparison.\n    if (a === b) {\n      return true;\n    }\n\n    // If either of the items are nullish and fail the strictly equal check\n    // above, then they must be unequal.\n    if (a == null || b == null) {\n      return false;\n    }\n\n    const type = typeof a;\n\n    if (type !== typeof b) {\n      return false;\n    }\n\n    if (type !== 'object') {\n      if (type === 'number') {\n        return areNumbersEqual(a, b, state);\n      }\n\n      if (type === 'function') {\n        return areFunctionsEqual(a, b, state);\n      }\n\n      // If a primitive value that is not strictly equal, it must be unequal.\n      return false;\n    }\n\n    const constructor = a.constructor;\n\n    // Checks are listed in order of commonality of use-case:\n    //   1. Common complex object types (plain object, array)\n    //   2. Common data values (date, regexp)\n    //   3. Less-common complex object types (map, set)\n    //   4. Less-common data values (promise, primitive wrappers)\n    // Inherently this is both subjective and assumptive, however\n    // when reviewing comparable libraries in the wild this order\n    // appears to be generally consistent.\n\n    // Constructors should match, otherwise there is potential for false positives\n    // between class and subclass or custom object and POJO.\n    if (constructor !== b.constructor) {\n      return false;\n    }\n\n    // `isPlainObject` only checks against the object's own realm. Cross-realm\n    // comparisons are rare, and will be handled in the ultimate fallback, so\n    // we can avoid capturing the string tag.\n    if (constructor === Object) {\n      return areObjectsEqual(a, b, state);\n    }\n\n    // `isArray()` works on subclasses and is cross-realm, so we can avoid capturing\n    // the string tag or doing an `instanceof` check.\n    if (Array.isArray(a)) {\n      return areArraysEqual(a, b, state);\n    }\n\n    // Try to fast-path equality checks for other complex object types in the\n    // same realm to avoid capturing the string tag. Strict equality is used\n    // instead of `instanceof` because it is more performant for the common\n    // use-case. If someone is subclassing a native class, it will be handled\n    // with the string tag comparison.\n\n    if (constructor === Date) {\n      return areDatesEqual(a, b, state);\n    }\n\n    if (constructor === RegExp) {\n      return areRegExpsEqual(a, b, state);\n    }\n\n    if (constructor === Map) {\n      return areMapsEqual(a, b, state);\n    }\n\n    if (constructor === Set) {\n      return areSetsEqual(a, b, state);\n    }\n\n    if (constructor == null) {\n      // Objects with a prototype of `null` are plain objects.\n      return areObjectsEqual(a, b, state);\n    }\n\n    // Since this is a custom object, capture the string tag to determing its type.\n    // This is reasonably performant in modern environments like v8 and SpiderMonkey.\n    const tag = toString.call(a);\n\n    if (tag === DATE_TAG) {\n      return areDatesEqual(a, b, state);\n    }\n\n    // For RegExp, the properties are not enumerable, and therefore will give false positives if\n    // tested like a standard object.\n    if (tag === REG_EXP_TAG) {\n      return areRegExpsEqual(a, b, state);\n    }\n\n    if (tag === MAP_TAG) {\n      return areMapsEqual(a, b, state);\n    }\n\n    if (tag === SET_TAG) {\n      return areSetsEqual(a, b, state);\n    }\n\n    if (tag === OBJECT_TAG) {\n      // The exception for value comparison is custom `Promise`-like class instances. These should\n      // be treated the same as standard `Promise` objects, which means strict equality, and if\n      // it reaches this point then that strict equality comparison has already failed.\n      return typeof a.then !== 'function' && typeof b.then !== 'function' && areObjectsEqual(a, b, state);\n    }\n\n    // If a URL tag, it should be tested explicitly. Like RegExp, the properties are not\n    // enumerable, and therefore will give false positives if tested like a standard object.\n    if (tag === URL_TAG) {\n      return areUrlsEqual(a, b, state);\n    }\n\n    // If an error tag, it should be tested explicitly. Like RegExp, the properties are not\n    // enumerable, and therefore will give false positives if tested like a standard object.\n    if (tag === ERROR_TAG) {\n      return areErrorsEqual(a, b, state);\n    }\n\n    // If an arguments tag, it should be treated as a standard object.\n    if (tag === ARGUMENTS_TAG) {\n      return areObjectsEqual(a, b, state);\n    }\n\n    if (TYPED_ARRAY_TAGS[tag]) {\n      return areTypedArraysEqual(a, b, state);\n    }\n\n    if (tag === ARRAY_BUFFER_TAG) {\n      return areArrayBuffersEqual(a, b, state);\n    }\n\n    if (tag === DATA_VIEW_TAG) {\n      return areDataViewsEqual(a, b, state);\n    }\n\n    // As the penultimate fallback, check if the values passed are primitive wrappers. This\n    // is very rare in modern JS, which is why it is deprioritized compared to all other object\n    // types.\n    if (tag === BOOLEAN_TAG || tag === NUMBER_TAG || tag === STRING_TAG) {\n      return arePrimitiveWrappersEqual(a, b, state);\n    }\n\n    if (unknownTagComparators) {\n      let unknownTagComparator = unknownTagComparators[tag];\n\n      if (!unknownTagComparator) {\n        const shortTag = getShortTag(a);\n\n        if (shortTag) {\n          unknownTagComparator = unknownTagComparators[shortTag];\n        }\n      }\n\n      // If the custom config has an unknown tag comparator that matches the captured tag or the\n      // @@toStringTag, it is the source of truth for whether the values are equal.\n      if (unknownTagComparator) {\n        return unknownTagComparator(a, b, state);\n      }\n    }\n\n    // If not matching any tags that require a specific type of comparison, then we hard-code false because\n    // the only thing remaining is strict equality, which has already been compared. This is for a few reasons:\n    //   - Certain types that cannot be introspected (e.g., `WeakMap`). For these types, this is the only\n    //     comparison that can be made.\n    //   - For types that can be introspected, but rarely have requirements to be compared\n    //     (`ArrayBuffer`, `DataView`, etc.), the cost is avoided to prioritize the common\n    //     use-cases (may be included in a future release, if requested enough).\n    //   - For types that can be introspected but do not have an objective definition of what\n    //     equality is (`Error`, etc.), the subjective decision is to be conservative and strictly compare.\n    // In all cases, these decisions should be reevaluated based on changes to the language and\n    // common development practices.\n    return false;\n  };\n}\n\n/**\n * Create the configuration object used for building comparators.\n */\nexport function createEqualityComparatorConfig<Meta>({\n  circular,\n  createCustomConfig,\n  strict,\n}: CustomEqualCreatorOptions<Meta>): ComparatorConfig<Meta> {\n  let config = {\n    areArrayBuffersEqual,\n    areArraysEqual: strict ? areObjectsEqualStrictDefault : areArraysEqualDefault,\n    areDataViewsEqual,\n    areDatesEqual: areDatesEqualDefault,\n    // `name` / `message` / `stack` / `cause` / `errors` are not enumerable (unless assigned), which is why\n    // errors need a comparator of their own rather than being treated as plain objects. Each variant also\n    // compares the own properties that `Error` subclasses routinely carry (`status`, `code`, ...):\n    // enumerable ones in loose mode, and all of them (via `areObjectsEqualStrict`) in strict mode.\n    areErrorsEqual: strict ? areErrorsEqualStrictDefault : areErrorsEqualDefault,\n    areFunctionsEqual: areFunctionsEqualDefault,\n    areMapsEqual: strict ? combineComparators(areMapsEqualDefault, areObjectsEqualStrictDefault) : areMapsEqualDefault,\n    areNumbersEqual: areNumbersEqualDefault,\n    areObjectsEqual: strict ? areObjectsEqualStrictDefault : areObjectsEqualDefault,\n    arePrimitiveWrappersEqual: arePrimitiveWrappersEqualDefault,\n    areRegExpsEqual: areRegExpsEqualDefault,\n    areSetsEqual: strict ? combineComparators(areSetsEqualDefault, areObjectsEqualStrictDefault) : areSetsEqualDefault,\n    areTypedArraysEqual: strict\n      ? combineComparators(areTypedArraysEqualDefault, areObjectsEqualStrictDefault)\n      : areTypedArraysEqualDefault,\n    areUrlsEqual: areUrlsEqualDefault,\n    unknownTagComparators: undefined,\n  };\n\n  if (createCustomConfig) {\n    config = Object.assign({}, config, createCustomConfig(config));\n  }\n\n  if (circular) {\n    const areArraysEqual = createIsCircular(config.areArraysEqual);\n    // Errors are included because comparing `cause` and own properties by value means an error\n    // that references itself would otherwise recurse without bound.\n    const areErrorsEqual = createIsCircular(config.areErrorsEqual);\n    const areMapsEqual = createIsCircular(config.areMapsEqual);\n    const areObjectsEqual = createIsCircular(config.areObjectsEqual);\n    const areSetsEqual = createIsCircular(config.areSetsEqual);\n\n    config = Object.assign({}, config, {\n      areArraysEqual,\n      areErrorsEqual,\n      areMapsEqual,\n      areObjectsEqual,\n      areSetsEqual,\n    });\n  }\n\n  return config;\n}\n\n/**\n * Default equality comparator pass-through, used as the standard `isEqual` creator for\n * use inside the built comparator.\n */\nexport function createInternalEqualityComparator<Meta>(\n  compare: EqualityComparator<Meta>,\n): InternalEqualityComparator<Meta> {\n  return function (\n    a: any,\n    b: any,\n    _indexOrKeyA: any,\n    _indexOrKeyB: any,\n    _parentA: any,\n    _parentB: any,\n    state: State<Meta>,\n  ) {\n    return compare(a, b, state);\n  };\n}\n\n/**\n * Create the `isEqual` function used by the consuming application.\n */\nexport function createIsEqual<Meta>({ circular, comparator, createState, equals, strict }: CreateIsEqualOptions<Meta>) {\n  if (createState) {\n    return function isEqual<A, B>(a: A, b: B): boolean {\n      const { cache = circular ? new WeakMap() : undefined, meta } = createState();\n\n      return comparator(a, b, {\n        cache,\n        equals,\n        meta,\n        strict,\n      } as State<Meta>);\n    };\n  }\n\n  if (circular) {\n    return function isEqual<A, B>(a: A, b: B): boolean {\n      return comparator(a, b, {\n        cache: new WeakMap(),\n        equals,\n        meta: undefined as Meta,\n        strict,\n      });\n    };\n  }\n\n  const state = {\n    cache: undefined,\n    equals,\n    meta: undefined,\n    strict,\n  } as State<Meta>;\n\n  return function isEqual<A, B>(a: A, b: B): boolean {\n    return comparator(a, b, state);\n  };\n}\n","origins":[{"sourceMappingURL":"index.cjs.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":2,"rawSource":"../../../src/comparator.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]},{"officialPath":"src/index.ts","gitBlobOid":"95eb10e8675cecf86da3286a931c3f0da6736665","sha256":"7e15eff7f5e086518adad1040d34558e3453eac59bf5999d79d6f1d0ec334df0","upstreamMode":"100644","rawLogicalIdentifier":"../../../src/index.ts","outputIndex":3,"content":"import {\n  createEqualityComparatorConfig,\n  createEqualityComparator,\n  createInternalEqualityComparator,\n  createIsEqual,\n} from './comparator.js';\nimport type { CustomEqualCreatorOptions } from './internalTypes.js';\nimport { sameValueZeroEqual } from './utils.js';\n\nexport { sameValueZeroEqual };\nexport type {\n  AnyEqualityComparator,\n  Cache,\n  CircularState,\n  ComparatorConfig,\n  CreateCustomComparatorConfig,\n  CreateState,\n  CustomEqualCreatorOptions,\n  DefaultState,\n  Dictionary,\n  EqualityComparator,\n  EqualityComparatorCreator,\n  InternalEqualityComparator,\n  PrimitiveWrapper,\n  State,\n  TypeEqualityComparator,\n  TypedArray,\n} from './internalTypes.js';\n\n/**\n * Whether the items passed are deeply-equal in value.\n */\nexport const deepEqual = createCustomEqual();\n\n/**\n * Whether the items passed are deeply-equal in value based on strict comparison.\n */\nexport const strictDeepEqual = createCustomEqual({ strict: true });\n\n/**\n * Whether the items passed are deeply-equal in value, including circular references.\n */\nexport const circularDeepEqual = createCustomEqual({ circular: true });\n\n/**\n * Whether the items passed are deeply-equal in value, including circular references,\n * based on strict comparison.\n */\nexport const strictCircularDeepEqual = createCustomEqual({\n  circular: true,\n  strict: true,\n});\n\n/**\n * Whether the items passed are shallowly-equal in value.\n */\nexport const shallowEqual = createCustomEqual({\n  createInternalComparator: () => sameValueZeroEqual,\n});\n\n/**\n * Whether the items passed are shallowly-equal in value based on strict comparison\n */\nexport const strictShallowEqual = createCustomEqual({\n  strict: true,\n  createInternalComparator: () => sameValueZeroEqual,\n});\n\n/**\n * Whether the items passed are shallowly-equal in value, including circular references.\n */\nexport const circularShallowEqual = createCustomEqual({\n  circular: true,\n  createInternalComparator: () => sameValueZeroEqual,\n});\n\n/**\n * Whether the items passed are shallowly-equal in value, including circular references,\n * based on strict comparison.\n */\nexport const strictCircularShallowEqual = createCustomEqual({\n  circular: true,\n  createInternalComparator: () => sameValueZeroEqual,\n  strict: true,\n});\n\n/**\n * Create a custom equality comparison method.\n *\n * This can be done to create very targeted comparisons in extreme hot-path scenarios\n * where the standard methods are not performant enough, but can also be used to provide\n * support for legacy environments that do not support expected features like\n * `RegExp.prototype.flags` out of the box.\n */\nexport function createCustomEqual<Meta = undefined>(options: CustomEqualCreatorOptions<Meta> = {}) {\n  const {\n    circular = false,\n    createInternalComparator: createCustomInternalComparator,\n    createState,\n    strict = false,\n  } = options;\n\n  const config = createEqualityComparatorConfig<Meta>(options);\n  const comparator = createEqualityComparator(config);\n  const equals = createCustomInternalComparator\n    ? createCustomInternalComparator(comparator)\n    : createInternalEqualityComparator(comparator);\n\n  return createIsEqual({ circular, comparator, createState, equals, strict });\n}\n","origins":[{"sourceMappingURL":"index.cjs.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/cjs/index.cjs","map":"dist/cjs/index.cjs.map"},{"sourceMappingURL":"index.mjs.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/es/index.mjs","map":"dist/es/index.mjs.map"},{"sourceMappingURL":"index.js.map","index":3,"rawSource":"../../../src/index.ts","bundle":"dist/umd/index.js","map":"dist/umd/index.js.map"}]}]};
const root = process.env.AEGIS_CI_CAPTURE_ROOT;
const out = process.env.AEGIS_CI_CAPTURE_OUT;
const manifestPath = process.env.AEGIS_CI_CAPTURE_INPUTS;
if (root || out || manifestPath) {
  const original = Object.fromEntries(
    [
      "writeFileSync",
      "writeFile",
      "renameSync",
      "rmSync",
      "readFileSync",
      "mkdirSync",
      "lstatSync",
      "openSync",
      "readSync",
      "fstatSync",
      "closeSync",
    ].map((k) => [k, fs[k].bind(fs)]),
  );
  const promiseWrite = fsp.writeFile.bind(fsp);
  const promiseRm = fsp.rm.bind(fsp);
  const hash = (b) => createHash("sha256").update(b).digest("hex");
  const inside = (p, base) => p === base || p.startsWith(base + path.sep);
  const absolute = (p) => typeof p === "string" && path.isAbsolute(p) && path.resolve(p) === p;
  if (
    ![root, out, manifestPath, process.env.PWTEST_CACHE_DIR].every(absolute) ||
    inside(out, root) ||
    inside(process.env.PWTEST_CACHE_DIR, root) ||
    inside(process.env.PWTEST_CACHE_DIR, out)
  )
    throw new Error("invalid capture namespaces");
  const cache = process.env.PWTEST_CACHE_DIR;
  const safe = (p) => {
    let current = path.parse(p).root;
    for (const part of p.slice(current.length).split(path.sep)) {
      current = path.join(current, part);
      try {
        if (original.lstatSync(current).isSymbolicLink()) throw new Error("symlink: " + current);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
    }
  };
  [root, out, manifestPath, cache].forEach(safe);
  let manifestBytes, manifest, inputs, owners, initializationError;
  const initialize = () => {
    if (manifest) return;
    safe(manifestPath);
    manifestBytes = original.readFileSync(manifestPath);
    manifest = JSON.parse(manifestBytes);
    inputs = new Map(manifest.files.map((f) => [f.path, f]));
    owners = manifest.writers;
    try {
      for (const p of inputs.keys()) verify(p);
      for (const owner of owners) verify(owner.path);
      if (
        !owners.some((o) => o.role === "vite") ||
        !owners.some((o) => o.role === "playwright-common") ||
        !owners.some((o) => o.role === "playwright-esm") ||
        !owners.some((o) => o.role === "compiler")
      )
        throw new Error("missing installed owners");
    } catch (error) {
      initializationError = error.message;
    }
  };
  const hashInput = (p, entry) => {
    safe(p);
    const before = original.lstatSync(p, { bigint: true });
    const changed = () => new Error("changed input: " + p);
    if (!before.isFile() || Number(before.mode & 0o777n) !== entry.mode) throw changed();
    const same = (a, b) => ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"].every((k) => a[k] === b[k]);
    let fd, digest, primary;
    try {
      fd = original.openSync(p, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
      const opened = original.fstatSync(fd, { bigint: true });
      if (!opened.isFile() || !same(before, opened)) throw changed();
      const inputHash = createHash("sha256");
      const buffer = Buffer.allocUnsafe(64 * 1024);
      let total = 0n;
      for (;;) {
        const n = original.readSync(fd, buffer, 0, buffer.length, null);
        if (n === 0) break;
        total += BigInt(n);
        if (total > opened.size) throw changed();
        inputHash.update(buffer.subarray(0, n));
      }
      if (total !== opened.size || !same(opened, original.fstatSync(fd, { bigint: true }))) throw changed();
      safe(p);
      if (!same(opened, original.lstatSync(p, { bigint: true }))) throw changed();
      digest = inputHash.digest("hex");
    } catch (error) {
      primary = error;
    } finally {
      if (fd !== undefined) {
        try {
          original.closeSync(fd);
        } catch (error) {
          primary = primary ? new AggregateError([primary, error], "input read and close failed: " + p) : error;
        }
      }
    }
    if (primary) throw primary;
    return digest;
  };
  const verify = (p) => {
    const entry = inputs.get(p);
    if (!entry || !absolute(p)) throw new Error("unbound input: " + p);
    if (hashInput(p, entry) !== entry.sha256) throw new Error("changed input: " + p);
    return p;
  };
  const startTicks = original.readFileSync("/proc/self/stat", "utf8").split(") ")[1].split(" ")[19];
  let sequence = 0;
  const producer = path.join(out, "producer");
  safe(producer);
  original.mkdirSync(producer, { recursive: true });
  const emit = (receipt) =>
    original.writeFileSync(
      path.join(producer, `${process.pid}-${receipt.publicationSequence}.json`),
      JSON.stringify(receipt),
      { flag: "wx", mode: 0o600 },
    );

  const externalSource = (mapping, filename, i, p) => {
    const data = AUTHORIZED_FAST_EQUALS_DATA;
    if (hash(Buffer.from(JSON.stringify(data))) !== "87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3") throw Error('external data bytes changed');
    const roots = manifest.externalSourceAssociations || [];
    const matches = [];
    for (const association of roots) {
      if (association.dataSha256 !== "87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3") throw Error("external data pin mismatch");
      const directory = association.packageRoot;
      if (!absolute(directory) || !inside(directory, root)) throw Error("external package root");
      const physical = (rel) => { const q = path.join(directory, rel); verify(q); return original.readFileSync(q); };
      const actualFiles = [];
      const walk = (d) => { safe(d); for (const e of fs.readdirSync(d,{withFileTypes:true})) { const q=path.join(d,e.name); safe(q); if(e.isDirectory()) walk(q); else if(e.isFile()) actualFiles.push(path.relative(directory,q)); else throw Error("external package file type"); } };
      walk(directory);
      if (JSON.stringify(actualFiles.sort()) !== JSON.stringify(data.packageFiles.map(f=>f.relative).sort())) throw Error("external package inventory");
      for (const f of data.packageFiles) { const b=physical(f.relative); if(hash(b)!==f.sha256 || b.length!==f.bytes || inputs.get(path.join(directory,f.relative)).mode!==420) throw Error("external package hash/mode"); }
      const pkg=JSON.parse(physical('package.json'));
      if(pkg.name!==data.package || pkg.version!==data.version || pkg.repository.url!=='git+https://github.com/'+data.repository+'.git') throw Error("external package identity");
      for (const source of data.sources) {
        const bytes=Buffer.from(source.content);
        if(source.upstreamMode!=='100644' || hash(bytes)!==source.sha256 || createHash('sha1').update(Buffer.concat([Buffer.from('blob '+bytes.length+'\0'),bytes])).digest('hex')!==source.gitBlobOid) throw Error("external source blob");
        const origins=[];
        for (const o of source.origins) {
          const bundle=path.join(directory,o.bundle), mp=path.join(directory,o.map);
          const text=physical(o.bundle).toString(); const urls=[...text.matchAll(/[#@] sourceMappingURL=([^\s]+)/g)].map(m=>m[1]);
          if(JSON.stringify(urls)!==JSON.stringify([o.sourceMappingURL])) throw Error("external map URL");
          const m=JSON.parse(physical(o.map));
          // No normalization of malformed identifiers; all three relations retained.
          if('sourceRoot' in m || m.sources[o.index]!==source.rawLogicalIdentifier || m.sourcesContent[o.index]!==source.content) throw Error("external upstream map");
          let d=path.dirname(bundle); while(d!==directory) { const decoy=path.join(d,'package.json'); safe(decoy); if(fs.existsSync(decoy)) throw Error("external nearer manifest"); d=path.dirname(d); }
          const resolved=path.resolve(path.dirname(mp),m.sources[o.index]);
          if(resolved===p) origins.push({bundlePath:bundle,bundleSha256:inputs.get(bundle).sha256,mapPath:mp,mapSha256:inputs.get(mp).sha256,sourceMappingURL:o.sourceMappingURL,sourceIndex:o.index,originalSource:m.sources[o.index]});
        }
        if(origins.length===3 && mapping.sourcesContent?.[i]===source.content && !('sourceRoot' in mapping)) {
          matches.push({kind:'authorized-external-git-source-v1',repository:data.repository,commit:data.commit,officialPath:source.officialPath,gitBlobOid:source.gitBlobOid,gitMode:source.upstreamMode,sourceSha256:source.sha256,dataSha256:'87737678c021ee0bd569009aef2dbb3fa42d8e776d9748f31b665673119cf4b3',packageRoot:directory,packageIntegrity:data.integrity,packageFiles:data.packageFiles,outputPath:filename,outputSource:mapping.sources[i],outputIndex:i,origins});
        }
      }
    }
    if(matches.length>1) throw Error('ambiguous external source');
    return matches[0];
  };
  // Only bound upstream bundle/map metadata may explain a nonexistent composed origin.
  const sourcePaths = (bytes, filename, embedded) => {
    let map;
    if (filename.endsWith(".map")) map = JSON.parse(bytes.toString());
    else {
      const match = bytes.toString().match(/sourceMappingURL=data:application\/json[^,]*;base64,([^\s]+)/);
      if (match) map = JSON.parse(Buffer.from(match[1], "base64"));
    }
    if (!map) return [];
    const resolveSource = (base, sourceRoot, source) => {
      if (
        typeof source !== "string" ||
        typeof sourceRoot !== "string" ||
        (source + sourceRoot).includes("\\") ||
        (source + sourceRoot).includes("\0") ||
        [source, sourceRoot].some((value) => /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value))
      )
        throw new Error("unrecognized embedded source");
      const p = path.resolve(path.dirname(base), sourceRoot, source);
      if (!inside(p, root)) throw new Error("source escapes input root");
      return p;
    };
    return map.sources.flatMap((s, _i) => {
      const sourceRoot = map.sourceRoot || "";
      if (
        typeof s !== "string" ||
        typeof sourceRoot !== "string" ||
        (s + sourceRoot).includes("\\") ||
        (s + sourceRoot).includes("\0") ||
        (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) && !s.startsWith("file:")) ||
        /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(sourceRoot)
      )
        throw new Error("unrecognized source");
      const p = s.startsWith("file:")
        ? fileURLToPath(s)
        : path.resolve(path.dirname(filename), map.sourceRoot || "", s);
      if (!inside(p, root)) throw new Error("source escapes input root");
      if (inputs.has(p)) {
        verify(p);
        const authorizedPhysical = (manifest.externalSourceAssociations || []).some(a => AUTHORIZED_FAST_EQUALS_DATA.sources.some(source => p === path.resolve(a.packageRoot, '..', source.officialPath)));
        if (authorizedPhysical && typeof map.sourcesContent?.[_i] === 'string' && !original.readFileSync(p).equals(Buffer.from(map.sourcesContent[_i]))) throw Error('physical source content mismatch');
        return [p];
      }
      safe(p);
      try {
        original.lstatSync(p);
        throw new Error("unbound physical source: " + p);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }
      if (resolveSource(filename, map.sourceRoot || "", s) !== p || typeof map.sourcesContent?.[_i] !== "string")
        throw new Error("unbound embedded source");
      const authorized = externalSource(map, filename, _i, p);
      if (authorized) {
        embedded.push(authorized);
        return authorized.packageFiles.map(f=>path.join(authorized.packageRoot,f.relative));
      }
      const matches = [];
      const packageFor = (bundle) => {
        for (let d = path.dirname(bundle); inside(d, root); d = path.dirname(d)) {
          const candidate = path.join(d, "package.json");
          safe(candidate);
          try {
            original.lstatSync(candidate);
          } catch (e) {
            if (e.code === "ENOENT") {
              if (d === root) break;
              continue;
            }
            throw e;
          }
          verify(candidate);
          const identity = JSON.parse(original.readFileSync(candidate));
          if (typeof identity.name !== "string" || typeof identity.version !== "string")
            throw new Error("invalid package identity");
          return { directory: d, path: candidate, identity };
        }
        throw new Error("missing bound package identity");
      };
      for (const bundle of inputs.keys()) {
        if (!inside(bundle, root) || !inside(p, path.dirname(bundle)) || !/\.[cm]?js$/.test(bundle)) continue;
        // Reading is allowed only after the manifest-bound physical input verifies.
        verify(bundle);
        const text = original.readFileSync(bundle, "utf8");
        const urls = [...text.matchAll(/[#@] sourceMappingURL=([^\s]+)/g)];
        if (urls.length !== 1) continue;
        const url = urls[0][1];
        if (!/^[A-Za-z0-9_.-]+\.map$/.test(url)) continue;
        const upstream = path.resolve(path.dirname(bundle), url);
        if (!inputs.has(upstream) || !inside(upstream, root)) continue;
        verify(upstream);
        const upstreamMap = JSON.parse(original.readFileSync(upstream));
        for (let j = 0; j < (upstreamMap.sources || []).length; j++) {
          const originalSource = upstreamMap.sources[j];
          if (
            resolveSource(upstream, upstreamMap.sourceRoot || "", originalSource) !== p ||
            upstreamMap.sourcesContent?.[j] !== map.sourcesContent[_i]
          )
            continue;
          const pkg = packageFor(bundle);
          const declaredRoot = upstreamMap.sourceRoot || "";
          if (path.isAbsolute(originalSource) || path.isAbsolute(declaredRoot))
            throw new Error("absolute package source");
          const physical = path.resolve(pkg.directory, declaredRoot, originalSource);
          if (!inside(physical, pkg.directory)) throw new Error("source escapes package root");
          verify(physical);
          if (!original.readFileSync(physical).equals(Buffer.from(map.sourcesContent[_i])))
            throw new Error("physical embedded mismatch");
          matches.push({
            kind: "bound-upstream-physical-v1",
            packageRoot: pkg.directory,
            packagePath: pkg.path,
            packageSha256: inputs.get(pkg.path).sha256,
            packageName: pkg.identity.name,
            packageVersion: pkg.identity.version,
            physicalSourcePath: physical,
            physicalSourceSha256: inputs.get(physical).sha256,
            physicalSourceMode: inputs.get(physical).mode,
            outputPath: filename,
            outputSource: s,
            outputSourceRoot: map.sourceRoot || "",
            outputIndex: _i,
            bundlePath: bundle,
            bundleSha256: inputs.get(bundle).sha256,
            sourceMappingURL: url,
            mapPath: upstream,
            mapSha256: inputs.get(upstream).sha256,
            originalSource,
            sourceRoot: upstreamMap.sourceRoot || "",
            sourceIndex: j,
            sourcesContentSha256: hash(Buffer.from(map.sourcesContent[_i])),
          });
        }
      }
      if (matches.length !== 1) throw new Error("unbound/ambiguous embedded source: " + p);
      embedded.push(matches[0]);
      return [matches[0].bundlePath, matches[0].mapPath, matches[0].packagePath, matches[0].physicalSourcePath];
    });
  };
  const classify = (p) => {
    if (inside(p, out)) return null;
    if (inside(p, cache)) return "playwright-transform";
    if (!inside(p, root)) return null;
    if (p.includes("/node_modules/.vite-temp/") || /\/vite\.config\.[^/]+\.timestamp-/.test(p)) return "vite-config";
    if (/\/node_modules\/\.vite\/deps(?:_[^/]+)?(?:\/|$)/.test(p)) return "vite-optimizer-publication";
    return null;
  };
  const begin = (kind, src, dst, data, operation) => {
    initialize();
    const n = ++sequence;
    const stack = new Error().stack;
    const writer = owners.find((o) => o.role !== "compiler" && stack.includes(o.path));
    const receipt = {
      version: 1,
      integrityContract: "stage-snapshot-v1",
      compilerIdentity: "stage-snapshot",
      perPublicationInputs: "actual-writer-and-map-bound-inputs",
      kind,
      pid: process.pid,
      startTicks,
      sourcePath: src,
      destinationPath: dst,
      publicationSequence: n,
      inputsSha256: hash(manifestBytes),
      writer: writer ? { path: writer.path, sha256: inputs.get(writer.path).sha256 } : null,
      compilers: owners
        .filter((o) => o.role === "compiler")
        .map((o) => ({ path: o.path, sha256: inputs.get(o.path).sha256 })),
      files: [],
      published: false,
      operation,
    };
    const directories = new Map();
    const directory = (p) => {
      for (
        let current = p;
        inside(current, cache) || /\/node_modules\/\.vite(?:-temp)?(?:\/|$)/.test(current);
        current = path.dirname(current)
      ) {
        if (fs.existsSync(current)) {
          safe(current);
          const stat = original.lstatSync(current);
          if (!stat.isDirectory()) throw new Error("non-directory output ancestor");
          directories.set(current, { path: current, mode: stat.mode & 0o7777 });
        }
      }
    };
    let rejection = initializationError;
    const collect = (p, bytes) => {
      safe(p);
      directory(path.dirname(p));
      if (bytes === undefined) {
        const stat = original.lstatSync(p);
        if (stat.isDirectory()) {
          directory(p);
          for (const name of fs.readdirSync(p)) collect(path.join(p, name));
          return;
        }
        if (!stat.isFile()) throw new Error("nonregular output: " + p);
        bytes = original.readFileSync(p);
      }
      bytes = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
      const archivePath = path.join(producer, `${process.pid}-${n}-${receipt.files.length}.raw`);
      original.writeFileSync(archivePath, bytes, { flag: "wx", mode: 0o600 });
      receipt.files.push({
        path: p,
        archivePath,
        sha256: hash(bytes),
        size: bytes.length,
        mode: fs.existsSync(p) ? original.lstatSync(p).mode & 0o777 : 0o644,
      });
    };
    try {
      collect(src, data);
    } catch (e) {
      rejection = e.message;
    }
    try {
      if (rejection) throw new Error(rejection);
      if (writer) verify(writer.path);
      if (!writer) throw new Error("unbound writer");
      const bindings = new Set();
      const embedded = [];
      for (const file of receipt.files) {
        if (kind === "playwright-transform") {
          receipt.transformBinding = bindPlaywrightTransform(
            original.readFileSync(file.archivePath),
            file.path,
            manifest,
            original.readFileSync,
            verify,
          );
          bindings.add(receipt.transformBinding.input.path);
          for (const origin of receipt.transformBinding.originals) bindings.add(origin.path);
        } else
          for (const p of sourcePaths(original.readFileSync(file.archivePath), file.path, embedded)) bindings.add(p);
        if (file.mode !== 0o644 && file.mode !== 0o600) throw new Error("unexpected output mode");
      }
      if (kind === "vite-config") {
        const name = path.basename(src).replace(/\.timestamp-\d+-[a-f0-9]+\.mjs$/, "");
        const configs = [...inputs.keys()].filter(
          (p) => path.basename(p) === name && /^vite\.config\.[cm]?[jt]s$/.test(name),
        );
        if (configs.length !== 1 || !bindings.has(configs[0])) throw new Error("unbound config");
      } else if (kind === "playwright-transform") {
        if (!/\/[a-f0-9]{2}\/[^/]+\.(js|map)$/.test(src)) throw new Error("unknown transform output");
        if (!bindings.size) throw new Error("source-unbound transform");
      } else {
        const metadataFile = receipt.files.find((f) => path.basename(f.path) === "_metadata.json");
        if (operation !== "cancel" && !metadataFile) throw new Error("missing optimizer metadata");
        const allowed = new Set(["package.json", "_metadata.json"]);
        if (metadataFile) {
          const metadata = JSON.parse(original.readFileSync(metadataFile.archivePath));
          for (const info of Object.values(metadata.optimized || {})) {
            bindings.add(verify(path.resolve(dst, info.src)));
            allowed.add(path.basename(info.file));
            allowed.add(path.basename(info.file) + ".map");
          }
          for (const info of Object.values(metadata.chunks || {})) {
            allowed.add(path.basename(info.file));
            allowed.add(path.basename(info.file) + ".map");
          }
        }
        for (const f of receipt.files) {
          if (path.dirname(f.path) !== src) throw new Error("nested optimizer output");
          if (
            !allowed.has(path.basename(f.path)) &&
            (operation !== "cancel" || !/^[A-Za-z0-9_$.-]+\.(js|js\.map)$/.test(path.basename(f.path)))
          )
            throw new Error("unknown optimizer output");
        }
        if (receipt.files.some((f) => f.path.endsWith(".js")) && !bindings.size)
          throw new Error("source-unbound optimizer");
      }
      receipt.sourceInputs = [...bindings];
      if (embedded.length) receipt.sourceBindings = embedded;
    } catch (e) {
      receipt.rejected = e.message;
    }
    receipt.directories = [...directories.values()];
    return receipt;
  };
  const before = (p, data, operation, dst = p) => {
    if (typeof p !== "string" && !(p instanceof URL)) return null;
    p = p instanceof URL ? fileURLToPath(p) : path.resolve(p);
    const kind = classify(p);
    const receipt =
      kind && !(kind === "vite-optimizer-publication" && operation === "write")
        ? begin(kind, p, String(dst), data, operation)
        : null;
    if (receipt?.rejected?.startsWith("symlink:")) {
      finish(receipt, new Error(receipt.rejected));
      throw new Error(receipt.rejected);
    }
    return receipt;
  };
  const finish = (r, error) => {
    if (!r) return;
    r.published = !error && r.operation !== "cancel" && r.operation !== "retire";
    if (r.operation === "retire") r.retired = !error;
    if (r.operation === "cancel") r.cancelled = !error;
    if (error) r.error = String(error);
    emit(r);
    if (!error && r.rejected) {
      process.exitCode = 1;
    }
  };
  fs.writeFileSync = function (p, data, ...args) {
    const r = before(p, data, "write");
    try {
      const value = original.writeFileSync(p, data, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fsp.writeFile = fs.promises.writeFile = async function (p, data, ...args) {
    const r = before(p, data, "write");
    try {
      const value = await promiseWrite(p, data, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fs.writeFile = function (p, data, ...args) {
    const callback = args.pop();
    const r = before(p, data, "write");
    return original.writeFile(p, data, ...args, function (error, ...values) {
      finish(r, error);
      callback(error, ...values);
    });
  };
  fs.renameSync = function (src, dst) {
    const r = /\/deps_temp_[^/]+$/.test(String(src))
      ? before(src, undefined, "rename", dst)
      : /\/deps$/.test(String(src)) && /\/deps_temp_[^/]+$/.test(String(dst))
        ? before(src, undefined, "retire", src)
        : null;
    try {
      const value = original.renameSync(src, dst);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fs.rmSync = function (p, ...args) {
    const r = /\/deps_temp_[^/]+$/.test(String(p)) && fs.existsSync(p) ? before(p, undefined, "cancel") : null;
    try {
      const value = original.rmSync(p, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  fsp.rm = fs.promises.rm = async function (p, ...args) {
    const r = /\/deps$/.test(String(p)) && fs.existsSync(p) ? before(p, undefined, "retire") : null;
    try {
      const value = await promiseRm(p, ...args);
      finish(r);
      return value;
    } catch (e) {
      finish(r, e);
      throw e;
    }
  };
  syncBuiltinESMExports();
}
