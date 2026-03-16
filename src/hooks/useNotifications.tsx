import { useEffect, useState } from 'react';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from '@/middleware/types.middleware';

type UseNotificationsParams = {
  token: string | null;
  user: User | null;
};

export type LiveNotification = {
  id: string;
  type: string;
  message: string;
  detail?: string;
  timestamp: string;
};

export function useNotifications({ token, user }: UseNotificationsParams) {
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);
  const [unreadLiveNotifications, setUnreadLiveNotifications] = useState(0);

  useEffect(() => {
    if (!token || !user) return;

    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data) as {
        type: string;
        message: string;
        detail?: string;
        timestamp?: string;
      };
      const notification: LiveNotification = {
        id: `${data.timestamp || Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        type: data.type,
        message: data.message,
        detail: data.detail,
        timestamp: data.timestamp || new Date().toISOString(),
      };

      setLiveNotifications((current) => [notification, ...current].slice(0, 15));
      setUnreadLiveNotifications((current) => current + 1);

      if (data.type === 'SUCCESS') {
        toast.success(
          <div className="flex flex-col">
            <span className="font-bold">{data.message}</span>
            <span className="text-[10px] opacity-70">{data.detail}</span>
          </div>,
          {
            duration: 5000,
            position: 'top-right',
            style: {
              borderRadius: '2px',
              border: '1px solid #1a1a1a',
              background: '#fff',
              color: '#1a1a1a',
            },
          }
        );
        return;
      }

      toast(
        <div className="flex flex-col">
          <span className="font-bold">{data.message}</span>
          <span className="text-[10px] opacity-70">{data.detail}</span>
        </div>,
        {
          icon: <Activity size={16} />,
          duration: 5000,
          position: 'top-right',
          style: {
            borderRadius: '2px',
            border: '1px solid #1a1a1a',
            background: '#fff',
            color: '#1a1a1a',
          },
        }
      );
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [token, user]);

  const markLiveNotificationsRead = () => {
    setUnreadLiveNotifications(0);
  };

  return {
    liveNotifications,
    unreadLiveNotifications,
    markLiveNotificationsRead,
  };
}
