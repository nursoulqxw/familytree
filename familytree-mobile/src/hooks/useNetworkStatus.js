import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { processQueue, queueSize } from '../services/syncQueue';

export function useNetworkStatus() {
  const [isOnline, setIsOnline]       = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing]         = useState(false);
  const wasOffline = useRef(false);

  const refreshPendingCount = async () => {
    setPendingCount(await queueSize());
  };

  useEffect(() => {
    refreshPendingCount();

    if (Platform.OS === 'web') {
      // On web use the browser's online/offline events
      const handleOnline = async () => {
        setIsOnline(true);
        if (wasOffline.current) {
          setSyncing(true);
          await processQueue();
          await refreshPendingCount();
          setSyncing(false);
        }
        wasOffline.current = false;
      };
      const handleOffline = () => {
        setIsOnline(false);
        wasOffline.current = true;
      };
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      setIsOnline(navigator.onLine);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }

    // Native: use NetInfo
    const NetInfo = require('@react-native-community/netinfo').default;
    const unsub = NetInfo.addEventListener(async (state) => {
      const online = Boolean(state.isConnected && state.isInternetReachable !== false);
      setIsOnline(online);
      if (online && wasOffline.current) {
        setSyncing(true);
        await processQueue();
        await refreshPendingCount();
        setSyncing(false);
      }
      wasOffline.current = !online;
    });
    return unsub;
  }, []);

  return { isOnline, pendingCount, syncing, refreshPendingCount };
}