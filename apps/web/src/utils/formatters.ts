/**
 * Formata centavos para Real brasileiro (R$ 34,90)
 */
export function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Retorna tempo decorrido amigável (ex: "há 4 min", "há 1h 10min")
 */
export function formatTimeAgo(isoDate: string | Date): string {
  const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diffSec < 60) {
    return 'agora mesmo';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `há ${diffMin} min`;
  }

  const diffHours = Math.floor(diffMin / 60);
  const remainingMin = diffMin % 60;
  return `há ${diffHours}h ${remainingMin > 0 ? `${remainingMin}m` : ''}`;
}

/**
 * Extrai iniciais ou ícone para o avatar
 */
export function getInitials(name: string): string {
  if (!name) return 'TP';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
