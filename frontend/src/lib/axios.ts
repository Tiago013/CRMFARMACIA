import axios from 'axios';
import { useAuthStore } from '@/stores/useAuthStore';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // If we move to cookies later
});

// Request Interceptor: Inject JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401s and Token Refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Here we would call the refresh token endpoint
        // const response = await axios.post(`${BASE_URL}/auth/refresh`, {}, { withCredentials: true });
        // const newToken = response.data.access_token;
        
        // useAuthStore.getState().setToken(newToken);
        // originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        // return apiClient(originalRequest);
        
        // For MVP, if 401, we just logout
        useAuthStore.getState().logout();
        window.location.href = '/login';
        
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
