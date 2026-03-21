import { NextResponse } from 'next/server';

// Runtime config for UI features that should react to environment changes
// without depending on a fresh client-side env bake.
export async function GET() {
  return NextResponse.json({
    supportWhatsappNumber: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER || '',
    enableInAppWhatsappSupport:
      process.env.NEXT_PUBLIC_ENABLE_IN_APP_WHATSAPP_SUPPORT !== 'false'
  });
}
