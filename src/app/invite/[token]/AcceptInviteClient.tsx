'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, UserCheck, Loader2, AlertCircle } from 'lucide-react';

interface InviteData {
  id: string;
  token: string;
  workspaceName: string;
  workspaceSlug: string;
  roleName: string;
  email: string;
}

function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin'
    case 'Project Manager': return 'project-manager'
    case 'Senior Developer': return 'senior-developer'
    case 'Junior Developer': return 'junior-developer'
    default: return 'junior-developer'
  }
}

export function AcceptInviteClient({ 
  invite, 
  emailMatch,
  userEmail 
}: { 
  invite: InviteData; 
  emailMatch: boolean;
  userEmail: string;
}) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoAcceptTriggeredRef = useRef(false);

  const handleAccept = useCallback(async () => {
    if (!emailMatch) return;
    
    setIsAccepting(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.set('token', invite.token);
      
      const { joinViaInvite } = await import('@/app/workspace/actions');
      const result = await joinViaInvite(null, formData);
      
      if (result?.error) {
        setError(result.error);
        setIsAccepting(false);
      } else {
        // Show success state before redirect
        setIsSuccess(true);
        setIsAccepting(false);
        
        // Redirect after a short delay to show success message
        setTimeout(() => {
          const rolePath = getRolePath(invite.roleName);
          window.location.href = `/dashboard/${invite.workspaceSlug}/${rolePath}`;
        }, 1500);
      }
    } catch (err) {
      setError('Failed to accept invite. Please try again.');
      setIsAccepting(false);
    }
  }, [emailMatch, invite.roleName, invite.token, invite.workspaceSlug]);

  useEffect(() => {
    if (!emailMatch || autoAcceptTriggeredRef.current) return;
    autoAcceptTriggeredRef.current = true;
    void handleAccept();
  }, [emailMatch, handleAccept]);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-[var(--color-linear-bg)] text-[var(--color-linear-text)] p-4">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="premium-card p-8 rounded-2xl text-center space-y-6">
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center transition-colors ${
            isSuccess ? 'bg-emerald-500/10' : 'bg-indigo-500/10'
          }`}>
            {isSuccess ? (
              <UserCheck size={32} className="text-emerald-600" />
            ) : (
              <Building2 size={32} className="text-indigo-600" />
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold mb-2">
              {isSuccess ? 'Welcome to the Team!' : 'You\'re Invited!'}
            </h1>
            <p className="text-sm text-[var(--color-linear-muted)]">
              {isSuccess ? (
                <>You've successfully joined <strong className="text-[var(--color-linear-text)]">{invite.workspaceName}</strong>. Redirecting to your workspace...</>
              ) : (
                <>You've been invited to join <strong className="text-[var(--color-linear-text)]">{invite.workspaceName}</strong> as a <strong className="text-[var(--color-linear-text)]">{invite.roleName}</strong>.</>
              )}
            </p>
          </div>

          {!emailMatch && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>
                This invite was sent to <strong>{invite.email}</strong>, but you're logged in as <strong>{userEmail}</strong>. 
                Please log in with the correct email to accept this invite.
              </span>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {!isSuccess && (
            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={isAccepting || !emailMatch}
                className="w-full py-3 px-4 bg-[var(--color-linear-accent)] hover:bg-[var(--color-linear-accent-hover)] text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAccepting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /><span>Joining...</span></>
                ) : (
                  <><UserCheck size={16} /><span>Accept & Join Workspace</span></>
                )}
              </button>

              <a
                href="/workspace"
                className="block w-full py-2.5 px-4 text-sm font-medium text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)] transition-colors text-center"
              >
                Go to my workspaces instead
              </a>
            </div>
          )}

          {isSuccess && (
            <div className="flex items-center justify-center gap-2 text-emerald-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Redirecting to workspace...</span>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
