'use client';

// ============================================
// TrimedCast - Login Form Component
// Login with AC-ID + email + password
// With remember me and forgot password
// ============================================

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Lock,
  Shield,
} from 'lucide-react';

interface LoginFormProps {
  onForgotPassword: () => void;
}

export function LoginForm({ onForgotPassword }: LoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Form fields
  const [acId, setAcId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Get redirect URL from search params
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  // --- Submit login ---
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side validation
    const errors: Record<string, string> = {};
    if (!acId.trim()) errors.ac_id = 'AC-ID is required';
    else if (!/^TC-\d{4}-[A-Z]{3}-\d{4}$/.test(acId.trim())) errors.ac_id = 'Format: TC-2025-DHK-0001';
    if (!email.trim()) errors.email = 'Email is required';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ac_id: acId.trim().toUpperCase(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          const apiErrors: Record<string, string> = {};
          for (const err of data.errors) {
            if (err.field === 'ac_id') apiErrors.ac_id = err.message;
            if (err.field === 'email') apiErrors.email = err.message;
            if (err.field === 'password') apiErrors.password = err.message;
          }
          setFieldErrors(apiErrors);
        } else if (data.code === 'UNAUTHORIZED') {
          setError(data.message || 'Invalid credentials');
        } else if (data.code === 'FORBIDDEN') {
          setError(data.message || 'Account is deactivated');
        } else {
          setError(data.message || 'Login failed');
        }
        return;
      }

      // Success — set session cookie
      if (data.data?.token) {
        const maxAge = rememberMe ? 30 * 24 * 60 * 60 : 24 * 60 * 60; // 30 days or 1 day
        document.cookie = `trimedcast-session=${data.data.token}; path=/; max-age=${maxAge}; samesite=lax`;
      }

      // Store AC-ID for convenience if remember me
      if (rememberMe && acId.trim()) {
        try {
          localStorage.setItem('trimedcast-last-acid', acId.trim().toUpperCase());
        } catch {
          // Ignore storage errors
        }
      }

      // Redirect
      router.push(redirectTo);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('[Login] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [acId, email, password, rememberMe, redirectTo, router]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back
        </h1>
        <p className="text-muted-foreground mt-1">
          আবার স্বাগতম
        </p>
      </div>

      {/* Global error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-sm text-rose-600 dark:text-rose-400"
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* AC-ID */}
        <div className="space-y-2">
          <Label htmlFor="acId" className="text-sm font-medium">
            Account ID (AC-ID) <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="acId"
              type="text"
              placeholder="TC-2025-DHK-0001"
              value={acId}
              onChange={(e) => {
                setAcId(e.target.value.toUpperCase());
                if (fieldErrors.ac_id) setFieldErrors(prev => ({ ...prev, ac_id: '' }));
              }}
              className={`pl-10 h-11 font-mono tracking-wider ${fieldErrors.ac_id ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
              disabled={isLoading}
              autoComplete="username"
            />
          </div>
          {fieldErrors.ac_id && (
            <p className="text-xs text-rose-500">{fieldErrors.ac_id}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Your team&apos;s unique account identifier
          </p>
        </div>

        {/* Email */}
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium">
            Your Email <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder="rahman@gmail.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
              }}
              className={`pl-10 h-11 ${fieldErrors.email ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
              disabled={isLoading}
              autoComplete="email"
            />
          </div>
          {fieldErrors.email && (
            <p className="text-xs text-rose-500">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            Password <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }));
              }}
              className={`pl-10 pr-10 h-11 ${fieldErrors.password ? 'border-rose-500 focus-visible:border-rose-500' : ''}`}
              disabled={isLoading}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="text-xs text-rose-500">{fieldErrors.password}</p>
          )}
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked === true)}
              disabled={isLoading}
              className="border-emerald-500/30 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <Label
              htmlFor="remember"
              className="text-sm text-muted-foreground cursor-pointer select-none"
            >
              Remember me
            </Label>
          </div>
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-emerald-500 hover:text-emerald-600 transition-colors font-medium"
          >
            Forgot password?
          </button>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-11 shadow-lg shadow-emerald-500/25 mt-2"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Logging in...
            </>
          ) : (
            <>
              Login
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>
      </form>

      {/* Signup link */}
      <p className="text-center text-sm text-muted-foreground mt-6">
        New to TrimedCast?{' '}
        <Link
          href="/signup"
          className="font-medium text-emerald-500 hover:text-emerald-600 transition-colors"
        >
          Create account
        </Link>
      </p>

      {/* Security note */}
      <div className="flex items-center justify-center gap-1.5 mt-4 text-xs text-muted-foreground">
        <Shield className="w-3 h-3" />
        <span>Protected by encrypted session</span>
      </div>
    </motion.div>
  );
}
