'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Loader2, Eye, EyeOff, User, Mail, Lock, BadgeCheck } from 'lucide-react';

interface InviteSignupFormProps {
  token: string;
  inviteEmail: string;
  workspaceName: string;
}

function getRolePath(roleName: string): string {
  switch (roleName) {
    case 'Admin': return 'admin';
    case 'Project Manager': return 'project-manager';
    case 'Senior Developer': return 'senior-developer';
    case 'Junior Developer': return 'junior-developer';
    default: return 'junior-developer';
  }
}

export default function InviteSignupForm({ token, inviteEmail, workspaceName }: InviteSignupFormProps) {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [accountExists, setAccountExists] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    employeeId: '',
    email: inviteEmail,
    password: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    } else if (formData.email.toLowerCase() !== inviteEmail.toLowerCase()) {
      newErrors.email = 'Email must match the invite email';
    }

    if (!formData.employeeId.trim()) {
      newErrors.employeeId = 'Employee ID is required';
    } else if (formData.employeeId.trim().length < 2) {
      newErrors.employeeId = 'Employee ID must be at least 2 characters';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();

      // Step 1: Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          }
        }
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          setErrors({ email: 'An account with this email already exists. Please log in instead.' });
          setAccountExists(true);
        } else {
          toast.error(authError.message);
        }
        return;
      }

      // Step 2: Create user profile in our system
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_id: authData.user.id,
            name: formData.name,
            email: formData.email.toLowerCase(),
            employee_id: formData.employeeId.trim(),
            avatar_url: null,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          toast.error('Failed to create user profile. Please try again.');
          return;
        }

        toast.success('Account created successfully! Accepting invite...');

        // Step 3: Accept the workspace invite
        const response = await fetch('/api/accept-invite', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            userId: authData.user.id,
          }),
        });

        const result = await response.json();

        if (result.error) {
          toast.error('Account created but failed to accept invite. Please try again from your dashboard.');
          window.location.href = '/workspace';
        } else {
          toast.success(`Successfully joined ${workspaceName}!`);
          const rolePath = getRolePath(result.roleName || 'Junior Developer');
          window.location.href = `/dashboard/${result.workspaceSlug}/${rolePath}`;
        }
      } else {
        // Email confirmation required
        toast.success('Account created! Please check your email to confirm your account, then you can accept the invite.');
        router.push(`/login?next=/invite/${token}`);
      }

    } catch (error) {
      console.error('Signup error:', error);
      toast.error('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}`,
      },
    });
  };

  const handleMicrosoftSignup = () => {
    const supabase = createClient();
    supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/invite/${token}`,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-linear-text)] mb-2">
          Full Name
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
            <User size={16} />
          </div>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="John Doe"
            className={`w-full pl-10 pr-3 py-2.5 bg-[var(--color-linear-bg)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] transition-colors ${
              errors.name ? 'border-red-500' : 'border-[var(--color-linear-border)]'
            }`}
            disabled={isLoading}
          />
        </div>
        {errors.name && (
          <p className="mt-1 text-xs text-red-500">{errors.name}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-linear-text)] mb-2">
          Employee ID
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
            <BadgeCheck size={16} />
          </div>
          <input
            type="text"
            name="employeeId"
            value={formData.employeeId}
            onChange={handleInputChange}
            placeholder="EMP-001"
            className={`w-full pl-10 pr-3 py-2.5 bg-[var(--color-linear-bg)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] transition-colors ${
              errors.employeeId ? 'border-red-500' : 'border-[var(--color-linear-border)]'
            }`}
            disabled={isLoading}
          />
        </div>
        {errors.employeeId && (
          <p className="mt-1 text-xs text-red-500">{errors.employeeId}</p>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-linear-text)] mb-2">
          Email Address
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
            <Mail size={16} />
          </div>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="john@company.com"
            className={`w-full pl-10 pr-3 py-2.5 bg-[var(--color-linear-bg)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] transition-colors ${
              errors.email ? 'border-red-500' : 'border-[var(--color-linear-border)]'
            }`}
            disabled={isLoading}
            readOnly // Email is pre-filled from invite
          />
        </div>
        {errors.email && (
          <p className="mt-1 text-xs text-red-500">{errors.email}</p>
        )}
        <p className="mt-1 text-xs text-[var(--color-linear-muted)]">
          This email must match the invite email address
        </p>
      </div>

      {/* Password Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-linear-text)] mb-2">
          Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
            <Lock size={16} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            placeholder="Create a strong password"
            className={`w-full pl-10 pr-10 py-2.5 bg-[var(--color-linear-bg)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] transition-colors ${
              errors.password ? 'border-red-500' : 'border-[var(--color-linear-border)]'
            }`}
            disabled={isLoading}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-3 flex items-center text-[var(--color-linear-muted)] hover:text-[var(--color-linear-text)]"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && (
          <p className="mt-1 text-xs text-red-500">{errors.password}</p>
        )}
        <p className="mt-1 text-xs text-[var(--color-linear-muted)]">
          Must contain uppercase, lowercase, and numbers (min 8 chars)
        </p>
      </div>

      {/* Confirm Password Field */}
      <div>
        <label className="block text-sm font-medium text-[var(--color-linear-text)] mb-2">
          Confirm Password
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-[var(--color-linear-muted)]">
            <Lock size={16} />
          </div>
          <input
            type={showPassword ? 'text' : 'password'}
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            placeholder="Confirm your password"
            className={`w-full pl-10 pr-3 py-2.5 bg-[var(--color-linear-bg)] border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-linear-accent)]/20 focus:border-[var(--color-linear-accent)] transition-colors ${
              errors.confirmPassword ? 'border-red-500' : 'border-[var(--color-linear-border)]'
            }`}
            disabled={isLoading}
          />
        </div>
        {errors.confirmPassword && (
          <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2.5 bg-[var(--color-linear-accent)] text-white text-sm font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Creating Account...
          </>
        ) : (
          <>
            Create Account & Join Workspace
          </>
        )}
      </button>

      <div className="relative py-1">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--color-linear-border)] opacity-50"></div>
        </div>
        <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
          <span className="bg-[var(--color-linear-panel)] px-2 text-[var(--color-linear-muted)]">Or sign up with</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={isLoading}
          onClick={handleGoogleSignup}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
        <button
          type="button"
          disabled={isLoading}
          onClick={handleMicrosoftSignup}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 23 23">
            <path fill="#f35325" d="M1 1h10v10H1z"/>
            <path fill="#81bc06" d="M12 1h10v10H12z"/>
            <path fill="#05a6f0" d="M1 12h10v10H1z"/>
            <path fill="#ffba08" d="M12 12h10v10H12z"/>
          </svg>
          Microsoft
        </button>
      </div>

      {/* Terms */}
      <p className="text-xs text-[var(--color-linear-muted)] text-center">
        By creating an account, you agree to our{' '}
        <a href="/terms" className="text-[var(--color-linear-accent)] hover:underline">
          Terms of Service
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-[var(--color-linear-accent)] hover:underline">
          Privacy Policy
        </a>
      </p>

      {accountExists && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 text-xs space-y-2">
          <p>This email is already registered. Please log in to accept this invite.</p>
          <a
            href={`/login?next=/invite/${token}`}
            className="inline-block text-[var(--color-linear-accent)] hover:underline font-medium"
          >
            Go to login
          </a>
        </div>
      )}
    </form>
  );
}
