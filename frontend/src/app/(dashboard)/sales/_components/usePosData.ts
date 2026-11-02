import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient as api } from '@/lib/axios';
import { getOfflineSales, syncOfflineSales } from '@/lib/offlineQueue';

// Conexión, catálogo, pacientes y cola de ventas offline del POS
export function usePosData({ searchQuery, patientSearch, showPatientModal }: {
  searchQuery: string;
  patientSearch: string;
  showPatientModal: boolean;
}) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [isOffline, setIsOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);

  // Network offline detection
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch Inventory
  useEffect(() => {
    const fetchProducts = async () => {
      if (isOffline) return; // In a real app, query IndexedDB here
      try {
        const res = await fetch(`/api/inventory/products?limit=50&search=${searchQuery}`);
        const data = await res.json();
        setInventory(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando productos:', e);
      }
    };
    const timeout = setTimeout(fetchProducts, 200);
    return () => clearTimeout(timeout);
  }, [searchQuery, isOffline]);

  // Fetch Patients
  useEffect(() => {
    if (!showPatientModal || isOffline) return;
    const fetchPatients = async () => {
      try {
        const res = await fetch(`/api/crm/patients?limit=15&search=${patientSearch}`);
        const data = await res.json();
        setPatients(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando pacientes:', e);
      }
    };
    const timeout = setTimeout(fetchPatients, 200);
    return () => clearTimeout(timeout);
  }, [showPatientModal, patientSearch, isOffline]);

  // Sync effect on network change
  useEffect(() => {
    const handleOnline = async () => {
      setIsSyncing(true);
      try {
        const synced = await syncOfflineSales(api);
        if (synced > 0) {
          toast.success(`Se sincronizaron ${synced} venta(s) pendiente(s)`);
        }
      } finally {
        setIsSyncing(false);
        setOfflineCount(getOfflineSales().length);
      }
    };

    // Initial check
    setOfflineCount(getOfflineSales().length);

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  const refreshOfflineCount = () => setOfflineCount(getOfflineSales().length);

  return { inventory, patients, isOffline, isSyncing, offlineCount, refreshOfflineCount };
}
