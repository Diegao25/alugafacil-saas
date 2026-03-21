export const plansAccessEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_PLANS === 'true';
