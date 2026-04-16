import { ProjectSkeleton } from "@/components/dashboard/ProjectSkeleton";

/**
 * Route-level loading state for the Projects dashboard.
 * This ensures the table skeleton is rendered instantly in the initial HTML
 * response from the server, satisfying the "before page content loads" requirement.
 */
export default function Loading() {
  return <ProjectSkeleton />;
}
