type Props = {
  className?: string;
};

/** One-line RORUBARU wordmark from `public/RORUBARU fill logo one line.svg`. */
export function NavLogo({ className = "" }: Props) {
  return (
    <span
      className={`roru-nav-logo block h-[12px] w-[98px] bg-current sm:h-[14px] sm:w-[114px] ${className}`.trim()}
      aria-hidden
    />
  );
}
