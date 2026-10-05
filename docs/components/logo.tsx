import { appName } from '@/lib/shared';

/** Brand mark (same shape as app/icon.svg) followed by the product name */
export function Logo() {
  return (
    <>
      <svg
        viewBox="0 0 32 32"
        aria-hidden
        className="size-6 shrink-0 drop-shadow-[0_0_10px_rgb(16_185_129/0.35)]"
      >
        <rect width="32" height="32" rx="8" fill="#059669" />
        <path
          d="M8 10l3 12 5-9 5 9 3-12"
          fill="none"
          stroke="#fff"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="font-semibold tracking-tight">{appName}</span>
    </>
  );
}
