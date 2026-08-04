// Barrel re-export for @pt/contracts.
//
// Consumers (apps/api, apps/web, packages/domain) import from this
// module only — never from sibling files inside @pt/contracts. This
// gives us one place to evolve the surface and keeps the per-domain
// files focused on schema authoring rather than re-export bookkeeping.
//
// Layering rule (CONTEXT.md "Curriculum Repository" + Phase A plan
// Global Constraints): @pt/content imports from this package; the
// reverse direction is forbidden. apps/* imports from this package
// via the workspace alias @pt/contracts.

export * from './errors.js';
export * from './curriculum.js';
export * from './practice.js';
export * from './audio.js';
export * from './conversation.js';
export * from './auth.js';
export * from './settings.js';
export * from './collections.js';
export * from './unitProgress.js';
export * from './filter.js';
