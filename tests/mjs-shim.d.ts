// The CLI is dependency-free ESM by policy (ADR-005) and ships no type
// declarations. Tests exercise it as a black box; imports resolve as `any`.
declare module "*.mjs";
