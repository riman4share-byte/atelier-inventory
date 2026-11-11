import type { SVGProps } from 'react';

/**
 * Icon set — 24px grid, 1.5px stroke, round caps and joins.
 *
 * Every glyph is drawn on the same grid with the same optical weight so a row
 * of them reads as one instrument panel rather than a pile of clip-art. Render
 * them at 16px (the default in components) or 20px for standalone actions.
 */

type IconProps = SVGProps<SVGSVGElement>;

function glyph(children: React.ReactNode) {
  return function Icon({ strokeWidth = 1.5, ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        {...props}
      >
        {children}
      </svg>
    );
  };
}

/* -- Navigation and structure -------------------------------------------- */

export const GridIcon = glyph(
  <>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </>,
);

export const GownIcon = glyph(
  <>
    <path d="M9.2 3h5.6l-.9 3.4H10.1L9.2 3Z" />
    <path d="M9.4 6.4h5.2l1.5 4.2H7.9l1.5-4.2Z" />
    <path d="M7.9 10.6h8.2L19.6 21H4.4l3.5-10.4Z" />
  </>,
);

export const CameraIcon = glyph(
  <>
    <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.3-2h8l1.3 2h2.2A1.5 1.5 0 0 1 21 8.5v9A1.5 1.5 0 0 1 19.5 19h-15A1.5 1.5 0 0 1 3 17.5v-9Z" />
    <circle cx="12" cy="13" r="3.4" />
  </>,
);

export const BoxesIcon = glyph(
  <>
    <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
    <path d="M3 8.5V16l9 4.5V12" />
    <path d="M21 8.5V16l-9 4.5" />
  </>,
);

export const PersonIcon = glyph(
  <>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.8 20c1.3-3.7 3.9-5.6 7.2-5.6s5.9 1.9 7.2 5.6" />
  </>,
);

export const SlidersIcon = glyph(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>,
);

export const ListIcon = glyph(
  <>
    <path d="M8 6h13M8 12h13M8 18h13" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
  </>,
);

export const ColumnsIcon = glyph(
  <>
    <rect x="3" y="4" width="18" height="16" rx="1.5" />
    <path d="M9 4v16" />
  </>,
);

export const BarChartIcon = glyph(
  <>
    <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
  </>,
);

/* -- Actions -------------------------------------------------------------- */

export const PlusIcon = glyph(<path d="M12 5v14M5 12h14" />);
export const MinusIcon = glyph(<path d="M5 12h14" />);
export const XIcon = glyph(<path d="M6 6l12 12M18 6 6 18" />);
export const CheckIcon = glyph(<path d="m4.5 12.5 5 5 10-11" />);
export const SearchIcon = glyph(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </>,
);
export const FilterIcon = glyph(<path d="M3.5 5.5h17l-6.5 7.5v6l-4 2v-8L3.5 5.5Z" />);
export const TrashIcon = glyph(
  <>
    <path d="M4.5 6.5h15M9.5 6.5V4.5h5v2M6.5 6.5 7.5 20h9l1-13.5" />
    <path d="M10.5 10v6M13.5 10v6" />
  </>,
);
export const PencilIcon = glyph(
  <>
    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
    <path d="m14.5 6 3 3" />
  </>,
);
export const ArrowLeftIcon = glyph(<path d="M19 12H5m0 0 6-6m-6 6 6 6" />);
export const ChevronRightIcon = glyph(<path d="m9 5 7 7-7 7" />);
export const ChevronDownIcon = glyph(<path d="m5 9 7 7 7-7" />);
export const MoreIcon = glyph(
  <>
    <circle cx="5.5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="18.5" cy="12" r="1" />
  </>,
);
export const DownloadIcon = glyph(
  <>
    <path d="M12 3.5v11m0 0 4-4m-4 4-4-4" />
    <path d="M4.5 17.5v2A1.5 1.5 0 0 0 6 21h12a1.5 1.5 0 0 0 1.5-1.5v-2" />
  </>,
);
export const RefreshIcon = glyph(
  <>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20 4v4.5h-4.5" />
  </>,
);
export const SendIcon = glyph(
  <>
    <path d="M20.5 3.5 10 14" />
    <path d="M20.5 3.5 14 20.5 10 14 3.5 10 20.5 3.5Z" />
  </>,
);
export const ExternalLinkIcon = glyph(
  <>
    <path d="M14 4h6v6" />
    <path d="M20 4 10 14" />
    <path d="M18 14v4.5A1.5 1.5 0 0 1 16.5 20h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
  </>,
);
export const EyeIcon = glyph(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);

/* -- Status and domain ---------------------------------------------------- */

export const AlertIcon = glyph(
  <>
    <path d="M12 4.5 21 19.5H3L12 4.5Z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
);
export const InfoIcon = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);
export const LockIcon = glyph(
  <>
    <rect x="4.5" y="10" width="15" height="10" rx="1.5" />
    <path d="M8 10V7.6a4 4 0 0 1 8 0V10" />
  </>,
);
export const GlobeIcon = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17" />
    <path d="M12 3.5c2.4 2.4 3.6 5.3 3.6 8.5s-1.2 6.1-3.6 8.5c-2.4-2.4-3.6-5.3-3.6-8.5S9.6 5.9 12 3.5Z" />
  </>,
);
export const ClockIcon = glyph(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </>,
);
export const ImageIcon = glyph(
  <>
    <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m4.5 17 4.5-4.5 3.5 3.5 3-3 4 4" />
  </>,
);
export const TruckIcon = glyph(
  <>
    <path d="M2.5 6.5h10v10h-10z" />
    <path d="M12.5 10h4l3 3v3.5h-7" />
    <circle cx="7" cy="18" r="1.8" />
    <circle cx="16.5" cy="18" r="1.8" />
  </>,
);
export const PackageIcon = glyph(
  <>
    <path d="M12 3.5 20 8v8l-8 4.5L4 16V8l8-4.5Z" />
    <path d="M4 8l8 4.5L20 8M12 12.5V21" />
  </>,
);
export const TagIcon = glyph(
  <>
    <path d="M3.5 11V4.5h6.5l10 10-6.5 6.5-10-10Z" />
    <circle cx="7" cy="8" r="1.2" />
  </>,
);
export const LinkIcon = glyph(
  <>
    <path d="M10 13.5a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7L11.5 6.3" />
    <path d="M14 10.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5" />
  </>,
);
export const PrinterIcon = glyph(
  <>
    <path d="M7 9V3.5h10V9" />
    <path d="M7 17.5H4.5A1.5 1.5 0 0 1 3 16V11a1.5 1.5 0 0 1 1.5-1.5h15A1.5 1.5 0 0 1 21 11v5a1.5 1.5 0 0 1-1.5 1.5H17" />
    <rect x="7" y="14" width="10" height="6.5" rx="1" />
  </>,
);
export const QrIcon = glyph(
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1" />
    <path d="M13.5 13.5h3v3h-3zM18 18h2.5v2.5H18z" />
  </>,
);
export const UploadIcon = glyph(
  <>
    <path d="M12 20.5v-11m0 0 4 4m-4-4-4 4" />
    <path d="M4.5 6.5v-2A1.5 1.5 0 0 1 6 3h12a1.5 1.5 0 0 1 1.5 1.5v2" />
  </>,
);

export const TerminalIcon = glyph(
  <>
    <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
    <path d="m7 10 2.5 2.5L7 15" />
    <path d="M12.5 15H17" />
  </>,
);
