import { useEffect } from 'react';
import { createRealtimeSource } from '../api/realtime';

const useRealtimeRefresh = (events, onRefresh, pollMs = 15000) => {
  useEffect(() => {
    let mounted = true;
    const source = createRealtimeSource();
    const refresh = () => {
      if (mounted) onRefresh();
    };

    events.forEach((eventName) => {
      source?.addEventListener(eventName, refresh);
    });

    const timer = pollMs ? setInterval(refresh, pollMs) : null;

    return () => {
      mounted = false;
      events.forEach((eventName) => {
        source?.removeEventListener(eventName, refresh);
      });
      source?.close();
      if (timer) clearInterval(timer);
    };
  }, [events.join('|'), onRefresh, pollMs]);
};

export default useRealtimeRefresh;
