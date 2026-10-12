interface IconProps {
  className?: string;
}

export const PlayIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* مثلث التشغيل متجه لليسار في واجهة RTL */}
    <path d="M17.5 12.3 7.9 18.8c-.7.4-1.6-.1-1.6-.9V6.1c0-.8.9-1.3 1.6-.9l9.6 6.5c.6.3.6 1.2 0 1.6z" transform="scale(-1,1) translate(-24,0)" />
  </svg>
);

export const PauseIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <rect x="6" y="5" width="4" height="14" rx="1.2" />
    <rect x="14" y="5" width="4" height="14" rx="1.2" />
  </svg>
);

export const NextIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* التالي في RTL يتجه يسارًا */}
    <path d="M6 6.7v10.6c0 .8.9 1.3 1.6.9l8-5.3c.6-.4.6-1.3 0-1.7l-8-5.3c-.7-.5-1.6 0-1.6.8z" transform="scale(-1,1) translate(-24,0)" />
    <rect x="4" y="5" width="2.4" height="14" rx="1" />
  </svg>
);

export const PrevIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M6 6.7v10.6c0 .8.9 1.3 1.6.9l8-5.3c.6-.4.6-1.3 0-1.7l-8-5.3c-.7-.5-1.6 0-1.6.8z" />
    <rect x="17.6" y="5" width="2.4" height="14" rx="1" />
  </svg>
);

export const SearchIcon = ({ className = "w-5 h-5" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" strokeLinecap="round" />
  </svg>
);

export const BackIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={className}>
    {/* رجوع في RTL: سهم لليمين */}
    <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const HeadphonesIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
    <path d="M4 14v-2a8 8 0 0 1 16 0v2" strokeLinecap="round" />
    <rect x="3" y="14" width="4.5" height="6" rx="2" />
    <rect x="16.5" y="14" width="4.5" height="6" rx="2" />
  </svg>
);

export const SpinnerIcon = ({ className = "w-6 h-6" }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={`animate-spin ${className}`}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
);
