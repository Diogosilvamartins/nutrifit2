import { Download } from "lucide-react";
import { Button } from "./button";

interface DownloadImageProps {
  src: string;
  filename: string;
  alt: string;
}

export const DownloadImage = ({ src, filename, alt }: DownloadImageProps) => {
  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar imagem:', error);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-6 border rounded-lg bg-background">
      <img 
        src={src} 
        alt={alt}
        className="max-w-xs max-h-xs object-contain border rounded"
      />
      <Button onClick={handleDownload} className="flex items-center gap-2">
        <Download className="h-4 w-4" />
        Baixar {filename}
      </Button>
    </div>
  );
};