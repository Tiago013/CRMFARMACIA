import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type EventCallbacks = {
  [key: string]: (data: any) => void;
};

/**
 * Hook de eventos en tiempo real.
 * Migrado a Serverless: Las actualizaciones se manejan actualmente mediante revalidación
 * de Server Actions o SWR/React Query. 
 * Esta es una versión no-op para evitar errores en la consola y mantener retrocompatibilidad.
 */
export function useRealtimeEvents(callbacks?: EventCallbacks) {
  // En el futuro, aquí se puede conectar a Supabase Realtime si es necesario:
  // const supabase = createClient();
  // supabase.channel('table-db-changes').on('postgres_changes', ...).subscribe();

  useEffect(() => {
    // No-op
  }, []);
}

