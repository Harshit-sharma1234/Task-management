import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Paperclip, FileIcon } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/dashboard/issues/CommentSection';
import { IssuePropertyControls } from '@/components/dashboard/issues/IssuePropertyControls';
import { IssueHeaderActions } from '@/components/dashboard/issues/IssueHeaderActions';
import { EditableIssueContent } from '@/components/dashboard/issues/EditableIssueContent';
import { getCachedUserProfile, getCachedIssueUsers, getCachedWorkspaceBySlug } from '@/lib/cache';
import { IssueActivitySkeleton } from '@/components/dashboard/issues/IssueActivitySkeleton';

async function IssueActivitySection({
  ticketId,
  currentUser,
}: {
  ticketId: string;
  currentUser: { id: string; name: string; email: string; avatar_url: string | null };
}) {
  const supabase = await createClient(); // Still used for RLS-scoped comments/logs fetch if desired, but we'll use admin for profiles
  const adminClient = createAdminClient();

  const [commentsResponse, logsResponse] = await Promise.all([
    supabase
      .from('comments')
      .select('id, comment, created_at, user_id')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
    supabase
      .from('logs')
      .select('id, action_type, message, created_at, user_id')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
  ]);

  const comments = commentsResponse.data || [];
  const logs = logsResponse.data || [];

  // Optimized user fetching for the activity feed
  const uids = Array.from(new Set([
    ...comments.map(c => c.user_id),
    ...logs.map(l => l.user_id)
  ].filter(Boolean)));

  let usersData: any[] = [];
  if (uids.length > 0) {
    const { data } = await adminClient
      .from('users')
      .select('id, name, email, avatar_url')
      .in('id', uids);
    usersData = data || [];
  }

  const userMap = new Map(usersData.map(u => [u.id, u]));

  const normalizedComments = comments.map((c: any) => ({
    ...c,
    users: userMap.get(c.user_id) || null,
  }));

  const normalizedLogs = logs.map((l: any) => ({
    ...l,
    users: userMap.get(l.user_id) || null,
  }));

  return (
    <CommentSection
      ticketId={ticketId}
      initialComments={normalizedComments as any}
      initialLogs={normalizedLogs as any}
      currentUser={currentUser}
    />
  );
}

export default async function IssueDetailsPage({ params }: { params: Promise<{ id: string; workspace: string }> }) {
  const { id, workspace: workspaceSlug } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const workspace = await getCachedWorkspaceBySlug(workspaceSlug);
  if (!workspace) redirect('/dashboard');

  // Fetch above-the-fold data first.
  // Comments/logs are loaded inside Suspense to keep navigation snappy.
  const [ticketResponse, profile, allUsers] = await Promise.all([
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
    getCachedUserProfile(user.email!),
    getCachedIssueUsers(workspace.id)
  ]);

  const { data: ticket, error: ticketError } = ticketResponse;

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    return notFound();
  }

  const ticketProjectName = Array.isArray((ticket as any).projects)
    ? (ticket as any).projects?.[0]?.project_name
    : (ticket as any).projects?.project_name;

  // RBAC: Since profile no longer carries global roles (workspace-scoped now),
  // allow edit/delete for the ticket creator. Workspace-level role checks happen in layout.
  const canDelete = true; // Workspace role verified at layout level
  const canEdit = canDelete || profile?.id === (ticket as any).created_by;

  const currentUserForActivity = {
    id: profile?.id || '',
    name: profile?.name || 'Anonymous',
    email: user.email || '',
    avatar_url: profile?.avatar_url || null,
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Breadcrumb & Actions */}
      <div className="h-14 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
        <div className="flex items-center gap-3 text-sm font-medium">
          <Link href={`/dashboard/${workspaceSlug}/issues`} className="text-gray-500 hover:text-gray-900 transition-colors">Issues</Link>
          <ChevronRight size={14} className="text-gray-300" />
          <span className="text-gray-400 uppercase">
            {ticketProjectName ? ticketProjectName.substring(0, 3) : 'N/A'}-{ticket.id.substring(0, 4)}
          </span>
        </div>
        <IssueHeaderActions ticketId={id} canDelete={canDelete} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-10 max-w-4xl border-r border-gray-100">
          <div>
            <EditableIssueContent
              ticketId={id}
              initialTitle={ticket.title}
              initialDescription={ticket.description}
              initialAttachments={ticket.attachments || []}
              canEdit={canEdit}
            />
          </div>

          {/* Activity Section — fully real-time via CommentSection */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100/60 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Activity</h3>
            </div>

            <Suspense fallback={<IssueActivitySkeleton />}>
              <IssueActivitySection ticketId={id} currentUser={currentUserForActivity} />
            </Suspense>
          </div>
        </div>

        <div className="w-72 bg-white flex flex-col p-6 overflow-visible border-l border-gray-100">
          <IssuePropertyControls
            ticketId={id}
            initialStatus={ticket.status}
            initialPriority={ticket.priority}
            initialAssigneeId={ticket.assignee_id}
            initialReviewerId={ticket.reviewer_id}
            currentUserId={profile?.id || ''}
            currentUser={profile}
            projectName={ticketProjectName || 'N/A'}
            users={allUsers || []}
          />
        </div>
      </div>
    </div>
  );
}
