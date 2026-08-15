// ============================================
// /api/v1/ai/conversation
// AI Conversation History Management
// POST: Save message, GET: Retrieve history, DELETE: Clear history
// Uses in-memory Map for conversation storage (production would use DB)
// ============================================

import { NextRequest, NextResponse } from 'next/server';
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

// Maximum messages per session to prevent memory issues
const MAX_MESSAGES_PER_SESSION = 100;

function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// =============================================
// GET: Retrieve conversation history
// =============================================

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : await resolveTenant();

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    if (!sessionId) {
      // Return list of sessions for this tenant
      const sessions = Array.from(conversationStore.values())
        .filter(s => s.tenantId === tenantId)
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .map(s => ({
          session_id: s.sessionId,
          message_count: s.messageCount,
          context_type: s.contextType,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        }));

      return NextResponse.json({
        success: true,
        data: {
          sessions,
          total_sessions: sessions.length,
        },
      });
    }

    // Get specific session
    const session = conversationStore.get(sessionId);

    if (!session || session.tenantId !== tenantId) {
      return NextResponse.json(
        { success: true, data: { session_id: sessionId, messages: [], total: 0 } },
        { status: 200 }
      );
    }

    const messages = session.messages
      .slice(offset, offset + limit)
      .map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
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
  } catch (error) {
    console.error('[AI/Conversation/GET]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve conversation history' },
      { status: 500 }
    );
  }
}

// =============================================
// POST: Save conversation message
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

    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : (tenant_id ? await resolveTenant(tenant_id) : await resolveTenant());

    // Generate or use existing session ID
    const sessionId = session_id || `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Create message
    const message: ConversationMessage = {
      id: generateMessageId(),
      sessionId,
      tenantId,
      role: role as 'user' | 'assistant' | 'system',
      content,
      timestamp: new Date().toISOString(),
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
        contextType,
        messageCount: 0,
      };
      conversationStore.set(sessionId, session);
    }

    // Add message (with max limit)
    session.messages.push(message);
    if (session.messages.length > MAX_MESSAGES_PER_SESSION) {
      // Keep system messages and trim oldest user/assistant messages
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
    console.error('[AI/Conversation/POST]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save conversation message' },
      { status: 500 }
    );
  }
}

// =============================================
// DELETE: Clear conversation history
// =============================================

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthContext();
    const tenantId = context.isAuthenticated
      ? context.tenantId
      : await resolveTenant();

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const clearAll = url.searchParams.get('clear_all') === 'true';

    if (clearAll) {
      // Clear all sessions for this tenant
      let count = 0;
      for (const [key, session] of conversationStore.entries()) {
        if (session.tenantId === tenantId) {
          conversationStore.delete(key);
          count++;
        }
      }

      return NextResponse.json({
        success: true,
        data: {
          action: 'clear_all',
          sessions_cleared: count,
        },
      });
    }

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'session_id is required (or use clear_all=true)' },
        { status: 400 }
      );
    }

    const session = conversationStore.get(sessionId);
    if (!session || session.tenantId !== tenantId) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    conversationStore.delete(sessionId);

    return NextResponse.json({
      success: true,
      data: {
        action: 'clear_session',
        session_id: sessionId,
        messages_cleared: session.messageCount,
      },
    });
  } catch (error) {
    console.error('[AI/Conversation/DELETE]', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear conversation history' },
      { status: 500 }
    );
  }
}
