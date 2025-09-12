import { WifiOff, Wifi } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNetwork } from "@/hooks/useNetwork";

export const OfflineIndicator = () => {
  const { isOnline, connectionType } = useNetwork();

  if (isOnline) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <WifiOff className="h-4 w-4 text-orange-600" />
      <AlertDescription className="text-orange-800">
        Você está offline. Suas alterações serão sincronizadas quando a conexão for restabelecida.
      </AlertDescription>
    </Alert>
  );
};