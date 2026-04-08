import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { ProjectDetailHeader } from '@/components/dashboard/ProjectDetailHeader';
import { ProjectSidebar } from '@/components/dashboard/ProjectSidebar';
import { getProjectDetails } from './data';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  const { project, projectError, users, members, profile } = await getProjectDetails(id, session.user.email!, session.user.id);

  if (projectError || !project) {
    console.error('Project fetch error:', projectError);
    return notFound();
  }

  const currentMemberIds = (members as { user_id: string }[] | null)?.map(m => m.user_id) || [];
  const userRole = profile?.roles?.role_name || null;

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 overflow-hidden">
      {/* Project Header (Breadcrumbs & Tabs) - Stable in Layout */}
      <ProjectDetailHeader projectName={project.project_name} projectId={id} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable Center Content (Where page.tsx will be) */}
        <div className="flex-1 overflow-y-auto border-r border-gray-100">
          {children}
        </div>

        {/* Fixed Right Sidebar - Stable in Layout */}
        <div className="w-80 hidden xl:block overflow-y-auto bg-[#fbfbfb]">
          <ProjectSidebar 
            project={project} 
            users={users || []} 
            currentMemberIds={currentMemberIds} 
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  );
}
