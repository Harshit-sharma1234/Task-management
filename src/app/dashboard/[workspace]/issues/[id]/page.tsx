import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/dashboard/issues/CommentSection';
import { IssuePropertyControls } from '@/components/dashboard/issues/IssuePropertyControls';
import { IssueHeaderActions } from '@/components/dashboard/issues/IssueHeaderActions';
import { EditableIssueContent } from '@/components/dashboard/issues/EditableIssueContent';
import { getCachedUserProfile, getCachedIssueUsers, getCachedWorkspaceBySlug, getCachedWorkspaceMember } from '@/lib/cache';
import { getServerUser } from '@/lib/auth-server';
import { IssueActivityLog } from '@/components/dashboard/issues/IssueActivityLog';

async function IssueCommentsSection({
  ticketId,
  currentUser,
  canComment,
}: {
  ticketId: string;
  currentUser: { id: string; name: string; email: string; avatar_url: string | null; roles?: any };
  canComment: boolean;
}) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: comments } = await supabase
    .from('comments')
    .select('id, comment, created_at, user_id, attachments')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  const validComments = comments || [];
  const uids = Array.from(new Set(validComments.map(c => c.user_id).filter(Boolean)));

  let usersData: any[] = [];
  if (uids.length > 0) {
    const { data } = await adminClient
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', uids);
    usersData = data || [];
  }

  const userMap = new Map(usersData.map(u => [u.id, u]));
  const normalizedComments = validComments.map((c: any) => ({
    ...c,
    users: userMap.get(c.user_id) || null,
  }));

  return (
    <CommentSection
      ticketId={ticketId}
      initialComments={normalizedComments as any}
      currentUser={currentUser}
      canComment={canComment}
    />
  );
}

async function IssueLogsSection({ ticketId }: { ticketId: string }) {
  const supabase = await createClient();
  const adminClient = createAdminClient();

  const { data: logs } = await supabase
    .from('logs')
    .select('id, action_type, message, created_at, user_id')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true });

  const validLogs = logs || [];
  const uids = Array.from(new Set(validLogs.map(l => l.user_id).filter(Boolean)));

  let usersData: any[] = [];
  if (uids.length > 0) {
    const { data } = await adminClient
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', uids);
    usersData = data || [];
  }

  const userMap = new Map(usersData.map(u => [u.id, u]));
  const normalizedLogs = validLogs.map((l: any) => ({
    ...l,
    users: userMap.get(l.user_id) || null,
  }));

  return <IssueActivityLog logs={normalizedLogs as any} />;
}

export default async function IssueDetailsPage({ params }: { params: Promise<{ id: string; workspace: string }> }) {
  const [user, resolvedParams] = await Promise.all([
    getServerUser(),
    params
  ]);

  if (!user) {
    redirect('/login');
  }

  const { id, workspace: workspaceSlug } = resolvedParams;
  const adminClient = createAdminClient();

  const [workspace, profileByAuthRes, supabase] = await Promise.all([
    getCachedWorkspaceBySlug(workspaceSlug),
    adminClient
      .from('users')
      .select('id, auth_id, email, name, employee_id, avatar_url')
      .eq('auth_id', user.id)
      .maybeSingle(),
    createClient()
  ]);

  if (!workspace) redirect('/dashboard');

  const profile = profileByAuthRes.data || await getCachedUserProfile(user.email!);

  const [ticketResponse, allUsers, member] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        id,
        title,
        description,
        status,
        priority,
        assignee_id,
        reviewer_id,
        created_by,
        created_at,
        attachments,
        projects (id, project_name)
      `)
      .eq('id', id)
      .single(),
    getCachedIssueUsers(workspace.id),
    profile?.id ? getCachedWorkspaceMember(workspace.id, profile.id) : Promise.resolve(null)
  ]);

  const { data: ticket, error: ticketError } = ticketResponse;

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    return notFound();
  }

  const ticketProjectName = Array.isArray((ticket as any).projects)
    ? (ticket as any).projects?.[0]?.project_name
    : (ticket as any).projects?.project_name;

  const userRole = (member?.roles as any)?.role_name;
  const isAdmin = userRole === 'Admin' || userRole === 'Project Manager';
  const isAssignee = profile?.id === ticket.assignee_id;
  const isReviewer = profile?.id === (ticket as any).reviewer_id;
  
  const canEdit = isAdmin || isAssignee || isReviewer;
  const canComment = true; 
  const canDelete = isAdmin;

  const currentUserForActivity = {
    id: profile?.id || '',
    name: profile?.name || 'Anonymous',
    email: user.email || '',
    avatar_url: profile?.avatar_url || null,
    roles: member?.roles || null,
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* Top Breadcrumb & Actions */}
      <div className="min-h-[3.5rem] flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-2 sm:py-0 border-b border-gray-100 bg-white gap-2">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href={`/dashboard/${workspaceSlug}/issues`} className="text-gray-500 hover:text-gray-900 transition-colors shrink-0">Issues</Link>
          <ChevronRight size={14} className="text-gray-300 shrink-0" />
          <span className="text-gray-400 uppercase truncate">
            {ticketProjectName ? ticketProjectName.substring(0, 3) : 'N/A'}-{ticket.id.substring(0, 4)}
          </span>
        </div>
        <div className="flex items-center justify-end">
          <IssueHeaderActions ticketId={id} canDelete={canDelete} />
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden no-scrollbar">
        {/* Main Content Area */}
        <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6 lg:p-10 w-full max-w-none lg:max-w-4xl lg:border-r border-gray-100">
          <div>
            <EditableIssueContent
              ticketId={id}
              initialTitle={ticket.title}
              initialDescription={ticket.description}
              initialAttachments={ticket.attachments || []}
              canEdit={canEdit}
            />
          </div>

          {/* Comments Section */}
          <div className="mt-10 sm:mt-16 pt-8 border-t border-gray-100">
            <div className="flex justify-between items-center mb-6 sm:mb-8 border-b border-gray-100/60 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Comments</h3>
            </div>

            <Suspense fallback={<div className="animate-pulse space-y-4"><div className="h-20 bg-gray-50 rounded-xl" /></div>}>
              <IssueCommentsSection ticketId={id} currentUser={currentUserForActivity} canComment={canComment} />
            </Suspense>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 bg-gray-50/30 lg:bg-white flex flex-col p-4 sm:p-6 border-t lg:border-t-0 lg:border-l border-gray-100 shrink-0 gap-6 lg:overflow-y-auto no-scrollbar">
          <IssuePropertyControls
            ticketId={id}
            initialStatus={ticket.status}
            initialPriority={ticket.priority}
            initialAssigneeId={ticket.assignee_id}
            initialReviewerId={ticket.reviewer_id}
            currentUserId={profile?.id || ''}
            currentUser={currentUserForActivity}
            projectName={ticketProjectName || 'N/A'}
            users={allUsers || []}
          />

          <Suspense fallback={<div className="h-40 bg-gray-50 rounded-xl animate-pulse" />}>
            <IssueLogsSection ticketId={id} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
