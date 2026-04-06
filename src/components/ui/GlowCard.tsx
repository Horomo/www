import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

type GlowCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  accent?: 'cyan' | 'violet' | 'pink' | 'gold';
  interactive?: boolean;
};

const ACCENT_CLASSES = {
  cyan: 'before:from-cyan-300/45 before:via-sky-400/15 before:to-transparent',
  violet: 'before:from-violet-300/45 before:via-fuchsia-400/15 before:to-transparent',
  pink: 'before:from-pink-300/45 before:via-purple-400/15 before:to-transparent',
  gold: 'before:from-amber-200/45 before:via-yellow-200/15 before:to-transparent',
};

export default function GlowCard({
  children,
  accent = 'cyan',
  interactive = false,
  className,
  ...props
}: GlowCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(15,23,42,0.74),rgba(15,23,42,0.55))] p-5 shadow-[0_22px_65px_rgba(2,8,23,0.42)] backdrop-blur-xl before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] before:opacity-100 before:content-[\'\'] after:absolute after:inset-[1px] after:rounded-[27px] after:border after:border-white/6 after:content-[\'\']',
        ACCENT_CLASSES[accent],
        interactive && 'transition-all duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_28px_80px_rgba(34,211,238,0.16)] focus-within:-translate-y-1 focus-within:border-cyan-300/30',
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
