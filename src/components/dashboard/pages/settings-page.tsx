'use client';

// ============================================
// Settings Page — System configuration
// ============================================

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Settings, User, Building2, Bell, Shield, Database,
  Globe, Palette, Clock, Key,
} from 'lucide-react';
import { useState } from 'react';

export function SettingsPage() {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-500" />
          Settings
        </h2>
        <p className="text-sm text-muted-foreground">System configuration, preferences, and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* General Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Timezone" description="Bangladesh Standard Time (UTC+6)">
              <Select defaultValue="asia-dhaka">
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asia-dhaka">Asia/Dhaka (UTC+6)</SelectItem>
                  <SelectItem value="utc">UTC</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Language" description="Interface language">
              <Select defaultValue="en">
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="bn">বাংলা (Bengali)</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Currency" description="Display currency">
              <Badge variant="outline" className="text-xs">BDT (৳)</Badge>
            </SettingRow>
          </CardContent>
        </Card>

        {/* Forecast Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Database className="h-4 w-4" />
              Forecast Defaults
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Default Model" description="Primary forecasting model">
              <Select defaultValue="ensemble">
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ensemble">Ensemble</SelectItem>
                  <SelectItem value="prophet">Prophet</SelectItem>
                  <SelectItem value="arima">ARIMA</SelectItem>
                  <SelectItem value="ets">ETS</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Confidence Level" description="Prediction interval">
              <Select defaultValue="95">
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="95">95%</SelectItem>
                  <SelectItem value="99">99%</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="Auto-recalibration" description="When MAPE > 10%">
              <Switch defaultChecked />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Stockout Alerts" description="When stock falls below safety stock">
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow label="Order Reminders" description="Order trigger date approaching">
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow label="Forecast Complete" description="Forecast generation finished">
              <Switch defaultChecked />
            </SettingRow>
            <SettingRow label="CNY Risk Warnings" description="Chinese New Year supply risk">
              <Switch defaultChecked />
            </SettingRow>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <SettingRow label="Two-Factor Auth" description="Enhanced account security">
              <Switch />
            </SettingRow>
            <SettingRow label="Session Timeout" description="Auto-logout after inactivity">
              <Select defaultValue="24h">
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="8h">8 hours</SelectItem>
                  <SelectItem value="24h">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </SettingRow>
            <SettingRow label="API Key" description="For external integrations">
              <Button size="sm" variant="outline" className="text-xs h-7">
                <Key className="h-3 w-3 mr-1" />
                Generate
              </Button>
            </SettingRow>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}
