import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const DEFAULT_SUPPORT_WHATSAPP_NUMBER = '5511988392241';

// Runtime config for UI features that should react to environment changes
// without depending on a fresh client-side env bake.
export async function GET() {
  return NextResponse.json({
    supportWhatsappNumber:
      process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || DEFAULT_SUPPORT_WHATSAPP_NUMBER,
    enableInAppWhatsappSupport:
      process.env.NEXT_PUBLIC_ENABLE_IN_APP_WHATSAPP_SUPPORT !== 'false'
  });
}
