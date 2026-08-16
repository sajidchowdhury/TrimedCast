'use client';

// ============================================
// Ask AI Panel — Natural language query interface
// Sheet that slides from the right with search, templates,
// conversation display, and history sidebar
// ============================================

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Search,
  Brain,
  MessageSquare,
  Sparkles,
  Clock,
  Copy,
  Trash2,
  RefreshCw,
  Zap,
  AlertTriangle,
  TrendingUp,
  Package,
  ShoppingCart,
  Calendar,
  DollarSign,
  Send,
  Loader2,
  X,
  ChevronRight,
} from 'lucide-react';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';

import {
  useAIStore,
  type ConversationMessage,
  type ContextType,
} from '@/lib/dashboard/ai-store';

// =============================================
// Prompt Templates
// =============================================

interface PromptTemplate {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  query: string;
  contextType: ContextType;
}

const PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'stockout-risk',
    icon: <AlertTriangle className="h-4 w-4" />,
    title: 'Stockout Risk',
    description: 'Which products are at high risk of stockout in the next 14 days?',
    query: 'Which products are at high risk of stockout in the next 14 days?',
    contextType: 'stockout_risk',
  },
  {
    id: 'mape-accuracy',
    icon: <TrendingUp className="h-4 w-4" />,
    title: 'MAPE Accuracy',
    description: 'Show me the MAPE accuracy for all products last season',
    query: 'Show me the MAPE accuracy for all products last season',
    contextType: 'forecast_accuracy',
  },
  {
    id: 'cny-timing',
    icon: <Calendar className="h-4 w-4" />,
    title: 'CNY Timing',
    description: 'When should I order before Chinese New Year 2026?',
    query: 'When should I order before Chinese New Year 2026?',
    contextType: 'order_timing',
  },
  {
    id: 'winter-forecast',
    icon: <Sparkles className="h-4 w-4" />,
    title: 'Winter Forecast',
    description: 'What is the demand forecast for winter season products?',
    query: 'What is the demand forecast for winter season products?',
    contextType: 'seasonal',
  },
  {
    id: 'top-products',
    icon: <Package className="h-4 w-4" />,
    title: 'Top Products',
    description: 'Which products have the highest demand in the current season?',
    query: 'Which products have the highest demand in the current season?',
    contextType: 'general',
  },
  {
    id: 'order-urgency',
    icon: <Zap className="h-4 w-4" />,
    title: 'Order Urgency',
    description: 'Which orders need to be placed urgently this week?',
    query: 'Which orders need to be placed urgently this week?',
    contextType: 'order_timing',
  },
  {
    id: 'cash-flow',
    icon: <DollarSign className="h-4 w-4" />,
    title: 'Cash Flow Impact',
    description: 'What is the total cash flow impact of all pending recommended orders?',
    query: 'What is the total cash flow impact of all pending recommended orders?',
    contextType: 'order_timing',
  },
  {
    id: 'seasonal-patterns',
    icon: <ShoppingCart className="h-4 w-4" />,
    title: 'Seasonal Patterns',
    description: 'Explain the seasonal demand patterns for motorcycle parts in Bangladesh',
    query: 'Explain the seasonal demand patterns for motorcycle parts in Bangladesh',
    contextType: 'seasonal',
  },
];

// =============================================
// Context Type Badge Colors
// =============================================

const CONTEXT_TYPE_CONFIG: Record<ContextType, { label: string; className: string }> = {
  stockout_risk: {
    label: 'Stockout Risk',
    className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800',
  },
  forecast_accuracy: {
    label: 'Forecast Accuracy',
    className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  order_timing: {
    label: 'Order Timing',
    className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  seasonal: {
    label: 'Seasonal',
    className: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
  },
  general: {
    label: 'General',
    className: 'bg-slate-100 text-slate-800 dark:bg-slate-900/40 dark:text-slate-300 border-slate-200 dark:border-slate-800',
  },
};

function ContextTypeBadge({ type }: { type: ContextType }) {
  const config = CONTEXT_TYPE_CONFIG[type] || CONTEXT_TYPE_CONFIG.general;
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 ${config.className}`}>
      {config.label}
    </Badge>
  );
}

// =============================================
// Loading Dots Animation
// =============================================

function LoadingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
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
// Chat Message Bubble
// =============================================

function ChatMessageBubble({
  message,
  onCopy,
  onFollowUp,
}: {
  message: ConversationMessage;
  onCopy: (content: string) => void;
  onFollowUp: (content: string) => void;
}) {
  const isUser = message.role === 'user';

  const formattedTime = (() => {
    try {
      return new Date(message.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  })();

  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="flex justify-end"
      >
        <div className="max-w-[85%]">
          <div className="rounded-2xl rounded-tr-sm bg-primary text-primary-foreground px-4 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
          <div className="flex items-center justify-end gap-1.5 mt-1">
            <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="flex justify-start"
    >
      <div className="max-w-[90%]">
        <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5 text-sm leading-relaxed">
          <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:mb-2 [&_ol]:mb-2 [&_li]:mb-0.5 [&_strong]:text-foreground [&_code]:bg-background [&_code]:px-1 [&_code]:rounded [&_pre]:bg-background [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:overflow-x-auto [&_table]:text-xs [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[10px] text-muted-foreground">{formattedTime}</span>
          {message.contextType && <ContextTypeBadge type={message.contextType} />}
          <div className="flex items-center gap-0.5 ml-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onCopy(message.content)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Copy response</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={() => onFollowUp(message.content)}
                >
                  <MessageSquare className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Ask follow-up</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// =============================================
// Conversation History Sidebar
// =============================================

function ConversationHistory({
  conversations,
  onSelectQuery,
  onClear,
}: {
  conversations: ConversationMessage[];
  onSelectQuery: (query: string) => void;
  onClear: () => void;
}) {
  // Show last 10 user queries
  const userQueries = conversations
    .filter((m) => m.role === 'user')
    .slice(-10)
    .reverse();

  if (userQueries.length === 0) {
    return (
      <div className="px-3 py-4 text-center">
        <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">No conversation history yet</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2">
        <span className="text-xs font-medium text-muted-foreground">Recent Queries</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 text-muted-foreground hover:text-destructive"
              onClick={onClear}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Clear history</TooltipContent>
        </Tooltip>
      </div>
      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-0.5 px-1.5">
          {userQueries.map((msg) => (
            <button
              key={msg.id}
              onClick={() => onSelectQuery(msg.content)}
              className="flex items-start gap-2 rounded-md px-2 py-1.5 text-left text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors group"
            >
              <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground/50 group-hover:text-foreground/70" />
              <span className="line-clamp-2 leading-snug">{msg.content}</span>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

// =============================================
// Prompt Template Grid
// =============================================

function PromptTemplateGrid({
  onSelect,
}: {
  onSelect: (query: string) => void;
}) {
  return (
    <div className="px-4 pb-4">
      <div className="flex items-center gap-1.5 mb-3">
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">Suggested questions</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {PROMPT_TEMPLATES.map((template) => (
          <motion.button
            key={template.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: PROMPT_TEMPLATES.indexOf(template) * 0.04 }}
            onClick={() => onSelect(template.query)}
            className="group text-left rounded-lg border border-border/60 bg-background hover:bg-muted/50 hover:border-border transition-all p-2.5"
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {template.icon}
              </span>
              <span className="text-xs font-medium text-foreground">{template.title}</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
              {template.description}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// =============================================
// Main Ask AI Panel (Sheet Content)
// =============================================

function AskAIPanelContent() {
  const {
    conversations,
    isLoading,
    error,
    currentQuery,
    setCurrentQuery,
    submitQuery,
    clearHistory,
  } = useAIStore();

  const [inputFocused, setInputFocused] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showTemplates = conversations.length === 0 && !isLoading && (inputFocused || currentQuery === '');

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversations, isLoading]);

  // Cmd+K / Ctrl+K shortcut to focus input
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!currentQuery.trim() || isLoading) return;
    submitQuery(currentQuery);
  }, [currentQuery, isLoading, submitQuery]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleCopy = useCallback(async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(content.slice(0, 20));
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  const handleFollowUp = useCallback(
    (content: string) => {
      // Pre-fill search bar with a follow-up context
      setCurrentQuery(`Following up on: ${content.slice(0, 60)}... `);
      inputRef.current?.focus();
    },
    [setCurrentQuery]
  );

  const handleTemplateSelect = useCallback(
    (query: string) => {
      setCurrentQuery(query);
      submitQuery(query);
    },
    [setCurrentQuery, submitQuery]
  );

  const handleHistorySelect = useCallback(
    (query: string) => {
      setCurrentQuery(query);
      submitQuery(query);
    },
    [setCurrentQuery, submitQuery]
  );

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <div className="flex items-center justify-center h-7 w-7 rounded-lg bg-primary/10">
          <Brain className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-foreground">Ask AI</h2>
          <p className="text-[11px] text-muted-foreground">
            Ask about inventory, forecasts, or orders
          </p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setShowHistory(!showHistory)}
            >
              <Clock className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Toggle history</TooltipContent>
        </Tooltip>
      </div>

      <Separator />

      {/* Search bar */}
      <div className="px-4 pt-3 pb-2">
        <div className="relative">
          <div className="absolute left-3 top-1/2 -translate-y-1/2">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Search className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <Input
            ref={inputRef}
            value={currentQuery}
            onChange={(e) => setCurrentQuery(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Ask AI about your inventory, forecasts, or orders..."
            disabled={isLoading}
            className="pl-10 pr-20 py-5 text-sm bg-muted/30 border-border/60 focus:border-primary/40 focus:bg-background transition-colors"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {!currentQuery.trim() ? (
              <kbd className="text-[10px] text-muted-foreground bg-background border border-border rounded px-1.5 py-0.5">
                {typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent) ? '\u2318' : 'Ctrl+'}K
              </kbd>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    className="h-7 w-7"
                    onClick={handleSubmit}
                    disabled={isLoading || !currentQuery.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Send query</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-2"
          >
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-destructive shrink-0" />
              <p className="text-xs text-destructive flex-1">{error}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 text-destructive/70 hover:text-destructive"
                onClick={() => useAIStore.setState({ error: null })}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 min-h-0 flex">
        {/* Messages / Templates */}
        <div className="flex-1 min-h-0 flex flex-col">
          <ScrollArea className="flex-1">
            <div className="px-4 py-2 flex flex-col gap-3">
              {/* Prompt templates when no conversation */}
              {showTemplates && <PromptTemplateGrid onSelect={handleTemplateSelect} />}

              {/* Conversation messages */}
              {conversations.map((msg) => (
                <ChatMessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={handleCopy}
                  onFollowUp={handleFollowUp}
                />
              ))}

              {/* Loading indicator */}
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex justify-start"
                >
                  <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-2.5">
                    <LoadingDots />
                  </div>
                </motion.div>
              )}

              {/* Copied feedback */}
              {copiedId && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="flex justify-center"
                >
                  <span className="text-[10px] text-muted-foreground bg-muted/50 rounded-full px-2 py-0.5">
                    Copied to clipboard
                  </span>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        {/* History sidebar (toggle) */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 180, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="border-l border-border overflow-hidden shrink-0"
            >
              <ConversationHistory
                conversations={conversations}
                onSelectQuery={handleHistorySelect}
                onClear={clearHistory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      {conversations.length > 0 && !isLoading && (
        <div className="px-4 py-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] text-muted-foreground/60">
              AI responses are based on your current inventory and forecast data
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// Ask AI Sheet (main export)
// =============================================

export function AskAIPanel() {
  const { isOpen, setIsOpen, loadHistory } = useAIStore();

  // Load conversation history when panel opens
  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl p-0 gap-0"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>Ask AI</SheetTitle>
          <SheetDescription>
            Ask AI about your inventory, forecasts, or orders
          </SheetDescription>
        </SheetHeader>
        <AskAIPanelContent />
      </SheetContent>
    </Sheet>
  );
}

// =============================================
// Trigger Button (for header integration)
// =============================================

export function AskAITriggerButton() {
  const { toggleOpen } = useAIStore();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={toggleOpen}
        >
          <Brain className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Ask AI (Cmd+K)</TooltipContent>
    </Tooltip>
  );
}

// =============================================
// Inline Panel (for embedding in page content)
// =============================================

export function AskAIInlinePanel() {
  return (
    <Card className="w-full">
      <AskAIPanelContent />
    </Card>
  );
}
