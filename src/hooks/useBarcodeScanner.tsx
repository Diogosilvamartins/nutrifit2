import { useState, useEffect, useCallback } from "react";

interface UseBarcodeScanner {
  onBarcodeScanned: (barcode: string) => void;
  minLength?: number;
  timeout?: number;
}

export const useBarcodeScanner = ({ 
  onBarcodeScanned, 
  minLength = 6, 
  timeout = 100 
}: UseBarcodeScanner) => {
  const [barcode, setBarcode] = useState("");
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);

  const resetBarcode = useCallback(() => {
    setBarcode("");
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
  }, [scanTimeout]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ignora se estiver em um campo de input
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Se for Enter, processa o código escaneado
      if (event.key === 'Enter') {
        if (barcode.length >= minLength) {
          onBarcodeScanned(barcode.trim());
        }
        resetBarcode();
        return;
      }

      // Ignora teclas especiais (exceto números e letras)
      if (event.key.length > 1 && !['Backspace', 'Delete'].includes(event.key)) {
        return;
      }

      // Se for backspace, remove último caractere
      if (event.key === 'Backspace') {
        setBarcode(prev => prev.slice(0, -1));
        return;
      }

      // Adiciona caractere ao código de barras
      setBarcode(prev => prev + event.key);

      // Limpa o timeout anterior
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }

      // Define novo timeout para resetar o código
      const newTimeout = setTimeout(() => {
        if (barcode.length >= minLength) {
          onBarcodeScanned(barcode.trim());
        }
        resetBarcode();
      }, timeout);

      setScanTimeout(newTimeout);
    };

    // Adiciona o listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (scanTimeout) {
        clearTimeout(scanTimeout);
      }
    };
  }, [barcode, minLength, timeout, onBarcodeScanned, resetBarcode, scanTimeout]);

  return {
    currentBarcode: barcode,
    resetBarcode
  };
};