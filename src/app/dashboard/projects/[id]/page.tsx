import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ProjectDetailHeader } from '@/components/dashboard/ProjectDetailHeader';
import { ProjectOverview } from '@/components/dashboard/ProjectOverview';
import { ProjectSidebar } from '@/components/dashboard/ProjectSidebar';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  // Fetch project details
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (projectError || !project) {
    console.error('Project fetch error:', projectError);
    return notFound();
  }

  // Fetch all users for selectors
  const { data: users } = await supabase
    .from('users')
    .select('id, name, email');

  // Fetch current project members
  const { data: members } = await supabase
    .from('project_members')
    .select('user_id')
    .eq('project_id', id);

  const currentMemberIds = members?.map(m => m.user_id) || [];

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 overflow-hidden">
      {/* Project Header (Breadcrumbs & Tabs) */}
      <ProjectDetailHeader projectName={project.project_name} />

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable Center Content */}
        <div className="flex-1 overflow-y-auto border-r border-gray-100">
          <ProjectOverview project={project} users={users || []} />
        </div>

        {/* Fixed Right Sidebar */}
        <div className="w-80 hidden xl:block overflow-y-auto bg-[#fbfbfb]">
          <ProjectSidebar 
            project={project} 
            users={users || []} 
            currentMemberIds={currentMemberIds} 
          />
        </div>
      </div>
    </div>
  );
}
