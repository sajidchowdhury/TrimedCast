'use client';

// ============================================
// TrimedCast LEAN — Custom Events view (Session 1)
// Create / edit / delete festival sessions with custom demand effects.
// ============================================

import { useEffect, useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { formatDate, describeEffect } from '@/lib/sessions/festival-calendar';
import {
  CalendarClock, Plus, Trash2, Pencil, Loader2, X, Save, Sparkles,
} from 'lucide-react';

interface Festival {
  id: string;
  name: string;
  type: string;
  peakDate: string;
  windowStart: string;
  windowEnd: string;
  demandEffect: number;
  year: number;
  daysUntil: number;
  isUpcoming: boolean;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  religious: { label: 'Religious', color: 'bg-purple-100 text-purple-700 border-purple-200' },
  climatic: { label: 'Climatic', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  supply: { label: 'Supply', color: 'bg-orange-100 text-orange-700 border-orange-200' },
  custom: { label: 'Custom', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

export function CustomEventsView() {
  const dataVersion = useAppStore((s) => s.dataVersion);
  const bumpData = useAppStore((s) => s.bumpData);
  const [festivals, setFestivals] = useState<Festival[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('custom');
  const [peakDate, setPeakDate] = useState('');
  const [windowStart, setWindowStart] = useState('');
  const [windowEnd, setWindowEnd] = useState('');
  const [demandEffect, setDemandEffect] = useState('1.10');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/festivals');
      const json = await res.json();
      setFestivals(json.festivals || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load, dataVersion]);

  const resetForm = () => {
    setName(''); setType('custom'); setPeakDate('');
    setWindowStart(''); setWindowEnd(''); setDemandEffect('1.10');
    setEditingId(null); setShowForm(false);
  };

  const startEdit = (f: Festival) => {
    setEditingId(f.id);
    setName(f.name);
    setType(f.type);
    setPeakDate(f.peakDate);
    setWindowStart(f.windowStart);
    setWindowEnd(f.windowEnd);
    setDemandEffect(String(f.demandEffect));
    setShowForm(true);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
    // Default to a date 60 days from now
    const d = new Date();
    d.setDate(d.getDate() + 60);
    setPeakDate(d.toISOString().slice(0, 10));
    const ws = new Date(d);
    ws.setDate(ws.getDate() - 20);
    setWindowStart(ws.toISOString().slice(0, 10));
    setWindowEnd(d.toISOString().slice(0, 10));
  };

  const save = async () => {
    if (!name || !peakDate || !demandEffect) {
      toast.error('Missing fields', { description: 'Name, peak date, and demand effect are required.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name, type, peakDate,
        windowStart: windowStart || undefined,
        windowEnd: windowEnd || undefined,
        demandEffect: Number(demandEffect),
      };
      const url = editingId ? `/api/festivals/${editingId}` : '/api/festivals';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Save failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success(editingId ? 'Event updated' : 'Event created', {
        description: `${name} — ${describeEffect(Number(demandEffect))}`,
      });
      resetForm();
      load();
      bumpData();
    } catch (e) {
      toast.error('Save failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setSaving(false); }
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/festivals/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        toast.error('Delete failed', { description: json.error || 'Unknown error' });
        return;
      }
      toast.success('Event deleted', { description: name });
      load();
      bumpData();
    } catch (e) {
      toast.error('Delete failed', { description: e instanceof Error ? e.message : 'Unknown error' });
    } finally { setDeleting(null); }
  };

  const upcoming = festivals.filter((f) => f.isUpcoming);
  const past = festivals.filter((f) => !f.isUpcoming);

  return (
    <div className="space-y-5">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                Custom Events
              </CardTitle>
              <CardDescription className="mt-1">
                Create your own festival or event with a custom demand effect. The forecast engine will automatically apply it to the right months.
              </CardDescription>
            </div>
            <Button onClick={startCreate} disabled={showForm}>
              <Plus className="h-4 w-4 mr-2" /> New event
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{editingId ? 'Edit event' : 'Create new event'}</span>
              <Button variant="ghost" size="icon" onClick={resetForm} className="h-7 w-7">
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Event name *</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Pohela Boishakh, Ramadan, Black Friday" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="type">Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">Custom</SelectItem>
                    <SelectItem value="religious">Religious</SelectItem>
                    <SelectItem value="climatic">Climatic</SelectItem>
                    <SelectItem value="supply">Supply disruption</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="peak">Peak date *</Label>
                <Input id="peak" type="date" value={peakDate} onChange={(e) => setPeakDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ws">Window start</Label>
                <Input id="ws" type="date" value={windowStart} onChange={(e) => setWindowStart(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="we">Window end</Label>
                <Input id="we" type="date" value={windowEnd} onChange={(e) => setWindowEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="effect">Demand effect * <span className="text-xs text-muted-foreground font-normal">(1.0 = no change, 1.10 = +10% lift, 0.70 = -30% drop)</span></Label>
              <Input id="effect" type="number" step="0.01" min="0" max="5" value={demandEffect} onChange={(e) => setDemandEffect(e.target.value)} />
              {demandEffect && !isNaN(Number(demandEffect)) && (
                <p className="text-xs text-muted-foreground mt-1">
                  → {describeEffect(Number(demandEffect))}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t">
              <Button variant="outline" onClick={resetForm}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {editingId ? 'Update event' : 'Create event'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming events */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Events ({upcoming.length})</CardTitle>
          <CardDescription>Events the forecast engine will apply to future months</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : upcoming.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground text-center">No upcoming events. Create one above.</p>
          ) : (
            <div className="divide-y">
              {upcoming.map((f) => (
                <FestivalRow
                  key={f.id}
                  f={f}
                  onEdit={() => startEdit(f)}
                  onDelete={() => remove(f.id, f.name)}
                  deleting={deleting === f.id}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past events */}
      {past.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Past Events ({past.length})</CardTitle>
            <CardDescription>Events that have already passed — kept for historical reference</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {past.map((f) => (
                <FestivalRow
                  key={f.id}
                  f={f}
                  onEdit={() => startEdit(f)}
                  onDelete={() => remove(f.id, f.name)}
                  deleting={deleting === f.id}
                  dimmed
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function FestivalRow({
  f, onEdit, onDelete, deleting, dimmed,
}: {
  f: Festival;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  dimmed?: boolean;
}) {
  const typeInfo = TYPE_LABELS[f.type] || TYPE_LABELS.custom;
  return (
    <div className={`flex items-center gap-3 p-3 ${dimmed ? 'opacity-60' : ''}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{f.name}</span>
          <Badge variant="outline" className={`text-[10px] ${typeInfo.color}`}>{typeInfo.label}</Badge>
          <Badge variant="outline" className="text-[10px]">{describeEffect(f.demandEffect)}</Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Peak: {formatDate(f.peakDate)} · Window: {formatDate(f.windowStart)} – {formatDate(f.windowEnd)}
          {f.daysUntil > 0 && <span className="ml-2">· {f.daysUntil} days away</span>}
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={onEdit} className="h-8 w-8" title="Edit">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} disabled={deleting} className="h-8 w-8 text-red-600 hover:text-red-700" title="Delete">
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
