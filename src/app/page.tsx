'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { AppShell } from '@/components/dashboard/app-shell';
import { AuthView } from '@/components/views/auth-view';

export default function Home() {
  const { user, loading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/auth/me');
        const json = await res.json();
        setUser(json.user ?? null);
      } catch (e) {
        console.error(e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [setUser, setLoading]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-bold text-xl animate-pulse">
          C
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return <AppShell />;
}
