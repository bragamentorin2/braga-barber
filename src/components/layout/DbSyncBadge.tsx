import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Activity } from 'lucide-react';

export function DbSyncBadge() {
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('logs')
      .select('data_atual')
      .eq('id_logs', 1)
      .single()
      .then(({ data }) => {
        if (data?.data_atual) {
          const d = new Date(data.data_atual);
          setLastSync(
            d.toLocaleString('pt-BR', {
              timeZone: 'America/Sao_Paulo',
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          );
        }
      });
  }, []);

  if (!lastSync) return null;

  return (
    <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 border border-border rounded-md px-2.5 py-1.5 select-none">
      <Activity className="w-3 h-3 text-emerald-400 shrink-0" />
      <span>
        Banco sincronizado em{' '}
        <span className="text-foreground font-medium">{lastSync}</span>
      </span>
    </div>
  );
}
