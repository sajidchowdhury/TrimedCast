'use client';

// ============================================
// Sessions Panel — Active sessions management
// ============================================

import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Monitor, X, Loader2 } from 'lucide-react';
import { useUserManagementStore } from './user-store';

export function SessionsPanel() {
  const { sessions, sessionsLoading, fetchSessions, revokeSession } = useUserManagementStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Active Sessions
            </CardTitle>
            <CardDescription className="text-xs">
              Devices currently signed in to your account
            </CardDescription>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            {sessions.filter((s) => s.is_active).length} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {sessionsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active sessions</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium truncate">
                      {parseUserAgent(session.user_agent || '')}
                    </p>
                    {session.is_current && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                        Current
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {session.ip_address || 'Unknown IP'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatSessionDate(session.created_at)}
                    </span>
                  </div>
                </div>
                {!session.is_current && session.is_active && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-red-500 shrink-0"
                    onClick={() => revokeSession(session.id)}
                    title="Revoke session"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function parseUserAgent(ua: string): string {
  if (!ua) return 'Unknown device';
  if (ua.includes('Chrome') && ua.includes('Safari')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  return 'Browser';
}

function formatSessionDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-BD', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}
