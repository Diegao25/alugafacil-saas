export const plansAccessEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_PLANS === 'true';

export const trialEnforcementEnabled =
  process.env.NODE_ENV !== 'production' ||
  process.env.NEXT_PUBLIC_ENABLE_TRIAL_ENFORCEMENT === 'true';

export const inAppWhatsappSupportEnabled =
  process.env.NEXT_PUBLIC_ENABLE_IN_APP_WHATSAPP_SUPPORT !== 'false';
