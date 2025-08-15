import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Função para formatar valores em reais com separador de milhares
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
