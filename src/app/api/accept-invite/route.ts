import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { token, userId } = await request.json();

    if (!token || !userId) {
      return NextResponse.json(
        { error: 'Token and user ID are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Validate the token
    const { data: invite, error: inviteError } = await adminClient
      .from('workspace_invites')
      .select('*, workspaces(name, slug), roles(role_name)')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    if (inviteError || !invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 400 }
      );
    }

    // Get user profile
    const { data: userProfile, error: userError } = await adminClient
      .from('users')
      .select('id, email')
      .eq('auth_id', userId)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if email matches
    if (userProfile.email.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invite email' },
        { status: 400 }
      );
    }

    // Add user to workspace members
    const { error: memberError } = await adminClient
      .from('workspace_members')
      .insert({
        workspace_id: invite.workspace_id,
        user_id: userProfile.id,
        role_id: invite.role_id,
        joined_at: new Date().toISOString(),
      });

    if (memberError) {
      console.error('Member addition error:', memberError);
      return NextResponse.json(
        { error: 'Failed to add user to workspace' },
        { status: 500 }
      );
    }

    // Mark invite as accepted
    const { error: updateError } = await adminClient
      .from('workspace_invites')
      .update({ 
        status: 'accepted', 
        accepted_at: new Date().toISOString(),
        accepted_by: userProfile.id
      })
      .eq('id', invite.id);

    if (updateError) {
      console.error('Invite update error:', updateError);
      // Don't fail the whole operation if just the update fails
    }

    return NextResponse.json({
      success: true,
      workspaceName: (invite as any).workspaces?.name,
      workspaceSlug: (invite as any).workspaces?.slug,
      roleName: (invite as any).roles?.role_name,
    });

  } catch (error) {
    console.error('Accept invite error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
