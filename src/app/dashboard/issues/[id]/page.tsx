import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import { ChevronRight, Paperclip, FileIcon } from 'lucide-react';
import Link from 'next/link';
import { CommentSection } from '@/components/dashboard/issues/CommentSection';
import { IssuePropertyControls } from '@/components/dashboard/issues/IssuePropertyControls';
import { IssueHeaderActions } from '@/components/dashboard/issues/IssueHeaderActions';
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

  return (
    <CommentSection
      ticketId={ticketId}
      initialComments={commentsResponse.data || []}
      initialLogs={logsResponse.data || []}
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
  const [ticketResponse, profile, allUsersResponse] = await Promise.all([
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
  const { data: allUsers } = allUsersResponse;

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    return notFound();
  }

  // RBAC for deletion
  const canDelete = profile?.roles?.role_name === 'Admin' || profile?.roles?.role_name === 'Project Manager';

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
          <span className="text-gray-400 uppercase">{ticket.projects?.project_name.substring(0, 3)}-{ticket.id.substring(0, 4)}</span>
        </div>
        <IssueHeaderActions ticketId={id} canDelete={canDelete} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-10 max-w-4xl border-r border-gray-100">
          <div className="mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{ticket.title}</h1>

            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-6">
              <p className="whitespace-pre-wrap">
                {ticket.description || "No description provided."}
              </p>
            </div>

            {/* Attachments Section */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100/60">
                <div className="flex items-center gap-2 mb-4">
                  <Paperclip size={16} className="text-gray-400" />
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Attachments ({ticket.attachments.length})</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticket.attachments.map((file: any, idx: number) => (
                    <a
                      key={idx}
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:bg-gray-50 hover:border-indigo-100 transition-all group/attachment bg-gray-50/30"
                    >
                      <div className="w-10 h-10 bg-white border border-gray-100 rounded-lg flex items-center justify-center text-indigo-500 group-hover/attachment:bg-indigo-50 group-hover/attachment:border-indigo-100 transition-all shadow-sm">
                        <FileIcon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-gray-900 truncate">{file.name}</div>
                        <div className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest">
                          {file.type ? file.type.split('/')[1]?.toUpperCase() : 'FILE'} · {(file.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
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
            projectName={ticket.projects?.project_name || 'N/A'}
            dueDate={ticket.due_date || null}
            users={allUsers || []}
          />
        </div>
      </div>
    </div>
  );
}
