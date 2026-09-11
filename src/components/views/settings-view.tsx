'use client';

// ============================================
// TrimedCast LEAN — Settings view
// Editable: lead-time decomposition, holiday calendar, weekend info,
// recommendations, EOQ parameters. All saved to the database.
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Settings as SettingsIcon, Save, Loader2, Plus, Trash2, Pencil, X,
  Clock, Calendar, Globe, AlertTriangle, Calculator,
} from 'lucide-react';

interface LeadTimeSettings {
  manufacturing: number; shipmentSea: number; shipmentAir: number;
  customsSea: number; customsAir: number; internal: number;
  totalSea: number; totalAir: number;
}
interface EoqSettings {
  orderingCostPerOrder: number; holdingCostPct: number; serviceLevel: number;
  reviewPeriodDays: number; bufferDays: number;
}
interface WeekendSettings {
  chinaWorkingDays: string; chinaOffDay: string;
  bdWorkingDays: string; bdOffDays: string; weeklyAdminDelayDays: number;
}
interface Holiday {
  id: string; name: string; country: string; type: string;
  startISO: string; endISO: string; durationDays: number;
  impact: string; affects: string;
}

export function SettingsView() {
  const bumpData = useAppStore((s) => s.bumpData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'lead-time' | 'holidays' | 'weekend' | 'eoq' | 'recommendations'>('lead-time');

  // Settings state
  const [leadTime, setLeadTime] = useState<LeadTimeSettings | null>(null);
  const [eoq, setEoq] = useState<EoqSettings | null>(null);
  const [weekend, setWeekend] = useState<WeekendSettings | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [editingHoliday, setEditingHoliday] = useState<string | null>(null);
  const [showHolidayForm, setShowHolidayForm] = useState(false);

  // Holiday form state
  const [hName, setHName] = useState('');
  const [hCountry, setHCountry] = useState('china');
  const [hType, setHType] = useState('factory_shutdown');
  const [hStart, setHStart] = useState('');
  const [hEnd, setHEnd] = useState('');
  const [hDuration, setHDuration] = useState('1');
  const [hImpact, setHImpact] = useState('');
  const [hAffects, setHAffects] = useState('manufacturing');
  const [holidaySaving, setHolidaySaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, hRes] = await Promise.all([
        fetch('/api/settings'),
        fetch('/api/settings/holidays'),
      ]);
      const sJson = await sRes.json();
      const hJson = await hRes.json();
      setLeadTime(sJson.leadTime);
      setEoq(sJson.eoq);
      setWeekend(sJson.weekend);
      setRecommendations(sJson.recommendations || []);
      setHolidays(hJson.holidays || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Save lead-time + weekend + eoq + recommendations
  const saveSettings = async (section: string, payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Save failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success(`${section} saved`, { description: 'Changes applied to the database.' });
      load();
      bumpData();
    } catch (e) {
      toast.error('Save failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setSaving(false); }
  };

  // Holiday CRUD
  const startHolidayEdit = (h: Holiday) => {
    setEditingHoliday(h.id);
    setHName(h.name); setHCountry(h.country); setHType(h.type);
    setHStart(h.startISO); setHEnd(h.endISO); setHDuration(String(h.durationDays));
    setHImpact(h.impact); setHAffects(h.affects);
    setShowHolidayForm(true);
  };

  const startHolidayCreate = () => {
    setEditingHoliday(null);
    setHName(''); setHCountry('china'); setHType('factory_shutdown');
    setHStart(''); setHEnd(''); setHDuration('1');
    setHImpact(''); setHAffects('manufacturing');
    setShowHolidayForm(true);
  };

  const saveHoliday = async () => {
    if (!hName || !hStart || !hEnd || !hDuration) {
      toast.error('Missing fields', { description: 'Name, start, end, and duration are required.' });
      return;
    }
    setHolidaySaving(true);
    try {
      const payload = {
        name: hName, country: hCountry, type: hType,
        startISO: hStart, endISO: hEnd, durationDays: Number(hDuration),
        impact: hImpact, affects: hAffects,
      };
      const url = editingHoliday ? `/api/settings/holidays/${editingHoliday}` : '/api/settings/holidays';
      const method = editingHoliday ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) { toast.error('Save failed', { description: json.error }); return; }
      toast.success(editingHoliday ? 'Holiday updated' : 'Holiday created');
      setShowHolidayForm(false);
      setEditingHoliday(null);
      load();
      bumpData();
    } catch (e) { toast.error('Save failed', { description: e instanceof Error ? e.message : 'Unknown error' }); }
    finally { setHolidaySaving(false); }
  };

  const deleteHoliday = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try {
      await fetch(`/api/settings/holidays/${id}`, { method: 'DELETE' });
      toast.success('Holiday deleted', { description: name });
      load();
      bumpData();
    } catch (e) { toast.error('Delete failed'); }
  };

  if (loading || !leadTime || !eoq || !weekend) {
    return <Skeleton className="h-96 w-full" />;
  }

  const TABS = [
    { key: 'lead-time' as const, label: 'Lead Time', icon: Clock },
    { key: 'holidays' as const, label: 'Holidays', icon: Calendar },
    { key: 'weekend' as const, label: 'Weekend Info', icon: Globe },
    { key: 'eoq' as const, label: 'EOQ Params', icon: Calculator },
    { key: 'recommendations' as const, label: 'Recommendations', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-primary" />
            Settings
          </CardTitle>
          <CardDescription>
            All parameters are editable and saved to the database. Changes affect forecasts, order recommendations, and freight analysis.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {TABS.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {t.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Lead Time Tab */}
      {activeTab === 'lead-time' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lead-Time Decomposition</CardTitle>
            <CardDescription>Days for each shipping stage. These determine the order-trigger date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <NumberField label="Manufacturing (d)" value={leadTime.manufacturing} onChange={(v) => setLeadTime({ ...leadTime, manufacturing: v })} />
              <NumberField label="Internal Processing (d)" value={leadTime.internal} onChange={(v) => setLeadTime({ ...leadTime, internal: v })} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Sea */}
              <div className="rounded-lg border bg-blue-50/30 p-3 space-y-2">
                <div className="text-sm font-semibold text-blue-700">Sea Route — {leadTime.totalSea}d total</div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Shipment (d)" value={leadTime.shipmentSea} onChange={(v) => setLeadTime({ ...leadTime, shipmentSea: v })} />
                  <NumberField label="Customs (d)" value={leadTime.customsSea} onChange={(v) => setLeadTime({ ...leadTime, customsSea: v })} />
                </div>
              </div>
              {/* Air */}
              <div className="rounded-lg border bg-orange-50/30 p-3 space-y-2">
                <div className="text-sm font-semibold text-orange-700">Air Route — {leadTime.totalAir}d total</div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Shipment (d)" value={leadTime.shipmentAir} onChange={(v) => setLeadTime({ ...leadTime, shipmentAir: v })} />
                  <NumberField label="Customs (d)" value={leadTime.customsAir} onChange={(v) => setLeadTime({ ...leadTime, customsAir: v })} />
                </div>
              </div>
            </div>
            <Button onClick={() => saveSettings('Lead time', {
              manufacturing: leadTime.manufacturing, shipmentSea: leadTime.shipmentSea,
              shipmentAir: leadTime.shipmentAir, customsSea: leadTime.customsSea,
              customsAir: leadTime.customsAir, internal: leadTime.internal,
            })} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Save lead-time settings
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Holidays Tab */}
      {activeTab === 'holidays' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Holiday Calendar</CardTitle>
                <CardDescription>China + Bangladesh holidays that delay shipping. Add, edit, or delete.</CardDescription>
              </div>
              <Button size="sm" onClick={startHolidayCreate} disabled={showHolidayForm}>
                <Plus className="h-4 w-4 mr-1" /> Add holiday
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {showHolidayForm && (
              <div className="rounded-lg border border-primary/30 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{editingHoliday ? 'Edit holiday' : 'New holiday'}</span>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowHolidayForm(false); setEditingHoliday(null); }}><X className="h-4 w-4" /></Button>
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1"><Label>Holiday name</Label><Input value={hName} onChange={(e) => setHName(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Country</Label>
                    <Select value={hCountry} onValueChange={setHCountry}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="china">China 🇨🇳</SelectItem><SelectItem value="bangladesh">Bangladesh 🇧🇩</SelectItem>
                    </SelectContent></Select></div>
                  <div className="space-y-1"><Label>Type</Label>
                    <Select value={hType} onValueChange={setHType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="factory_shutdown">Factory shutdown</SelectItem><SelectItem value="customs_closure">Customs closure</SelectItem><SelectItem value="port_closure">Port closure</SelectItem><SelectItem value="bank_holiday">Bank holiday</SelectItem>
                    </SelectContent></Select></div>
                  <div className="space-y-1"><Label>Affects</Label>
                    <Select value={hAffects} onValueChange={setHAffects}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                      <SelectItem value="manufacturing">Manufacturing</SelectItem><SelectItem value="customs">Customs</SelectItem><SelectItem value="shipment">Shipment</SelectItem><SelectItem value="all">All</SelectItem>
                    </SelectContent></Select></div>
                  <div className="space-y-1"><Label>Start date</Label><Input type="date" value={hStart} onChange={(e) => setHStart(e.target.value)} /></div>
                  <div className="space-y-1"><Label>End date</Label><Input type="date" value={hEnd} onChange={(e) => setHEnd(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Duration (days)</Label><Input type="number" value={hDuration} onChange={(e) => setHDuration(e.target.value)} /></div>
                  <div className="space-y-1"><Label>Impact description</Label><Input value={hImpact} onChange={(e) => setHImpact(e.target.value)} /></div>
                </div>
                <Button size="sm" onClick={saveHoliday} disabled={holidaySaving}>
                  {holidaySaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                  {editingHoliday ? 'Update holiday' : 'Create holiday'}
                </Button>
              </div>
            )}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {holidays.map((h) => (
                <div key={h.id} className="flex items-start gap-2 rounded-lg border p-2.5 text-xs">
                  <Badge variant="outline" className="text-[9px] shrink-0">{h.country === 'china' ? '🇨🇳' : '🇧🇩'} {h.type.replace(/_/g, ' ')}</Badge>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{h.name}</div>
                    <div className="text-muted-foreground">{h.startISO} – {h.endISO} · {h.durationDays}d · {h.impact}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startHolidayEdit(h)}><Pencil className="h-3 w-3" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => deleteHoliday(h.id, h.name)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weekend Tab */}
      {activeTab === 'weekend' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Weekend Differences</CardTitle>
            <CardDescription>Working days differ between China and Bangladesh. Edit if your supplier has different hours.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-sm font-semibold">🇨🇳 China</div>
                <TextField label="Working days" value={weekend.chinaWorkingDays} onChange={(v) => setWeekend({ ...weekend, chinaWorkingDays: v })} />
                <TextField label="Off day" value={weekend.chinaOffDay} onChange={(v) => setWeekend({ ...weekend, chinaOffDay: v })} />
              </div>
              <div className="rounded-lg border p-3 space-y-2">
                <div className="text-sm font-semibold">🇧🇩 Bangladesh</div>
                <TextField label="Working days" value={weekend.bdWorkingDays} onChange={(v) => setWeekend({ ...weekend, bdWorkingDays: v })} />
                <TextField label="Off days" value={weekend.bdOffDays} onChange={(v) => setWeekend({ ...weekend, bdOffDays: v })} />
              </div>
            </div>
            <NumberField label="Weekly admin delay (days)" value={weekend.weeklyAdminDelayDays} onChange={(v) => setWeekend({ ...weekend, weeklyAdminDelayDays: v })} />
            <Button onClick={() => saveSettings('Weekend info', {
              chinaWorkingDays: weekend.chinaWorkingDays, chinaOffDay: weekend.chinaOffDay,
              bdWorkingDays: weekend.bdWorkingDays, bdOffDays: weekend.bdOffDays,
              weeklyAdminDelayDays: weekend.weeklyAdminDelayDays,
            })} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save weekend info
            </Button>
          </CardContent>
        </Card>
      )}

      {/* EOQ Tab */}
      {activeTab === 'eoq' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">EOQ Parameters</CardTitle>
            <CardDescription>Used by the EOQ + Safety Stock calculations. Adjust to match your business costs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <NumberField label="Ordering cost per PO (৳)" value={eoq.orderingCostPerOrder} onChange={(v) => setEoq({ ...eoq, orderingCostPerOrder: v })} />
              <NumberField label="Holding cost %" value={eoq.holdingCostPct * 100} onChange={(v) => setEoq({ ...eoq, holdingCostPct: v / 100 })} step={1} />
              <NumberField label="Service level (%)" value={eoq.serviceLevel * 100} onChange={(v) => setEoq({ ...eoq, serviceLevel: v / 100 })} step={1} />
              <NumberField label="Review period (days)" value={eoq.reviewPeriodDays} onChange={(v) => setEoq({ ...eoq, reviewPeriodDays: v })} />
              <NumberField label="Buffer days" value={eoq.bufferDays} onChange={(v) => setEoq({ ...eoq, bufferDays: v })} />
            </div>
            <Button onClick={() => saveSettings('EOQ parameters', {
              orderingCostPerOrder: eoq.orderingCostPerOrder, holdingCostPct: eoq.holdingCostPct,
              serviceLevel: eoq.serviceLevel, reviewPeriodDays: eoq.reviewPeriodDays, bufferDays: eoq.bufferDays,
            })} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save EOQ parameters
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recommendations Tab */}
      {activeTab === 'recommendations' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Importer Recommendations</CardTitle>
            <CardDescription>Tips shown on the Air vs Sea page. Add, edit, or remove.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-1">{i + 1}</span>
                <Input value={rec} onChange={(e) => setRecommendations(prev => prev.map((r, j) => j === i ? e.target.value : r))} className="flex-1 text-xs" />
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 shrink-0" onClick={() => setRecommendations(prev => prev.filter((_, j) => j !== i))}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setRecommendations(prev => [...prev, ''])}><Plus className="h-3.5 w-3.5 mr-1" /> Add recommendation</Button>
            <Button onClick={() => saveSettings('Recommendations', { recommendations })} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />} Save recommendations
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function NumberField({ label, value, onChange, step }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step || 1} value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="h-8 text-sm" />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-8 text-sm" />
    </div>
  );
}
