'use client';

// ============================================
// AI Query Bar — "Ask AI" search bar for TrimedCast
// Session 9: AI + Prophet integration into Forecast page
//
// Features:
//   - Search input with Brain icon prefix
//   - Auto-suggest dropdown with sample query templates
//   - On submit, calls POST /api/ai/query
//   - Loading state with animated dots
//   - AI response card with markdown-like rendering
//   - Source data badges
//   - "Ask Follow-up" button for conversation continuity
//   - Session ID for conversation tracking
//   - Error handling with retry
//   - Collapsible history of previous Q&A pairs
// ============================================

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Brain,
  Send,
  Loader2,
  ChevronDown,
  MessageSquare,
  X,
  Sparkles,
  AlertTriangle,
  Copy,
  RotateCcw,
  Hash,
} from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

// =============================================
// Types
// =============================================

interface AIResponse {
  answer: string;
  contextType?: string;
  dataUsed?: {
    type?: string;
    context_length?: number;
    [key: string]: unknown;
  };
  timestamp: string;
}

interface QAEntry {
  id: string;
  query: string;
  response: AIResponse;
  collapsed: boolean;
}

// =============================================
// Sample Query Templates
// =============================================

const QUERY_TEMPLATES = [
  'Which products are at stockout risk in the next 14 days?',
  'What happens to safety stock if SKU moves from sea to air?',
  'Show me the MAPE accuracy for fast-moving wear parts last winter.',
  'What is the cash flow impact of a 0.2 increase in promo index?',
  'When should I place orders for winter products to avoid CNY delays?',
  'Which SKUs have forecast error above 10% and need recalibration?',
  "What's the total recommended order spend for winter 2026?",
  'Compare sea vs air shipment for all critical urgency items.',
];

// =============================================
// Context type badge styling
// =============================================

const CONTEXT_BADGE_STYLES: Record<string, { label: string; cls: string }> = {
  stockout_risk: {
    label: 'Stockout Risk',
    cls: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  forecast_accuracy: {
    label: 'Forecast Accuracy',
    cls: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  },
  order_timing: {
    label: 'Order Timing',
    cls: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  seasonal: {
    label: 'Seasonal',
    cls: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  },
  general: {
    label: 'General',
    cls: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300',
  },
};

function getContextBadge(contextType?: string) {
  if (!contextType) return null;
  const cfg = CONTEXT_BADGE_STYLES[contextType] || CONTEXT_BADGE_STYLES.general;
  return cfg;
}

// =============================================
// Session ID helper
// =============================================

const SESSION_KEY = 'trimedcast-ai-query-session';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return `qbar_${Date.now()}`;
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const id = `qbar_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  sessionStorage.setItem(SESSION_KEY, id);
  return id;
}

// =============================================
// Animated Loading Dots
// =============================================

function LoadingDots() {
  return (
    <div className="flex items-center gap-1.5 py-2">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="h-2 w-2 rounded-full bg-muted-foreground/40"
          animate={{ opacity: [0.2, 1, 0.2] }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            delay: i * 0.2,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// =============================================
// AI Query Bar Component
// =============================================

export function AIQueryBar() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [history, setHistory] = useState<QAEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentResponse, setCurrentResponse] = useState<AIResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const responseEndRef = useRef<HTMLDivElement>(null);

  // Initialize session on mount
  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Scroll to latest response
  useEffect(() => {
    if (responseEndRef.current) {
      responseEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [currentResponse, history]);

  // ---- Submit handler ----
  const handleSubmit = useCallback(async (queryText?: string) => {
    const q = (queryText || query).trim();
    if (!q || isLoading) return;

    setIsLoading(true);
    setError(null);
    setCurrentResponse(null);
    setShowSuggestions(false);
    setQuery(q);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          session_id: sessionId || getOrCreateSessionId(),
          context_type: 'auto',
          tenant_id: 'demo-bd-motors',
        }),
      });

      if (!res.ok) {
        if (res.status === 429) {
          setError('Too many requests. Please wait a moment before trying again.');
        } else if (res.status >= 500) {
          setError('AI service is currently unavailable. Please try again later.');
        } else {
          const errData = await res.json().catch(() => null);
          setError(errData?.error || 'Failed to get AI response. Please try again.');
        }
        setIsLoading(false);
        return;
      }

      const json = await res.json();

      if (!json.success) {
        setError(json.error || 'AI service returned an error. Please try again.');
        setIsLoading(false);
        return;
      }

      const data = json.data as AIResponse;
      setCurrentResponse(data);

      // Add to history
      const entry: QAEntry = {
        id: `qa_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        query: q,
        response: data,
        collapsed: false,
      };
      setHistory((prev) => [...prev, entry]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  }, [query, isLoading, sessionId]);

  // ---- Key handler ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    },
    [handleSubmit]
  );

  // ---- Retry ----
  const handleRetry = useCallback(() => {
    setError(null);
    handleSubmit();
  }, [handleSubmit]);

  // ---- Follow-up ----
  const handleFollowUp = useCallback(
    (previousContent: string) => {
      const followUp = `Following up on: ${previousContent.slice(0, 80)}... `;
      setQuery(followUp);
      inputRef.current?.focus();
    },
    []
  );

  // ---- Copy ----
  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }, []);

  // ---- Toggle history entry collapse ----
  const toggleCollapse = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((entry) => (entry.id === id ? { ...entry, collapsed: !entry.collapsed } : entry))
    );
  }, []);

  // ---- Filtered suggestions ----
  const filteredSuggestions = query.trim()
    ? QUERY_TEMPLATES.filter((t) => t.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
    : QUERY_TEMPLATES.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">AI Query</h3>
          <p className="text-xs text-muted-foreground">
            Ask about inventory, forecasts, orders, or scenarios
          </p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative" ref={suggestionsRef}>
        <div className="relative flex items-center">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Brain className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about your supply chain... (e.g. stockout risk next 14 days)"
            disabled={isLoading}
            className="pl-10 pr-20 py-5 text-sm bg-muted/30 border-border/60 focus:border-primary/40 focus:bg-background transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query.trim() && !isLoading && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => {
                  setQuery('');
                  inputRef.current?.focus();
                }}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </Button>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleSubmit()}
                  disabled={isLoading || !query.trim()}
                >
                  <Send className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Send query</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Auto-suggest dropdown */}
        <AnimatePresence>
          {showSuggestions && filteredSuggestions.length > 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-30 top-full mt-1 w-full rounded-lg border border-border bg-background shadow-lg overflow-hidden"
            >
              <div className="p-1.5">
                <div className="flex items-center gap-1 px-2 py-1">
                  <Sparkles className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    Suggested queries
                  </span>
                </div>
                {filteredSuggestions.map((template, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setQuery(template);
                      setShowSuggestions(false);
                      handleSubmit(template);
                    }}
                    className="w-full text-left rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted/70 transition-colors flex items-center gap-2 group"
                  >
                    <MessageSquare className="h-3 w-3 text-muted-foreground/50 group-hover:text-foreground/70 shrink-0" />
                    <span className="line-clamp-1">{template}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-3 flex items-center gap-3">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                <p className="text-sm text-destructive flex-1">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="h-4 w-4 text-primary animate-pulse" />
                  <span className="text-sm font-medium text-foreground">Analyzing your query...</span>
                </div>
                <LoadingDots />
                <p className="text-xs text-muted-foreground mt-1">
                  Searching inventory data, forecast models, and order records
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current response */}
      <AnimatePresence>
        {currentResponse && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <AIResponseCard
              response={currentResponse}
              sessionId={sessionId}
              onFollowUp={handleFollowUp}
              onCopy={handleCopy}
              copied={copied}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Conversation history */}
      {history.length > 1 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">
              Previous Queries ({history.length - 1})
            </span>
            <Separator className="flex-1" />
          </div>
          <ScrollArea className="max-h-64">
            <div className="space-y-2 pr-2">
              {history.slice(0, -1).map((entry) => (
                <HistoryEntry
                  key={entry.id}
                  entry={entry}
                  onToggle={toggleCollapse}
                  onFollowUp={handleFollowUp}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Session info */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/50">
        <Hash className="h-3 w-3" />
        <span>Session: {sessionId.slice(0, 16)}...</span>
      </div>

      <div ref={responseEndRef} />
    </div>
  );
}

// =============================================
// AI Response Card
// =============================================

function AIResponseCard({
  response,
  sessionId,
  onFollowUp,
  onCopy,
  copied,
}: {
  response: AIResponse;
  sessionId: string;
  onFollowUp: (content: string) => void;
  onCopy: (content: string) => void;
  copied: boolean;
}) {
  const contextBadge = getContextBadge(response.contextType);

  // Extract source data badges from the response
  const sourceBadges: { label: string; value: string }[] = [];
  if (response.dataUsed) {
    if (response.dataUsed.context_length) {
      sourceBadges.push({
        label: 'Context',
        value: `${response.dataUsed.context_length} records`,
      });
    }
    if (response.dataUsed.type) {
      sourceBadges.push({ label: 'Source', value: String(response.dataUsed.type) });
    }
  }

  // Quick scan for common data points in the answer text
  const answerText = response.answer;
  if (answerText.includes('products at risk') || answerText.includes('SKUs at risk')) {
    const match = answerText.match(/(\d+)\s+(?:products?|SKUs?)\s+at\s+risk/i);
    if (match) sourceBadges.push({ label: 'At Risk', value: `${match[1]} items` });
  }
  if (answerText.match(/MAPE[:\s]+([\d.]+%)/i)) {
    const match = answerText.match(/MAPE[:\s]+([\d.]+%)/i);
    if (match) sourceBadges.push({ label: 'MAPE', value: match[1] });
  }

  return (
    <Card className="border-primary/10">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            AI Response
          </CardTitle>
          <div className="flex items-center gap-1.5">
            {contextBadge && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${contextBadge.cls}`}>
                {contextBadge.label}
              </Badge>
            )}
            <span className="text-[10px] text-muted-foreground">
              {new Date(response.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        {/* Markdown-like rendered response */}
        <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:bg-muted [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:overflow-x-auto [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
          <ReactMarkdown>{response.answer}</ReactMarkdown>
        </div>

        {/* Source data badges */}
        {sourceBadges.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {sourceBadges.map((badge, idx) => (
              <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                {badge.label}: {badge.value}
              </Badge>
            ))}
          </div>
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onFollowUp(response.answer)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            Ask Follow-up
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onCopy(response.answer)}
          >
            <Copy className="h-3 w-3 mr-1" />
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <div className="flex-1" />
          <span className="text-[10px] text-muted-foreground/50">
            Session: {sessionId.slice(0, 12)}...
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================
// History Entry (collapsible)
// =============================================

function HistoryEntry({
  entry,
  onToggle,
  onFollowUp,
}: {
  entry: QAEntry;
  onToggle: (id: string) => void;
  onFollowUp: (content: string) => void;
}) {
  return (
    <Card className="border-border/50">
      <button
        onClick={() => onToggle(entry.id)}
        className="w-full flex items-center gap-2 p-2.5 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform ${
            entry.collapsed ? '-rotate-90' : ''
          }`}
        />
        <span className="text-xs font-medium text-foreground line-clamp-1 flex-1">
          {entry.query}
        </span>
        <span className="text-[10px] text-muted-foreground shrink-0">
          {new Date(entry.response.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </button>
      <AnimatePresence>
        {!entry.collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <CardContent className="px-3 pb-3 pt-0 space-y-2">
              <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed [&_p]:mb-1 [&_p:last-child]:mb-0 [&_ul]:mb-1 [&_ol]:mb-1 [&_li]:mb-0.5 [&_strong]:text-foreground">
                <ReactMarkdown>{entry.response.answer}</ReactMarkdown>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px]"
                onClick={() => onFollowUp(entry.response.answer)}
              >
                <MessageSquare className="h-2.5 w-2.5 mr-1" />
                Ask Follow-up
              </Button>
            </CardContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}
