// The Snyamson Desk brand mark: the Snyamson tile and S over a sand rule, the same
// shapes as the favicon in `app/icon.svg`. It keeps its own colours on every background.
// Decorative — the caller sets the size via className.
export default function ItsAPlanMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="7" fill="#053D3A" />
      <path
        d="M22 9H13.6a2.6 2.6 0 0 0 0 5.2h4.8a2.6 2.6 0 0 1 0 5.2H10"
        stroke="#FFE2B8"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 24.2H22" stroke="#F0C177" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
