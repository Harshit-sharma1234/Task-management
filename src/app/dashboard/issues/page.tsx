import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { 
  CircleDot, 
  Circle, 
  CheckCircle2, 
  CircleEllipsis,
  SignalHigh,
  SignalMedium,
  SignalLow,
  MoreHorizontal,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { IssuesHeader } from '@/components/dashboard/issues/IssuesHeader';

// Status Icon Mapping
const statusIcons: Record<string, any> = {
  'to_do': { label: 'Todo', icon: Circle, color: 'text-gray-400' },
  'in_progress': { label: 'In Progress', icon: CircleEllipsis, color: 'text-yellow-500' },
  'done': { label: 'Done', icon: CheckCircle2, color: 'text-indigo-500' },
  'backlog': { label: 'Backlog', icon: CircleDot, color: 'text-gray-400' },
  'review': { label: 'Review', icon: CircleEllipsis, color: 'text-orange-500' },
  'in_review': { label: 'In Review', icon: CircleEllipsis, color: 'text-orange-600' },
  'cancelled': { label: 'Cancelled', icon: X, color: 'text-red-400' },
};

// Priority Icon Mapping
const priorityIcons: Record<string, any> = {
  'urgent': { label: 'Urgent', icon: SignalHigh, color: 'text-red-600' },
  'high': { label: 'High', icon: SignalHigh, color: 'text-red-500' },
  'medium': { label: 'Medium', icon: SignalMedium, color: 'text-yellow-500' },
  'low': { label: 'Low', icon: SignalLow, color: 'text-blue-500' },
  'no_priority': { label: 'No priority', icon: MoreHorizontal, color: 'text-gray-400' },
};

export default async function IssuesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch data in parallel
  const [ticketsResponse, projectsResponse, usersResponse] = await Promise.all([
    supabase
      .from('tickets')
      .select('id, title, status, priority, created_at, assignee_id, project_id, projects(id, project_name)')
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('projects')
      .select('id, project_name')
      .order('project_name'),
    supabase
      .from('users')
      .select('id, name')
      .order('name')
  ]);

  const { data: tickets, error: ticketsError } = ticketsResponse;
  const { data: projectsData } = projectsResponse;
  const { data: usersData } = usersResponse;

  if (ticketsError) {
    console.error('Error fetching tickets:', ticketsError);
  }

  const projects = (projectsData || []).map(p => ({ id: p.id, name: p.project_name }));
  const users = usersData || [];

  // Group tickets by project
  const groupedTickets = (tickets || []).reduce((acc: any, ticket: any) => {
    const projectName = ticket.projects?.project_name || 'No Project';
    if (!acc[projectName]) {
      acc[projectName] = [];
    }
    acc[projectName].push(ticket);
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full bg-[#fbfbfb]">
      <IssuesHeader 
        totalIssues={tickets?.length || 0} 
        projects={projects}
        users={users}
      />

      {/* List Content */}
      <div className="flex-1 overflow-y-auto p-8 max-w-5xl">
        {Object.keys(groupedTickets).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CircleDot className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900">No issues found</h3>
            <p className="text-sm text-gray-500 mt-1">Get started by creating your first issue.</p>
          </div>
        ) : (
          Object.entries(groupedTickets).map(([projectName, projectTickets]: [string, any]) => (
            <div key={projectName} className="mb-8 last:mb-0">
              {/* Project Group Header */}
              <div className="flex items-center gap-3 mb-3 px-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">{projectName}</h2>
                </div>
                <span className="text-xs text-gray-400 font-medium">{projectTickets.length}</span>
              </div>

              {/* Issues List */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                {projectTickets.map((ticket: any, index: number) => {
                  const statusData = statusIcons[ticket.status] || statusIcons['to_do'];
                  const StatusIcon = statusData.icon;
                  const statusColor = statusData.color;
                  const priorityData = priorityIcons[ticket.priority] || priorityIcons['no_priority'];
                  const PriorityIcon = priorityData.icon;
                  const priorityColor = priorityData.color;

                  return (
                    <Link 
                      key={ticket.id} 
                      href={`/dashboard/issues/${ticket.id}`}
                      className={clsx(
                        "flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group",
                        index !== projectTickets.length - 1 && "border-b border-gray-100"
                      )}
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        {/* Status Icon */}
                        <div className={clsx("shrink-0", statusColor)}>
                          <StatusIcon size={18} strokeWidth={2.5} />
                        </div>
                        
                        {/* Issue Identifier & Title */}
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-xs font-medium text-gray-400 uppercase shrink-0">
                            {projectName.substring(0, 3)}-{ticket.id.substring(0, 4)}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {ticket.title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 shrink-0">
                        {/* Priority */}
                        <div className={clsx("flex items-center gap-1", priorityColor)} title={`Priority: ${ticket.priority}`}>
                          <PriorityIcon size={16} />
                        </div>

                        {/* Assignee / Info (Simplified) */}
                        <div className="flex items-center -space-x-1">
                          <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600 uppercase">
                            {ticket.assignee_id ? '?' : 'U'}
                          </div>
                        </div>

                        {/* Date */}
                        <span className="text-xs text-gray-400 font-medium">
                          {new Date(ticket.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
