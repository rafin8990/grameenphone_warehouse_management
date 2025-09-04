'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { DrawerProvider } from '@/lib/context/drawer-context'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <DrawerProvider>
        {children}
      </DrawerProvider>
    </QueryClientProvider>
  )
}