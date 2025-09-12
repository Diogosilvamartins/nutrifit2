import { Network } from '@capacitor/network';
import { useState, useEffect } from 'react';

export const useNetwork = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    let listenerHandle: any;

    const setup = async () => {
      const status = await Network.getStatus();
      setIsOnline(status.connected);
      setConnectionType(status.connectionType);

      listenerHandle = await Network.addListener('networkStatusChange', status => {
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);
      });
    };

    setup();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, []);

  return {
    isOnline,
    connectionType,
    isOffline: !isOnline,
  };
};