import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatInTimeZone, fromZonedTime } from "date-fns-tz"

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

// Datas Brasil (America/Sao_Paulo)
const BR_TZ = 'America/Sao_Paulo'

// Retorna data (yyyy-MM-dd) no fuso do Brasil e limites do dia em UTC (ISO)
export const getBrazilDateInfo = (date: Date = new Date()) => {
  const dateStr = formatInTimeZone(date, BR_TZ, 'yyyy-MM-dd')
  const startZoned = new Date(`${dateStr}T00:00:00.000`)
  const endZoned = new Date(`${dateStr}T23:59:59.999`)
  const startUTC = fromZonedTime(startZoned, BR_TZ).toISOString()
  const endUTC = fromZonedTime(endZoned, BR_TZ).toISOString()
  return { date: dateStr, startUTC, endUTC }
}

// Converte 'yyyy-MM-dd' -> 'dd/MM/yyyy' sem criar Date (evita bug de timezone)
export const formatBRDateFromYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-')
  return `${d}/${m}/${y}`
}

