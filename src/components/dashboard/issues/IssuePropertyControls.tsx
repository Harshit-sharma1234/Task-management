'use client';

import { useState, useEffect } from 'react';
import { useModalStore } from '@/lib/store/modal';
import {
  ChevronDown,
  FolderKanban
} from 'lucide-react';
import { IssueStatusSelector } from './IssueStatusSelector';
import { IssuePrioritySelector } from './IssuePrioritySelector';
import { IssueAssigneeSelector } from './IssueAssigneeSelector';
import { IssueReviewerSelector } from './IssueReviewerSelector';

interface IssuePropertyControlsProps {
  ticketId: string;
  initialStatus: string;
  initialPriority: string;
  initialAssigneeId: string | null;
  initialReviewerId: string | null;
  currentUserId: string;
  projectName: string;
  projectId?: string;
  issueTitle?: string;
  users: { id: string, name: string, avatar_url?: string | null }[];
  currentUser?: any;
}

export function IssuePropertyControls({
  ticketId,
  initialStatus,
  initialPriority,
  initialAssigneeId,
  initialReviewerId,
  currentUserId,
  projectName,
  projectId,
  issueTitle,
  users,
  currentUser
}: IssuePropertyControlsProps) {
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId || '');
  const [reviewerId, setReviewerId] = useState(initialReviewerId || '');
  
  useEffect(() => {
    setStatus(initialStatus);
    setPriority(initialPriority);
    setAssigneeId(initialAssigneeId || '');
    setReviewerId(initialReviewerId || '');
  }, [initialStatus, initialPriority, initialAssigneeId, initialReviewerId]);

  const { setActiveTicket, setActiveProject } = useModalStore();

  // Set active context for shortcuts on this page
  useEffect(() => {
    setActiveTicket({ 
      id: ticketId, 
      title: issueTitle, 
      status, 
      priority, 
      assignee_id: assigneeId, 
      reviewer_id: reviewerId,
      projects: { id: projectId || '', project_name: projectName } // Full project context
    });
    setActiveProject({ id: projectId || '', project_name: projectName });
  }, [ticketId, issueTitle, status, priority, assigneeId, reviewerId, projectName, projectId, setActiveTicket, setActiveProject]);

  const [isPropertiesOpen, setIsPropertiesOpen] = useState(true);
  const [isProjectOpen, setIsProjectOpen] = useState(true);

  return (
    <div className="space-y-4">
      {/* Properties Section */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
        <div 
          className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
          onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
        >
          <span>Properties</span>
          <ChevronDown 
            size={12} 
            className={`text-gray-400 transition-transform ${isPropertiesOpen ? '' : '-rotate-90'}`} 
          />
        </div>
        
        {isPropertiesOpen && (
          <div className="flex flex-col py-1">
            {/* Status */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Status</span>
                <div className="flex-1">
                  <IssueStatusSelector 
                    issueId={ticketId}
                    currentStatus={status}
                    currentUser={currentUser}
                    assigneeId={assigneeId}
                    reviewerId={reviewerId}
                    projectName={projectName}
                    issueTitle={issueTitle}
                  />
                </div>
              </div>
            </div>

            {/* Priority */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Priority</span>
                <div className="flex-1">
                  <IssuePrioritySelector 
                    issueId={ticketId}
                    currentPriority={priority}
                    currentUser={currentUser}
                    assigneeId={assigneeId}
                    reviewerId={reviewerId}
                    projectName={projectName}
                    issueTitle={issueTitle}
                  />
                </div>
              </div>
            </div>

            {/* Assignee */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Assignee</span>
                <div className="flex-1">
                  <IssueAssigneeSelector 
                    issueId={ticketId}
                    currentAssigneeId={assigneeId}
                    currentAssignee={users.find(u => u.id === assigneeId) || null}
                    users={users as any}
                    currentUser={currentUser}
                    reviewerId={reviewerId}
                    projectName={projectName}
                    issueTitle={issueTitle}
                  />
                </div>
              </div>
            </div>

            {/* Reviewer */}
            <div className="px-1 py-0.5 group">
              <div className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors">
                <span className="text-[11px] font-medium text-gray-400 w-16 shrink-0">Reviewer</span>
                <div className="flex-1">
                  <IssueReviewerSelector 
                    issueId={ticketId}
                    currentReviewerId={reviewerId}
                    assigneeId={assigneeId}
                    currentReviewer={users.find(u => u.id === reviewerId) || null}
                    users={users as any}
                    currentUser={currentUser}
                    projectName={projectName}
                    issueTitle={issueTitle}
                  />
                </div>
              </div>
            </div>
            </div>
        )}
      </div>


      {/* Project Section */}
      <div className="border border-gray-100 rounded-xl bg-white shadow-sm pb-1">
        <div 
          className="px-3 py-2.5 flex items-center justify-between text-xs font-semibold text-gray-700 bg-gray-50/50 hover:bg-gray-50 cursor-pointer transition-colors border-b border-gray-100 rounded-t-xl"
          onClick={() => setIsProjectOpen(!isProjectOpen)}
        >
          <span>Project</span>
          <ChevronDown 
            size={12} 
            className={`text-gray-400 transition-transform ${isProjectOpen ? '' : '-rotate-90'}`} 
          />
        </div>
        {isProjectOpen && (
          <div className="p-2">
            <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer text-gray-700">
              <FolderKanban size={13} className="text-gray-400 shrink-0" />
              <span className="text-[12px] font-medium tracking-tight">{projectName}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
