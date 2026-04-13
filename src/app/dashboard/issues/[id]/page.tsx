import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Paperclip, FileIcon } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/dashboard/issues/CommentSection';
import { IssuePropertyControls } from '@/components/dashboard/issues/IssuePropertyControls';
import { IssueHeaderActions } from '@/components/dashboard/issues/IssueHeaderActions';
import { EditableIssueContent } from '@/components/dashboard/issues/EditableIssueContent';
import { getCachedUserProfile, getCachedUsers } from '@/lib/cache';
import { IssueActivitySkeleton } from '@/components/dashboard/issues/IssueActivitySkeleton';

async function IssueActivitySection({
  ticketId,
  currentUser,
}: {
  ticketId: string;
  currentUser: { id: string; name: string; email: string; avatar_url: string | null };
}) {
  const supabase = await createClient();

  const [commentsResponse, logsResponse] = await Promise.all([
    supabase
      .from('comments')
      .select('id, comment, created_at, user_id, users(id, name, email, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
    supabase
      .from('logs')
      .select('id, action_type, message, created_at, users(id, name, avatar_url)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true }),
  ]);

  // Supabase join shape can come back as `users: [...]` (array) depending on the relationship.
  // `CommentSection` expects `users` to be a single object for `initialComments`/`initialLogs`.
  const normalizedComments = (commentsResponse.data || []).map((c: any) => {
    const users = Array.isArray(c.users) ? c.users[0] : c.users;
    return {
      ...c,
      users: users || { id: c.user_id, name: 'User', email: '', avatar_url: null },
    };
  });

  const normalizedLogs = (logsResponse.data || []).map((l: any) => {
    const users = Array.isArray(l.users) ? l.users[0] : l.users;
    return {
      ...l,
      users: users || { id: undefined, name: 'Unknown', avatar_url: null },
    };
  });

  return (
    <CommentSection
      ticketId={ticketId}
      initialComments={normalizedComments as any}
      initialLogs={normalizedLogs as any}
      currentUser={currentUser}
    />
  );
}

export default async function IssueDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

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
        due_date,
        attachments,
        projects (id, project_name)
      `)
      .eq('id', id)
      .single(),
    getCachedUserProfile(user.email!),
    getCachedUsers()
  ]);

  const { data: ticket, error: ticketError } = ticketResponse;

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    return notFound();
  }

  const ticketProjectName = Array.isArray((ticket as any).projects)
    ? (ticket as any).projects?.[0]?.project_name
    : (ticket as any).projects?.project_name;

  // RBAC for deletion and editing
  const canDelete = profile?.roles?.role_name === 'Admin' || profile?.roles?.role_name === 'Project Manager';
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
          <Link href="/dashboard/issues" className="text-gray-500 hover:text-gray-900 transition-colors">Issues</Link>
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
            dueDate={ticket.due_date || null}
            users={allUsers || []}
          />
        </div>
      </div>
    </div>
  );
}
