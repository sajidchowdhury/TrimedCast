// ============================================
// /api/ai/conversations
// AI Conversation History Management
// GET: List recent conversations
// DELETE: Clear conversation history
// Session 22: AI Conversation History API
// ============================================

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthContext, resolveTenant } from '@/lib/api/auth';

// =============================================
// In-Memory Conversation Store
// =============================================

interface ConversationMessage {
  id: string;
  sessionId: string;
  tenantId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  contextType?: string;
  metadata?: Record<string, unknown>;
}

interface ConversationSession {
  sessionId: string;
  tenantId: string;
  messages: ConversationMessage[];
  createdAt: string;
  updatedAt: string;
  contextType?: string;
  messageCount: number;
}

// Global in-memory store
const conversationStore = new Map<string, ConversationSession>();

// Maximum messages per session
const MAX_MESSAGES_PER_SESSION = 100;

// Session TTL: 2 hours of inactivity
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Periodic cleanup of expired sessions
setInterval(() => {
  const cutoff = new Date(Date.now() - SESSION_TTL_MS).toISOString();
  for (const [sessionId, session] of conversationStore.entries()) {
    if (session.updatedAt < cutoff) {
      conversationStore.delete(sessionId);
    }
  }
}, 10 * 60 * 1000);

// =============================================
// GET: List recent conversations
// =============================================

export async function GET(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const tenantId = authContext.isAuthenticated
      ? authContext.tenantId
      : await resolveTenant();

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (sessionId) {
      // Get specific session
      const session = conversationStore.get(sessionId);

      if (!session || session.tenantId !== tenantId) {
        return NextResponse.json({
          success: true,
          data: {
            session_id: sessionId,
            messages: [],
            total: 0,
          },
        });
      }

      const messages = session.messages
        .slice(offset, offset + limit)
        .map(m => ({
          id: m.id,
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          context_type: m.contextType,
          metadata: m.metadata,
        }));

      return NextResponse.json({
        success: true,
        data: {
          session_id: sessionId,
          messages,
          total: session.messages.length,
          context_type: session.contextType,
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        },
      });
    }

    // List all sessions for this tenant
    const sessions = Array.from(conversationStore.values())
      .filter(s => s.tenantId === tenantId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(offset, offset + limit)
      .map(s => ({
        session_id: s.sessionId,
        message_count: s.messageCount,
        context_type: s.contextType,
        created_at: s.createdAt,
        updated_at: s.updatedAt,
        last_message: s.messages.length > 0
          ? {
              role: s.messages[s.messages.length - 1].role,
              content: s.messages[s.messages.length - 1].content.slice(0, 100),
              timestamp: s.messages[s.messages.length - 1].timestamp,
            }
          : null,
      }));

    const totalSessions = Array.from(conversationStore.values())
      .filter(s => s.tenantId === tenantId).length;

    return NextResponse.json({
      success: true,
      data: {
        sessions,
        total_sessions: totalSessions,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error('[AI/Conversations/GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve conversation history' },
      { status: 500 }
    );
  }
}

// =============================================
// DELETE: Clear conversation history
// =============================================

export async function DELETE(request: NextRequest) {
  try {
    const authContext = await getAuthContext();
    const tenantId = authContext.isAuthenticated
      ? authContext.tenantId
      : await resolveTenant();

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const clearAll = url.searchParams.get('clear_all') === 'true';

    if (sessionId) {
      // Delete specific session
      const session = conversationStore.get(sessionId);

      if (!session || session.tenantId !== tenantId) {
        return NextResponse.json({
          success: true,
          data: { deleted: false, reason: 'Session not found' },
        });
      }

      conversationStore.delete(sessionId);

      return NextResponse.json({
        success: true,
        data: {
          deleted: true,
          session_id: sessionId,
          messages_cleared: session.messageCount,
        },
      });
    }

    if (clearAll) {
      // Delete all sessions for this tenant
      let clearedCount = 0;
      let totalMessages = 0;

      for (const [id, session] of conversationStore.entries()) {
        if (session.tenantId === tenantId) {
          totalMessages += session.messageCount;
          conversationStore.delete(id);
          clearedCount++;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          deleted: true,
          sessions_cleared: clearedCount,
          messages_cleared: totalMessages,
        },
      });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Provide session_id or clear_all=true parameter',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error('[AI/Conversations/DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear conversation history' },
      { status: 500 }
    );
  }
}

// =============================================
// POST: Save a message to conversation (used by AI query route internally)
// =============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      session_id,
      role,
      content,
      context_type,
      metadata,
      tenant_id,
    } = body as {
      session_id?: string;
      role?: string;
      content?: string;
      context_type?: string;
      metadata?: Record<string, unknown>;
      tenant_id?: string;
    };

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Content is required' },
        { status: 400 }
      );
    }

    if (!role || !['user', 'assistant', 'system'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Role must be "user", "assistant", or "system"' },
        { status: 400 }
      );
    }

    const authContext = await getAuthContext();
    const tenantId = authContext.isAuthenticated
      ? authContext.tenantId
      : (tenant_id ? await resolveTenant(tenant_id) : await resolveTenant());

    // Generate or use existing session ID
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create message
    const message: ConversationMessage = {
      id: generateId(),
      sessionId,
      tenantId,
      role: role as 'user' | 'assistant' | 'system',
      content,
      timestamp: new Date().toISOString(),
      contextType: context_type,
      metadata,
    };

    // Get or create session
    let session = conversationStore.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      session = {
        sessionId,
        tenantId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        contextType: context_type,
        messageCount: 0,
      };
      conversationStore.set(sessionId, session);
    }

    // Add message with max limit
    session.messages.push(message);
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      const systemMessages = session.messages.filter(m => m.role === 'system');
      const nonSystemMessages = session.messages.filter(m => m.role !== 'system');
      const keepCount = MAX_MESSAGES_PER_SESSION - systemMessages.length;
      session.messages = [
        ...systemMessages,
        ...nonSystemMessages.slice(-keepCount),
      ];
    }

    session.messageCount = session.messages.length;
    session.updatedAt = new Date().toISOString();
    if (context_type) session.contextType = context_type;

    return NextResponse.json({
      success: true,
      data: {
        message: {
          id: message.id,
          role: message.role,
          content: message.content,
          timestamp: message.timestamp,
        },
        session_id: sessionId,
        message_count: session.messageCount,
      },
    });
  } catch (error) {
    console.error('[AI/Conversations/POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save conversation message' },
      { status: 500 }
    );
  }
}
