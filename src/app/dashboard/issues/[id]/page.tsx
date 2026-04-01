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
import { DeleteIssueButton } from '@/components/dashboard/issues/DeleteIssueButton';
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
      .select('id, name')
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
        <div className="flex items-center gap-2">
          {canDelete && <DeleteIssueButton id={id} />}
          <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-md transition-colors" title="Copy Link">
            <LinkIcon size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-md transition-colors" title="Share">
            <Share2 size={16} />
          </button>
          <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-md transition-colors">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-10 max-w-4xl border-r border-gray-100">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">{ticket.title}</h1>
            
            <div className="prose prose-sm max-w-none text-gray-700 leading-relaxed">
              <p className="whitespace-pre-wrap">
                {ticket.description || "No description provided."}
              </p>
            </div>

            <PropertyInlineRow 
              ticketId={id}
              initialStatus={ticket.status}
              initialPriority={ticket.priority}
              initialAssigneeId={ticket.assignee_id}
              projectName={ticket.projects?.project_name || 'N/A'}
              users={allUsers || []}
              currentUserId={profile?.id || ''}
              reviewerId={ticket.reviewer_id}
            />
          </div>

          {/* Activity Section */}
          <div className="mt-16 pt-8 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-8 font-semibold text-gray-500">
              <MessageSquare size={16} />
              <span>Activity</span>
            </div>

              {/* Unified Activity Feed */}
              <div className="space-y-6 mb-10">
                {activity.map((item: any) => (
                  <div key={`${item.type}-${item.id}`} className="flex gap-4">
                    <UserAvatar
                      name={item.users?.name || 'User'}
                      size="md"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-gray-900">{item.users?.name}</span>
                        <span className="text-xs text-gray-400">
                          {item.type === 'comment' ? 'commented' : item.message} • {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      {item.type === 'comment' && (
                        <div className="text-sm text-gray-700 bg-gray-50/50 rounded-lg p-3 border border-gray-100/50">
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
                  email: user.email || ''
                }}
                hideList={true}
              />
            </div>
          </div>

        <div className="w-72 bg-white flex flex-col p-6 overflow-y-auto border-l border-gray-100">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-6">Properties</h3>
          
          <IssuePropertyControls 
            ticketId={id}
            initialStatus={ticket.status}
            initialPriority={ticket.priority}
            initialAssigneeId={ticket.assignee_id}
            initialReviewerId={ticket.reviewer_id}
            currentUserId={profile?.id || ''}
            users={allUsers || []}
          />

          <div className="mt-8 space-y-6">
            {/* Project */}
            <div className="flex flex-col gap-2 pt-6 border-t border-gray-50">
              <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                <FolderKanban size={12} />
                Project
              </span>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-gray-50 transition-colors cursor-pointer text-gray-700">
                <div className="w-2 h-2 rounded-full bg-indigo-500" />
                <span className="text-sm font-medium truncate">{ticket.projects?.project_name}</span>
              </div>
            </div>

            {/* Due Date */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-2">
                <Clock size={12} />
                Due Date
              </span>
              <div className="text-sm font-medium text-gray-600 px-3">
                {ticket.due_date ? new Date(ticket.due_date).toLocaleDateString(undefined, { dateStyle: 'long' }) : 'No due date'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
