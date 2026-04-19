'use client';

import AdminPage from '@/components/AdminPage';
import { useRouter } from 'next/navigation';

export default function AdminRoute() {
  const router = useRouter();

  return <AdminPage onBack={() => router.push('/')} />;
}
