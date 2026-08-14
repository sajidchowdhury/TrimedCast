// ============================================
// TrimedCast - Shared types for Recommended Orders
// ============================================

export interface RecommendedOrderRow {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  category: string;
  currentStock: number;
  reorderPoint: number;
  suggestedQty: number;
  orderTriggerDate: string;
  expectedDeliveryDate: string;
  totalLeadTime: number;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  cnyRisk: boolean;
  season: string;
  status: 'pending' | 'approved' | 'converted' | 'rejected';
  orderTrigger: string;
}
