import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  href?: string;
  size?: 'small' | 'medium' | 'large';
  withText?: boolean;
  textColor?: string;
}

export default function Logo({
  href = '/',
  size = 'medium',
  withText = true,
  textColor = 'text-slate-900'
}: LogoProps) {
  const sizeMap = {
    small: { width: 32, height: 32 },
    medium: { width: 40, height: 40 },
    large: { width: 64, height: 64 }
  };

  const logo = (
    <div className="flex items-center gap-2">
      <Image
        src="/logo.svg"
        alt="Aluga Fácil Logo"
        width={sizeMap[size].width}
        height={sizeMap[size].height}
        priority
      />
      {withText && size !== 'small' && (
        <span className={`font-bold text-lg ${textColor}`}>Aluga Fácil</span>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{logo}</Link>;
  }

  return logo;
}
