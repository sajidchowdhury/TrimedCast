'use client';

// ============================================
// API Explorer Page — API contract explorer
// ============================================

import { ApiContractExplorer } from '@/components/api/api-contract-explorer';
import { Code2, Book, Shield, Zap } from 'lucide-react';

export function ApiExplorerPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Code2 className="h-5 w-5 text-orange-500" />
          API Contract Explorer
        </h2>
        <p className="text-sm text-muted-foreground">REST API v1 endpoints, request/response schemas, and authentication</p>
      </div>

      <ApiContractExplorer />
    </div>
  );
}
