import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBranchStore } from '@/stores/useBranchStore';

const BASE_URL = '/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // If we move to cookies later
});

// Request Interceptor: Inject JWT Token and Branch ID
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const activeBranch = useBranchStore.getState().activeBranch;
    if (activeBranch) {
      config.headers['X-Branch-ID'] = activeBranch.id;
    }
    
    const user = useAuthStore.getState().user;
    if (user && user.tenant_id) {
      config.headers['X-Tenant-ID'] = user.tenant_id;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401s, Token Refresh, and 402s
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle 402 Payment Required (Subscription Expired or Limit Exceeded)
    if (error.response?.status === 402) {
      if (typeof window !== 'undefined') {
        const detail = error.response.data.detail || {};
        if (detail.error === "limit_exceeded") {
          const limitEvent = new CustomEvent('limit-exceeded', { detail });
          window.dispatchEvent(limitEvent);
        } else {
          const event = new CustomEvent('subscription-expired', { 
            detail: detail.message || 'Suscripción expirada' 
          });
          window.dispatchEvent(event);
        }
      }
      return Promise.reject(error);
    }
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      originalRequest._retry = true;
      
      try {
        const authStore = useAuthStore.getState();
        // Since we don't have httpOnly cookies for refresh token yet, we'll need it from store
        // Wait, the backend returns it in the login response, we need to store it.
        // If it's not stored, we can't refresh. For now, assume it's in a cookie or localStorage
        const refreshToken = localStorage.getItem('refresh_token'); 
        
        if (!refreshToken) {
            throw new Error("No refresh token");
        }

        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken }, {
          headers: { 'Content-Type': 'application/json' }
        });
        
        const newToken = response.data.access_token;
        const newRefreshToken = response.data.refresh_token;
        
        localStorage.setItem('refresh_token', newRefreshToken);
        authStore.login(response.data.user, newToken);
        
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return apiClient(originalRequest);
        
      } catch (refreshError) {
        useAuthStore.getState().logout();
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
