'use client';

// ============================================
// TrimedCast LEAN — Login / Signup view
// The entry point for unauthenticated users.
// Toggles between login form and signup form.
// ============================================

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, TrendingUp, Mail, Phone, Building2, Lock, User } from 'lucide-react';

type Mode = 'login' | 'signup';

export function AuthView() {
  const setUser = useAuthStore((s) => s.setUser);
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);

  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Signup fields
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [signupPassword, setSignupPassword] = useState('');

  const handleLogin = useCallback(async () => {
    if (!email || !password) {
      toast.error('Missing fields', { description: 'Email and password are required.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Login failed', { description: json.error || 'Unknown error' });
        return;
      }
      setUser(json.user);
      toast.success('Welcome back!', { description: json.user.businessName });
    } catch (e) {
      toast.error('Login failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setLoading(false); }
  }, [email, password, setUser]);

  const handleSignup = useCallback(async () => {
    if (!signupEmail || !signupPhone || !businessName || !signupPassword) {
      toast.error('Missing fields', { description: 'All fields are required.' });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail,
          phone: signupPhone,
          businessName,
          password: signupPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Signup failed', { description: json.error || 'Unknown error' });
        return;
      }
      setUser(json.user);
      toast.success('Account created!', { description: `Welcome, ${json.user.businessName}!` });
    } catch (e) {
      toast.error('Signup failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setLoading(false); }
  }, [signupEmail, signupPhone, businessName, signupPassword, setUser]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-muted/30 to-primary/5 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo + title */}
        <div className="text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl mb-3">
            T
          </div>
          <h1 className="text-2xl font-bold">TrimedCast</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Session-wise demand & order planning for BD motorcycle-parts importers
          </p>
        </div>

        {/* Tab toggle */}
        <div className="flex rounded-lg border p-1 bg-muted/30">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'login' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === 'signup' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Login form */}
        {mode === 'login' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Welcome Back</CardTitle>
              <CardDescription>Login with your email and password</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }} />
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
                Login
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="text-primary font-medium hover:underline">Sign up</button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Signup form */}
        {mode === 'signup' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Create Your Account</CardTitle>
              <CardDescription>Sign up with your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="business" className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Business Name</Label>
                <Input id="business" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Rahim Auto Parts" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-email" className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                <Input id="signup-email" type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="you@business.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                <Input id="phone" type="tel" value={signupPhone} onChange={(e) => setSignupPhone(e.target.value)}
                  placeholder="01XXXXXXXXX" />
                <p className="text-[10px] text-muted-foreground">BD format: 01XXXXXXXXX or +8801XXXXXXXXX</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="signup-password" className="flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Password</Label>
                <Input id="signup-password" type="password" value={signupPassword} onChange={(e) => setSignupPassword(e.target.value)}
                  placeholder="At least 6 characters" />
              </div>
              <Button onClick={handleSignup} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <User className="h-4 w-4 mr-2" />}
                Create Account
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="text-primary font-medium hover:underline">Login</button>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Footer note */}
        <p className="text-center text-[11px] text-muted-foreground">
          🔒 Your data is stored securely. One account per email and phone number.
        </p>
      </div>
    </div>
  );
}
