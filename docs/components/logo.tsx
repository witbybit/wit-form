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
        {/* Form fields; only the active one is lit, like a field-level re-render */}
        <rect
          x="7"
          y="8.5"
          width="18"
          height="4"
          rx="2"
          fill="#fff"
          fillOpacity="0.4"
        />
        <rect x="7" y="14" width="18" height="4" rx="2" fill="#fff" />
        <rect
          x="7"
          y="19.5"
          width="11"
          height="4"
          rx="2"
          fill="#fff"
          fillOpacity="0.4"
        />
      </svg>
      <span className="font-semibold tracking-tight">{appName}</span>
    </>
  );
}
