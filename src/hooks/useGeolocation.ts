import { Geolocation } from '@capacitor/geolocation';
import { useState } from 'react';

export const useGeolocation = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState<{ latitude: number; longitude: number } | null>(null);

  const getCurrentPosition = async () => {
    setIsLoading(true);
    try {
      const coordinates = await Geolocation.getCurrentPosition();
      const newPosition = {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
      };
      setPosition(newPosition);
      return newPosition;
    } catch (error) {
      console.error('Error getting location:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const watchPosition = (callback: (position: { latitude: number; longitude: number }) => void) => {
    return Geolocation.watchPosition(
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
      (position, err) => {
        if (err) {
          console.error('Error watching position:', err);
          return;
        }

        if (position) {
          const newPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setPosition(newPosition);
          callback(newPosition);
        }
      }
    );
  };

  return {
    getCurrentPosition,
    watchPosition,
    position,
    isLoading,
  };
};