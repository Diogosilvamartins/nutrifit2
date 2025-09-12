import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { useState } from 'react';

export const useCamera = () => {
  const [isLoading, setIsLoading] = useState(false);

  const takePhoto = async () => {
    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      return image.webPath;
    } catch (error) {
      console.error('Error taking photo:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const pickFromGallery = async () => {
    setIsLoading(true);
    try {
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
      });

      return image.webPath;
    } catch (error) {
      console.error('Error picking from gallery:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    takePhoto,
    pickFromGallery,
    isLoading,
  };
};