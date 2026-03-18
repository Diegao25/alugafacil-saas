'use client';

import { Suspense, ReactNode } from 'react';

interface WithSearchParamsProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function WithSearchParams({ children, fallback }: WithSearchParamsProps) {
  return (
    <Suspense fallback={fallback || (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    )}>
      {children}
    </Suspense>
  );
}
```

**Salve esse arquivo!**

---

## 📍 PASSO 2: Corrigir `/dashboard/page.tsx`

### Localização:
```
web/src/app/dashboard/page.tsx