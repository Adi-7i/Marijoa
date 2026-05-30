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
