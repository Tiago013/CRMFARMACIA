import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type EventCallbacks = {
  [key: string]: (data: any) => void;
};

/**
 * Hook de eventos en tiempo real (SSE).
 * Se conecta al backend solo si está disponible. 
 * Si el backend no está corriendo, no spamea la consola.
 */
export function useRealtimeEvents(callbacks?: EventCallbacks) {
  const queryClient = useQueryClient();
  const hasLoggedError = useRef(false);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCount = useRef(0);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let isCancelled = false;

    const connect = () => {
      if (isCancelled) return;

      try {
        eventSource = new EventSource('http://localhost:8000/api/v1/events/stream', {
          withCredentials: true
        });

        eventSource.onopen = () => {
          hasLoggedError.current = false; // Reset on successful connection
          retryCount.current = 0; // Reset exponential backoff
        };

        eventSource.onmessage = () => {
          // General messages (no-op)
        };

        // Mapping of generic invalidations based on event types
        const defaultEventHandlers: EventCallbacks = {
          'sale.completed': (data) => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] });
            queryClient.invalidateQueries({ queryKey: ['sales'] });
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            toast.success(`Nueva venta registrada por $${data?.total?.toLocaleString()}`);
          },
          'inventory.stock_updated': (_data) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] });
            toast.info('Inventario actualizado');
          },
          'patient.created': (_data) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] });
            toast.success('Nuevo paciente registrado');
          },
          'patient.updated': (_data) => {
            queryClient.invalidateQueries({ queryKey: ['patients'] });
          },
          'expense.registered': (_data) => {
            queryClient.invalidateQueries({ queryKey: ['finance'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard-snapshot'] });
          },
          'supplier.order_received': (_data) => {
            queryClient.invalidateQueries({ queryKey: ['inventory'] });
            queryClient.invalidateQueries({ queryKey: ['finance'] });
          }
        };

        const handlers = { ...defaultEventHandlers, ...callbacks };

        Object.keys(handlers).forEach(eventType => {
          eventSource!.addEventListener(eventType, (e: unknown) => {
            try {
              const event = e as MessageEvent;
              const data = JSON.parse(event.data);
              handlers[eventType](data);
            } catch (_err) {
              // Silently ignore parse errors
            }
          });
        });

        eventSource.onerror = () => {
          // Log only once to avoid console spam
          if (!hasLoggedError.current) {
            console.warn('[FarmaAI] SSE: Backend no disponible. Reintentando en segundo plano...');
            hasLoggedError.current = true;
          }
          // Close and retry after delay
          eventSource?.close();
          eventSource = null;
          
          if (!isCancelled) {
            // Exponential backoff logic: 1s, 2s, 4s, 8s, max 15s
            const delay = Math.min(1000 * Math.pow(2, retryCount.current), 15000);
            retryCount.current += 1;
            retryTimer.current = setTimeout(connect, delay);
          }
        };
      } catch {
        // Connection failed entirely, retry later
        if (!isCancelled) {
          const delay = Math.min(1000 * Math.pow(2, retryCount.current), 15000);
          retryCount.current += 1;
          retryTimer.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isCancelled = true;
      eventSource?.close();
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [queryClient, callbacks]);
}
