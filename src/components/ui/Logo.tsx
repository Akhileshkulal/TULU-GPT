interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

export function Logo({ size = 'md', showTagline = false }: LogoProps) {
  const boxClasses =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : size === 'lg'
        ? 'h-12 w-12 rounded-2xl'
        : 'h-9 w-9 rounded-xl';

  const titleClasses =
    size === 'sm'
      ? 'text-base'
      : size === 'lg'
        ? 'text-xl'
        : 'text-lg';

  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${boxClasses} flex shrink-0 items-center justify-center bg-[#9A3412] text-[#FAF7F2] shadow-xs`}
        aria-hidden="true"
      >
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none">
          <path
            d="M7 10.5C7 9.67157 7.67157 9 8.5 9H23.5C24.3284 9 25 9.67157 25 10.5V13H18.25V24H13.75V13H7V10.5Z"
            fill="currentColor"
          />
          <circle cx="22.5" cy="21.5" r="2.5" fill="#FDE68A" />
        </svg>
      </div>
      <div className="leading-tight">
        <span className={`${titleClasses} font-semibold tracking-tight text-[#1C1917]`}>
          TULU-GPT
        </span>
        {showTagline && (
          <p className="text-xs text-[#78716C]">Tulunadu Language &amp; Culture AI</p>
        )}
      </div>
    </div>
  );
}
