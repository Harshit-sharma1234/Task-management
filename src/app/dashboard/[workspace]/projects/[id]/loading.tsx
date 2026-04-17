import { IssueListSkeleton } from '@/components/dashboard/issues/IssueListSkeleton';
import { ProjectOverviewSkeleton } from '@/components/dashboard/ProjectOverviewSkeleton';

export default function LoadingProjectDetail() {
  return (
    <div className="bg-[#fbfbfb] min-h-full">
      <div className="hidden">{/* Keep both skeletons mounted for tab parity */}</div>
      <ProjectOverviewSkeleton />
      <div className="p-8">
        <IssueListSkeleton />
      </div>
    </div>
  );
}
