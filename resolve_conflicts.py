import sys
import re

def resolve_file(filepath, keep_side):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Simple regex to find conflict blocks
    pattern = re.compile(r'<<<<<<< HEAD\n(.*?)\n=======\n(.*?)\n>>>>>>> origin/staging\n', re.DOTALL)
    
    def repl(match):
        head_content = match.group(1)
        theirs_content = match.group(2)
        if keep_side == 'head':
            return head_content + '\n'
        elif keep_side == 'theirs':
            return theirs_content + '\n'
        elif keep_side == 'both':
            return head_content + '\n' + theirs_content + '\n'
        else:
            return ""

    resolved_content = pattern.sub(repl, content)
    
    with open(filepath, 'w') as f:
        f.write(resolved_content)

resolve_file('next.config.mjs', 'theirs')
resolve_file('src/app/dashboard/[workspace]/issues/[id]/page.tsx', 'head')
resolve_file('src/app/dashboard/[workspace]/issues/page.tsx', 'head')
resolve_file('src/app/dashboard/[workspace]/settings/SettingsTabs.tsx', 'theirs')
resolve_file('src/app/dashboard/[workspace]/settings/actions.ts', 'theirs')
resolve_file('src/app/dashboard/[workspace]/team/actions.ts', 'head')
resolve_file('src/app/login/ForgotPasswordFlow.tsx', 'theirs')
resolve_file('src/app/login/forgot-password-actions.ts', 'theirs')
resolve_file('src/components/dashboard/DeleteMemberModal.tsx', 'head')
resolve_file('src/components/dashboard/TeamList.tsx', 'head')
resolve_file('src/lib/cache.ts', 'head')
resolve_file('src/lib/email-templates.ts', 'head')

print("Resolved files via script.")
