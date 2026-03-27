import React from 'react';
import { Home, User, Globe } from 'lucide-react';

interface ReservationSourceIconProps {
  provider?: string | null;
  size?: number;
  className?: string;
  showLabel?: boolean;
}

const ReservationSourceIcon: React.FC<ReservationSourceIconProps> = ({ 
  provider, 
  size = 16, 
  className = "",
  showLabel = false
}) => {
  const getSourceConfig = (provider: string | null | undefined) => {
    const p = provider?.toLowerCase();
    
    if (p === 'airbnb') {
      return {
        icon: (
          <svg 
            viewBox="0 0 32 32" 
            xmlns="http://www.w3.org/2000/svg" 
            style={{ display: 'block', height: size, width: size, fill: 'currentColor' }}
            aria-hidden="true" 
            role="presentation" 
            focusable="false"
          >
            <path d="M16 1c2.008 0 3.463.963 4.751 3.269l.533 1.025c1.954 3.83 6.114 12.54 7.1 14.836l.145.353c.667 1.591.91 2.472.96 3.396l.01.415.001.228c0 4.062-2.877 6.478-6.357 6.478-2.224 0-4.556-1.258-6.709-3.386l-.257-.26-.172-.179h-.011l-.176.185c-2.044 2.1-4.392 3.42-6.72 3.42-3.481 0-6.358-2.416-6.358-6.478l.002-.276.014-.657.012-.236c.01-.283.154-.91.73-2.19l.267-.549c.952-1.928 5.426-10.741 7.114-14.836l.519-1.015c1.242-2.344 2.684-3.303 4.717-3.303zm0 3c-1.189 0-2.029.627-2.903 2.193l-.438.868c-1.611 3.156-5.83 11.536-6.907 13.91l-.151.348c-.463 1.1-.568 1.631-.595 2.106l-.006.315-.001.228c0 2.275 1.488 3.478 3.358 3.478 1.493 0 3.235-1.114 4.887-2.857l.162-.174.192-.21h1.594l.192.21.162.174c1.652 1.743 3.394 2.857 4.887 3.478 1.87 0 3.358-1.203 3.358-3.478l-.002-.249-.009-.452-.007-.2c-.023-.46-.117-.938-.564-2.031l-.146-.35c-1.077-2.373-5.295-10.753-6.907-13.91l-.438-.868c-.874-1.566-1.714-2.193-2.903-2.193zm0 15.5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"></path>
          </svg>
        ),
        color: 'text-[#FF5A5F]',
        bgColor: 'bg-[#FF5A5F]/10',
        label: 'Airbnb'
      };
    }
    
    if (p === 'booking') {
      return {
        icon: (
          <div 
            className="flex items-center justify-center font-bold text-white rounded-sm leading-none"
            style={{ width: size, height: size, backgroundColor: '#003580', fontSize: size * 0.7 }}
          >
            B
          </div>
        ),
        color: 'text-[#003580]',
        bgColor: 'bg-[#003580]/10',
        label: 'Booking'
      };
    }
    
    return {
      icon: <User size={size} />,
      color: 'text-slate-400',
      bgColor: 'bg-slate-100',
      label: 'Direto'
    };
  };

  const config = getSourceConfig(provider);

  if (showLabel) {
    return (
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${config.bgColor} ${config.color} ${className}`}>
        {config.icon}
        {config.label}
      </div>
    );
  }

  return (
    <div className={`${config.color} ${className}`} title={config.label}>
      {config.icon}
    </div>
  );
};

export default ReservationSourceIcon;
