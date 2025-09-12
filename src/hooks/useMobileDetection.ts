import { useState, useEffect } from 'react';

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const width = window.innerWidth;
      
      // Detectar dispositivos móveis
      const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
      const isMobileDevice = mobileRegex.test(userAgent) || width < 768;
      
      // Detectar tablets
      const isTabletDevice = (width >= 768 && width < 1024) || 
                            /iPad/i.test(userAgent) || 
                            (width >= 768 && /Android/i.test(userAgent));
      
      setIsMobile(isMobileDevice && !isTabletDevice);
      setIsTablet(isTabletDevice);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
  };
};