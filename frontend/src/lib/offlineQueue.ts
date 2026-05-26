// frontend/src/lib/offlineQueue.ts

export interface OfflineSale {
  idempotency_key: string;
  payload: any;
  timestamp: number;
}

const STORAGE_KEY = 'farmaai_offline_sales';

export const enqueueSale = (salePayload: any, idempotencyKey: string) => {
  if (typeof window === 'undefined') return;
  const existing = getOfflineSales();
  
  const sale: OfflineSale = {
    idempotency_key: idempotencyKey,
    payload: salePayload,
    timestamp: Date.now()
  };
  
  existing.push(sale);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

export const getOfflineSales = (): OfflineSale[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const clearOfflineSale = (idempotencyKey: string) => {
  if (typeof window === 'undefined') return;
  const existing = getOfflineSales();
  const filtered = existing.filter(s => s.idempotency_key !== idempotencyKey);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const syncOfflineSales = async (apiClient: any): Promise<number> => {
  if (typeof window === 'undefined') return 0;
  if (!navigator.onLine) return 0;
  
  const sales = getOfflineSales();
  if (sales.length === 0) return 0;
  
  let synced = 0;
  
  for (const sale of sales) {
    try {
      // Intenta enviar la venta
      await apiClient.post('/pos/checkout', sale.payload);
      
      // Si fue exitosa o retornó 409 (Conflict - ya procesada antes), la quitamos de la cola
      clearOfflineSale(sale.idempotency_key);
      synced++;
    } catch (error: any) {
      if (error.response?.status === 409) {
        // Idempotency hit, we can safely clear it
        clearOfflineSale(sale.idempotency_key);
        synced++;
      } else {
        console.error("Failed to sync sale offline:", error);
      }
    }
  }
  
  return synced;
};
