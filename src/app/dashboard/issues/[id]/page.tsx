import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import {
  CircleDot,
  Circle,
  CheckCircle2,
  CircleEllipsis,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  ChevronRight,
  Share2,
  Copy,
  Link as LinkIcon,
  MessageSquare,
  Clock,
  User,
  Tags,
  FolderKanban
} from 'lucide-react';
import { clsx } from 'clsx';
import Link from 'next/link';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CommentSection } from '@/components/dashboard/issues/CommentSection';
import { IssuePropertyControls } from '@/components/dashboard/issues/IssuePropertyControls';
import { PropertyInlineRow } from '@/components/dashboard/issues/PropertyInlineRow';
import { IssueHeaderActions } from '@/components/dashboard/issues/IssueHeaderActions';
import { getUserProfile } from '@/lib/roles';

// Status Icon Mapping
const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
  'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
  'backlog': { label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
  'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
  'cancelled': { label: 'Cancelled', icon: Circle, color: 'text-red-400' },
};

// Priority Icon Mapping
const priorityIcons: Record<string, any> = {
  'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
  'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
  'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
  'low': { label: 'Low', icon: SignalLow, color: 'text-indigo-500' },
  'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};

export default async function IssueDetailsPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all data in parallel to avoid waterfalls
  const [ticketResponse, commentsResponse, logsResponse, profile, allUsersResponse] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        *,
        projects (id, project_name),
        created_by_user: users!tickets_created_by_fkey (id, name, email),
        assigned_to_user: users!tickets_assignee_id_fkey (id, name, email)
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('comments')
      .select('*, users(id, name, email)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('logs')
      .select('*, users(id, name)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
    getUserProfile(supabase, user.email!),
    supabase
      .from('users')
      .select('id, name, avatar_url')
      .order('name')
  ]);

  const { data: ticket, error: ticketError } = ticketResponse;
  const { data: comments } = commentsResponse;
  const { data: logs } = logsResponse;
  const { data: allUsers } = allUsersResponse;

  if (ticketError || !ticket) {
    console.error('Error fetching ticket:', ticketError);
    return notFound();
  }

  // RBAC for deletion
  const canDelete = profile?.roles?.role_name === 'Admin' || profile?.roles?.role_name === 'Project Manager';

  // Merge comments and logs into a single activity feed
  const activity = [
    ...(comments || []).map(c => ({ ...c, type: 'comment' })),
    ...(logs || []).map(l => ({ ...l, type: 'log' }))
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const statusData = statusIcons[ticket.status] || statusIcons['to_do'];
  const StatusIcon = statusData.icon;
  const statusColor = statusData.color;
  const priorityData = priorityIcons[ticket.priority] || priorityIcons['no_priority'];
  const PriorityIcon = priorityData.icon;
  const priorityColor = priorityData.color;

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

            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed mb-10">
              <p className="whitespace-pre-wrap">
                {ticket.description || "No description provided."}
              </p>
            </div>
          </div>

          {/* Activity Section */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex justify-between items-center mb-8 border-b border-gray-100/60 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Activity</h3>
            </div>

            {/* Unified Activity Feed */}
            <div className="space-y-6 mb-10 pl-1">
              {activity.map((item: any) => (
                <div key={`${item.type}-${item.id}`} className="flex gap-3">
                  <div className="mt-0.5">
                    <UserAvatar
                      name={item.users?.name || 'User'}
                      size="sm"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[12px] font-bold text-gray-900">{item.users?.name}</span>
                      <span className="text-[11px] font-medium text-gray-400">
                        {item.type === 'comment' ? '' : `${item.message} · `}{new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {item.type === 'comment' && (
                      <div className="text-[13px] text-gray-700 leading-snug">
                        {item.comment}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Reply Section */}
            <CommentSection
              ticketId={id}
              comments={[]}
              currentUser={{
                name: profile?.name || 'Anonymous',
                email: user.email || '',
                avatar_url: profile?.avatar_url || null
              }}
              hideList={true}
            />
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
            projectName={ticket.projects?.project_name || 'N/A'}
            dueDate={ticket.due_date || null}
            users={allUsers || []}
          />
        </div>
      </div>
    </div>
  );
}
