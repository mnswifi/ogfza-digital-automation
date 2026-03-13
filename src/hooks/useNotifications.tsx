import { useEffect } from 'react';
import { Activity } from 'lucide-react';
import toast from 'react-hot-toast';
import { User } from '@/middleware/types.middleware';

type UseNotificationsParams = {
  token: string | null;
  user: User | null;
};

export function useNotifications({ token, user }: UseNotificationsParams) {
  useEffect(() => {
    if (!token || !user) return;

    const eventSource = new EventSource('/api/notifications/stream');

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

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
}