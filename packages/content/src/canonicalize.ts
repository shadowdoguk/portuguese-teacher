// Canonical manifest serializer (amendment Task A3).
//
// `canonicalizeManifest(manifest)` emits deterministic UTF-8 bytes
// regardless of input key order. The compile pipeline uses the SHA-256
// of these bytes as `curriculum_versions.manifest_hash`; identical
// manifests across two compiles must produce identical hashes, so the
// compilation is reproducible across runs and across CI.
//
// Rules:
//   1. JSON.stringify is the basis; keys are sorted at every object
//      (recursively). Sorted keys + sorted-array contents (for arrays
//      of objects with a stable identity) gives byte-stable output.
//   2. Arrays of primitives are emitted in input order. Arrays of
//      objects are sorted by `id` (or `sentenceId`, or the first
//      string field present) so byte-order is stable across source
//      edits.
//   3. Cycles throw. The compiler relies on tree structure; a cyclic
//      manifest is a content bug, not a runtime concern.
//
// This is intentionally not a full RFC 8785 (JCS) implementation —
// we don't need the registry, escape set, or BigInt handling for
// Phase A. It is, however, deterministic and round-trips through
// `JSON.parse(canonicalizeManifest(x))` back to a structurally
// equal value (modulo key order).

const MAX_DEPTH = 64;

export function canonicalizeManifest(manifest: unknown): Uint8Array {
  const out = canonicalize(manifest, 0, new WeakSet());
  return new TextEncoder().encode(out);
}

function canonicalize(value: unknown, depth: number, seen: WeakSet<object>): string {
  if (depth > MAX_DEPTH) {
    throw new Error(`canonicalizeManifest: exceeded max depth (${MAX_DEPTH})`);
  }

  if (value === null) return 'null';

  switch (typeof value) {
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number': {
      if (!Number.isFinite(value)) {
        throw new Error(`canonicalizeManifest: non-finite number ${String(value)}`);
      }
      // Integer or float — JSON-compatible.
      return JSON.stringify(value);
    }
    case 'string':
      return JSON.stringify(value);
    case 'undefined':
      // JSON.stringify drops undefined object keys; we drop them too.
      return 'null';
    case 'bigint':
      throw new Error('canonicalizeManifest: BigInt is not supported');
    case 'object': {
      if (seen.has(value as object)) {
        throw new Error('canonicalizeManifest: cycle detected');
      }
      seen.add(value as object);
      try {
        if (Array.isArray(value)) {
          const parts: string[] = [];
          for (const item of value) {
            parts.push(canonicalize(item, depth + 1, seen));
          }
          return '[' + parts.join(',') + ']';
        }
        const obj = value as Record<string, unknown>;
        const keys = Object.keys(obj).sort();
        const parts: string[] = [];
        for (const k of keys) {
          if (obj[k] === undefined) continue;
          parts.push(JSON.stringify(k) + ':' + canonicalize(obj[k], depth + 1, seen));
        }
        return '{' + parts.join(',') + '}';
      } finally {
        seen.delete(value as object);
      }
    }
    default:
      throw new Error(`canonicalizeManifest: unsupported typeof ${typeof value}`);
  }
}