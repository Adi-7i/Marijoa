import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function baseProps(size: number, props: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    ...props,
  };
}

export function MarijoaMark({ size = 20, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <circle cx="16" cy="16" r="3.4" fill="currentColor" />
      {Array.from({ length: 8 }).map((_, index) => {
        const angle = (index * Math.PI) / 4;
        const x = 16 + Math.cos(angle) * 8.5;
        const y = 16 + Math.sin(angle) * 8.5;
        return <circle key={index} cx={x} cy={y} r="2.2" fill="currentColor" opacity="0.9" />;
      })}
      <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.8" opacity="0.35" />
      <circle cx="16" cy="16" r="7" stroke="currentColor" strokeWidth="1.4" opacity="0.25" />
    </svg>
  );
}

export function PlusIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M12 5v14" /><path d="M5 12h14" /></svg>;
}

export function SearchIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
}

export function PanelIcon({ size = 20, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16" /><path d="m16 10-3 2 3 2" /></svg>;
}

export function MenuIcon({ size = 20, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></svg>;
}

export function ShareIcon({ size = 20, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M12 16V4" /><path d="m8 8 4-4 4 4" /></svg>;
}

export function ChevronIcon({ size = 12, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="m6 9 6 6 6-6" /></svg>;
}

export function CopyIcon({ size = 14, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
}

export function CheckIcon({ size = 14, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="m20 6-11 11-5-5" /></svg>;
}

export function ThumbsUpIcon({ size = 14, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M7 10v11" /><path d="M15 5.9 14 10h5.8a2 2 0 0 1 2 2.4l-1.3 6a2 2 0 0 1-2 1.6H7" /><path d="M7 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3" /><path d="M15 5.9V3a2 2 0 0 0-2-2l-4 9" /></svg>;
}

export function ThumbsDownIcon({ size = 14, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M17 14V3" /><path d="M9 18.1 10 14H4.2a2 2 0 0 1-2-2.4l1.3-6A2 2 0 0 1 5.5 4H17" /><path d="M17 14h3a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2h-3" /><path d="M9 18.1V21a2 2 0 0 0 2 2l4-9" /></svg>;
}

export function MoreIcon({ size = 14, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;
}

export function MicIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><path d="M12 19v3" /></svg>;
}

export function ArrowUpIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="m12 19V5" /><path d="m5 12 7-7 7 7" /></svg>;
}

export function ArrowDownIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></svg>;
}

export function PersonIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" /></svg>;
}

export function BuildingIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><rect x="4" y="2" width="16" height="20" rx="1" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" /></svg>;
}

export function LayersIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9A1 1 0 0 0 21.4 6.1Z" /><path d="m6.08 9.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.6" /><path d="m6.08 14.5-3.5 1.6a1 1 0 0 0 0 1.81l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9a1 1 0 0 0 0-1.83l-3.5-1.6" /></svg>;
}

export function BoxIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>;
}

export function FileTextIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>;
}

export function InfoIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></svg>;
}

export function SettingsIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export function XIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
}

export function PanelRightIcon({ size = 20, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M15 4v16" /></svg>;
}

export function UploadIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></svg>;
}

export function UsersIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

export function UserPlusIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>;
}

export function PlusCircleIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><circle cx="12" cy="12" r="10" /><path d="M8 12h8" /><path d="M12 8v8" /></svg>;
}

export function ShieldIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
}

export function MessageSquareIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>;
}

export function CheckCircleIcon({ size = 16, ...props }: IconProps) {
  return <svg {...baseProps(size, props)}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><path d="m9 11 3 3L22 4" /></svg>;
}
