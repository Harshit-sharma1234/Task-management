import { IssueListSkeleton } from "@/components/dashboard/issues/IssueListSkeleton";

/**
 * Route-level loading state for the Issues dashboard.
 * This ensures the grouped list skeleton is rendered instantly in the initial HTML
 * response from the server, satisfying the "pre-hydration" requirement and matching
 * the Projects tab's premium loading flow.
 */
export default function Loading() {
  return <IssueListSkeleton />;
}
