// Barrel re-export for @pt/content.
//
// Consumers:
//   - apps/api/src/modules/content/publish.ts (lands in Task 7) —
//     imports applyPublish + CompileResult to drive a publish via
//     HTTP.
//   - apps/api/src/cli/compile.ts (lands in Task 6's CLI companion) —
//     imports parseManifest + compileManifest + canonicalizeManifest.
//   - The CLI companion itself (`tsx packages/content/src/cli/compile.ts`)
//     is not committed in Phase A; Phase B ships it once `apps/api`
//     owns the canonical compilation path.

export * from './canonicalize.js';
export * from './manifest.js';
export * from './compile.js';
export * from './applyPublish.js';