'use client';
import { apiFetch } from '@/lib/api';

// ============================================
// CreativeCast — Login / Signup view
// Entry point for unauthenticated users.
// Features an animated forecast graph that draws itself.
// ============================================

import { useState, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, Mail, Phone, Building2, Lock, User, TrendingUp, TrendingDown, Sparkles } from 'lucide-react';

type Mode = 'login' | 'signup';

/** Animated SVG forecast graph — a line chart that draws itself. */
function AnimatedForecastGraph() {
  // Generate a smooth curve that looks like seasonal demand
  const points = [40, 55, 48, 62, 70, 58, 45, 38, 50, 68, 85, 75, 90, 82, 95];
  const w = 320;
  const h = 120;
  const padX = 10;
  const padY = 10;
  const stepX = (w - padX * 2) / (points.length - 1);
  const maxVal = Math.max(...points);

  const coords = points.map((v, i) => ({
    x: padX + i * stepX,
    y: h - padY - (v / maxVal) * (h - padY * 2),
  }));

  // Build smooth path using cubic bezier
  const linePath = coords
    .map((c, i) => {
      if (i === 0) return `M ${c.x} ${c.y}`;
      const prev = coords[i - 1];
      const cpX1 = prev.x + stepX * 0.4;
      const cpY1 = prev.y;
      const cpX2 = c.x - stepX * 0.4;
      const cpY2 = c.y;
      return `C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
    })
    .join(' ');

  // Confidence band (upper + lower offset by 15px)
  const upperPath = coords
    .map((c, i) => (i === 0 ? `M ${c.x} ${c.y - 12}` : `L ${c.x} ${c.y - 12}`))
    .join(' ');
  const lowerPath = coords
    .slice()
    .reverse()
    .map((c) => `L ${c.x} ${c.y + 12}`)
    .join(' ');
  const bandPath = `${upperPath} ${lowerPath} Z`;

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" style={{ maxHeight: '140px' }}>
        <defs>
          <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.15" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
            <stop offset="50%" stopColor="hsl(var(--primary))" stopOpacity="1" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((p) => (
          <line
            key={p}
            x1={padX}
            y1={padY + (h - padY * 2) * p}
            x2={w - padX}
            y2={padY + (h - padY * 2) * p}
            stroke="currentColor"
            className="text-muted-foreground/15"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
        ))}

        {/* Confidence band */}
        <path d={bandPath} fill="url(#bandGrad)" className="forecast-band" />

        {/* Forecast line — animated draw */}
        <path
          d={linePath}
          fill="none"
          stroke="url(#lineGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="forecast-line"
        />

        {/* Data points — appear one by one */}
        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r="3"
            className="fill-primary forecast-dot"
            style={{
              animationDelay: `${0.5 + i * 0.12}s`,
            }}
          />
        ))}

        {/* Trend arrow at the end */}
        <g className="forecast-arrow" transform={`translate(${coords[coords.length - 1].x + 8}, ${coords[coords.length - 1].y - 8})`}>
          <path d="M 0 6 L 8 0 L 6 6 L 8 12 Z" className="fill-primary" />
        </g>
      </svg>

      {/* Animated labels */}
      <div className="absolute top-2 left-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <TrendingUp className="h-3 w-3 text-emerald-500" />
        <span className="forecast-label">Demand Forecast</span>
      </div>
      <div className="absolute bottom-2 right-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Sparkles className="h-3 w-3 text-amber-500" />
        <span className="forecast-label">AI-Powered</span>
      </div>
    </div>
  );
}

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
      const res = await apiFetch('/api/auth/login', {
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
      const res = await apiFetch('/api/auth/signup', {
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
        {/* Logo + title + animated graph */}
        <div className="text-center space-y-3">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl">
            C
          </div>
          <div>
            <h1 className="text-2xl font-bold">CreativeCast</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Demand forecasting & order planning for your business
            </p>
          </div>
          {/* Animated forecast graph */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <AnimatedForecastGraph />
          </div>
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

        {/* Footer */}
        <p className="text-center text-[11px] text-muted-foreground">
          CreativeCast developed with{' '}
          <span className="text-red-500">♥</span>
          {' '}&{' '}
          <span className="text-amber-600">☕</span>
          {' '}by{' '}
          <a href="https://mycreativecode.com" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
            my creative code
          </a>
        </p>
      </div>
    </div>
  );
}
