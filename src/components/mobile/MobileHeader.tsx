import { ArrowLeft, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface MobileHeaderProps {
  title: string;
  showBack?: boolean;
  onMenuClick?: () => void;
}

export const MobileHeader = ({ title, showBack = false, onMenuClick }: MobileHeaderProps) => {
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          {showBack && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <h1 className="font-semibold text-lg truncate">{title}</h1>
        </div>
        
        {onMenuClick && (
          <Button variant="ghost" size="sm" onClick={onMenuClick}>
            <Menu className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
};