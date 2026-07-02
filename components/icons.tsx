/** Minimal stroke icons, one visual voice, no icon-font dependency. */

type IconProps = { className?: string };

function base(props: IconProps) {
  return {
    className: props.className ?? "size-4",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "square" as const,
    strokeLinejoin: "miter" as const,
    "aria-hidden": true,
  };
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 5 8 12l7 7" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m4 20 1-5L16 4l4 4L9 19l-5 1z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

export function RegenerateIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12a8 8 0 1 1-2.3-5.6M20 3v4h-4" />
    </svg>
  );
}

export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M4.9 4.9l2.1 2.1m10 10 2.1 2.1M19.1 4.9 17 7m-10 10-2.1 2.1" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="5" width="16" height="16" />
      <path d="M4 10h16M9 3v4m6-4v4" />
    </svg>
  );
}

export function CoinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v8m-2.5-6.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" />
    </svg>
  );
}

export function BarbellIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12h2m14 0h2M7 8v8M17 8v8M7 12h10" />
    </svg>
  );
}

export function BulbIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18h6m-5 3h4M12 3a6 6 0 0 1 3.5 10.9c-.8.6-1.5 1.2-1.5 2.1h-4c0-.9-.7-1.5-1.5-2.1A6 6 0 0 1 12 3z" />
    </svg>
  );
}

export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H5V4zM19 4h-6" />
      <path d="M19 4v14h-6" />
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="6" y="11" width="12" height="9" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  );
}

export function CodeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m8 7-5 5 5 5m8-10 5 5-5 5M14 4l-4 16" />
    </svg>
  );
}

export function HammerIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M14 6 8 12l4 4 6-6m-4-4 2-2 6 6-2 2m-6-6 4 4M10 14l-6 6" />
    </svg>
  );
}

export function PuzzleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 4h6v4a2 2 0 1 0 4 0h1v12H4V8h3a2 2 0 1 0 2-2V4z" />
    </svg>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="m8.3 10.8 7.4-3.6m-7.4 6 7.4 3.6" />
    </svg>
  );
}

export function CommitIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M2 12h6.5m7 0H22" />
    </svg>
  );
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}
