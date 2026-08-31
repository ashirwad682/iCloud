import React, { useEffect, useState } from 'react';
import { Sparkles, Users, HardDrive, Cpu, Activity, ShieldAlert } from 'lucide-react';
import { api } from '../services/api';
import { format } from 'date-fns';

export const AdminPage: React.FC = () => {
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await api.get('/admin/telemetry');
        if (res.data?.success) {
          setTelemetry(res.data.data);
        }
      } catch {
        // Ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchTelemetry();
  }, []);

  if (isLoading) {
    return <div className="p-8 text-xs text-muted-foreground">Loading admin telemetry...</div>;
  }

  if (!telemetry) {
    return <div className="p-8 text-xs text-destructive">Admin authorization required.</div>;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto pb-28">
      <div>
        <h1 className="font-display font-bold text-2xl text-foreground">Admin Telemetry & Health</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          System health, total users, storage usage, and recent audit logs
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl glass-panel border border-border space-y-2">
          <div className="flex items-center space-x-2 text-primary text-xs font-semibold">
            <Users className="w-4 h-4" />
            <span>Registered Users</span>
          </div>
          <div className="text-2xl font-bold font-display">{telemetry.totalUsers}</div>
        </div>

        <div className="p-5 rounded-3xl glass-panel border border-border space-y-2">
          <div className="flex items-center space-x-2 text-vault-azure text-xs font-semibold">
            <HardDrive className="w-4 h-4" />
            <span>Total Media Items</span>
          </div>
          <div className="text-2xl font-bold font-display">{telemetry.totalMedia}</div>
        </div>

        <div className="p-5 rounded-3xl glass-panel border border-border space-y-2">
          <div className="flex items-center space-x-2 text-vault-emerald text-xs font-semibold">
            <Activity className="w-4 h-4" />
            <span>Active Sessions</span>
          </div>
          <div className="text-2xl font-bold font-display">{telemetry.activeSessions}</div>
        </div>

        <div className="p-5 rounded-3xl glass-panel border border-border space-y-2">
          <div className="flex items-center space-x-2 text-vault-purple text-xs font-semibold">
            <Cpu className="w-4 h-4" />
            <span>Storage Consumed</span>
          </div>
          <div className="text-2xl font-bold font-display">
            {(telemetry.totalStorageBytes / (1024 * 1024)).toFixed(1)} MB
          </div>
        </div>
      </div>

      {/* Audit Log Feed */}
      <div className="p-6 rounded-3xl glass-panel border border-border space-y-4">
        <h3 className="font-semibold text-sm text-foreground flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 text-primary" />
          <span>Recent Immutable Audit Logs</span>
        </h3>

        <div className="divide-y divide-border/40 text-xs">
          {telemetry.recentAuditLogs.length === 0 ? (
            <div className="py-4 text-muted-foreground text-center">No audit logs recorded yet.</div>
          ) : (
            telemetry.recentAuditLogs.map((log: any) => (
              <div key={log._id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-semibold text-foreground mr-2">{log.action}</span>
                  <span className="text-muted-foreground">{log.targetResource}</span>
                </div>
                <span className="text-muted-foreground text-[11px]">
                  {format(new Date(log.timestamp), 'PP p')}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
