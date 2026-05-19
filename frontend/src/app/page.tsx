'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/useAuthStore';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
    } else if (user?.role === 'cajero') {
      router.replace('/sales');
    } else {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  return (
    <div className="flex h-screen items-center justify-center bg-[#FAFAFA] dark:bg-[#000000]">
      <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 dark:border-neutral-700 dark:border-t-white rounded-full animate-spin" />
    </div>
  );
}
