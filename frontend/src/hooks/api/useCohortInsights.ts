/**
 * Read-only cohort insight hooks (facilitators, admins, and cohort captains).
 * Backed by the same facilitator routes with server-side access checks.
 */
export {
  useCohortStats,
  useFellowEngagement,
  useResourceCompletions,
} from './useFacilitator';
export type {
  CohortStats,
  FellowEngagement,
  ResourceCompletion,
} from './useFacilitator';
