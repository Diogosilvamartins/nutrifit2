import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, AlertCircle, Info, ShoppingCart } from "lucide-react";

interface ToastOptions {
  title: string;
  description?: string;
  type?: "success" | "error" | "warning" | "info" | "cart";
  duration?: number;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  cart: ShoppingCart,
};

const colorMap = {
  success: "text-green-600",
  error: "text-red-600", 
  warning: "text-yellow-600",
  info: "text-blue-600",
  cart: "text-primary",
};

export const showToast = ({ title, description, type = "info", duration = 3000 }: ToastOptions) => {
  const Icon = iconMap[type];
  const emoji = type === "success" ? "✅" : type === "error" ? "❌" : type === "warning" ? "⚠️" : type === "cart" ? "🛒" : "ℹ️";
  
  toast({
    title: `${emoji} ${title}`,
    description,
    duration,
  });
};

// Convenience methods
export const successToast = (title: string, description?: string) => 
  showToast({ title, description, type: "success" });

export const errorToast = (title: string, description?: string) => 
  showToast({ title, description, type: "error" });

export const cartToast = (title: string, description?: string) => 
  showToast({ title, description, type: "cart" });

export const warningToast = (title: string, description?: string) => 
  showToast({ title, description, type: "warning" });

export const infoToast = (title: string, description?: string) => 
  showToast({ title, description, type: "info" });