import { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, X, CheckCheck, ExternalLink } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useStellar } from '../contexts/StellarProvider';
import type { Notification } from '@solshare/shared';
import { fmt } from '../lib/format';

export function NotificationBell() {
  const { publicKey } = useStellar();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const { data: count } = useQuery({
    queryKey: ['notifications-count', publicKey],
    queryFn: () => api.notificationCount(publicKey!),
    enabled: Boolean(publicKey),
    refetchInterval: 15_000,
  });

  const { data } = useQuery({
    queryKey: ['notifications', publicKey],
    queryFn: () => api.notifications({ address: publicKey! }),
    enabled: Boolean(publicKey),
    refetchInterval: 15_000,
  });

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!publicKey) return null;

  const unread = count?.unread ?? 0;
  const items = data?.items ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-lg hover:bg-white/5 transition"
        aria-label="Notifications"
      >
        {unread > 0 ? (
          <BellRing className="w-4 h-4 text-sun-400" />
        ) : (
          <Bell className="w-4 h-4 text-ink-300" />
        )}
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ember-500 text-[10px] font-bold flex items-center justify-center text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[420px] overflow-y-auto card p-1 z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button
                className="text-xs text-ink-400 hover:text-white flex items-center gap-1"
                onClick={async () => {
                  await api.markNotificationsRead({ address: publicKey, markAll: true, ids: [] });
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                  queryClient.invalidateQueries({ queryKey: ['notifications-count'] });
                }}
              >
                <CheckCheck className="w-3 h-3" /> Mark all read
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-400">
              <Bell className="w-5 h-5 mx-auto mb-2" />
              No notifications yet
            </div>
          ) : (
            items.slice(0, 10).map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function NotificationItem({ notification: n }: { notification: Notification }) {
  const severityColors: Record<string, string> = {
    info: 'bg-sky-500',
    success: 'bg-leaf-500',
    warning: 'bg-sun-400',
    error: 'bg-ember-500',
  };

  return (
    <div
      className={`px-3 py-2.5 rounded-lg transition ${
        n.read ? 'opacity-60' : 'bg-white/5'
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-1 w-2 h-2 rounded-full shrink-0 ${severityColors[n.severity] ?? 'bg-ink-400'}`}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium">{n.title}</div>
          <p className="text-xs text-ink-300 mt-0.5 line-clamp-2">{n.body}</p>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[10px] text-ink-400">
              {fmt.relative(n.createdAt)}
            </span>
            {n.actionUrl && (
              <a
                href={n.actionUrl}
                className="text-[10px] text-sun-400 hover:underline flex items-center gap-1"
              >
                {n.actionLabel ?? 'View'} <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
