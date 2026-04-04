/**
 * Next.js only loads middleware from `middleware.ts` (or root `middleware.ts`).
 * The handler implementation lives in `./proxy` for easier testing/import.
 */
export { default, config } from './proxy';
