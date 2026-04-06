import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

type GlowCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  accent?: 'cyan' | 'violet' | 'pink' | 'gold';
  interactive?: boolean;
};

const ACCENT_CLASSES = {
  cyan: 'before:from-[rgba(64,224,208,0.3)] before:via-[rgba(64,224,208,0.08)] before:to-transparent',
  violet: 'before:from-[rgba(135,78,88,0.24)] before:via-[rgba(255,183,194,0.14)] before:to-transparent',
  pink: 'before:from-[rgba(255,183,194,0.36)] before:via-[rgba(135,78,88,0.08)] before:to-transparent',
  gold: 'before:from-[rgba(252,212,0,0.34)] before:via-[rgba(252,212,0,0.12)] before:to-transparent',
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
        'relative overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,rgba(255,255,255,0.76),rgba(255,255,255,0.58)_50%,rgba(241,250,255,0.74))] p-5 shadow-[0_26px_60px_rgba(0,106,98,0.08)] backdrop-blur-[22px] before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,var(--tw-gradient-stops))] before:opacity-100 before:content-[\'\'] after:absolute after:inset-[1px] after:rounded-[31px] after:bg-[linear-gradient(180deg,rgba(255,255,255,0.34),transparent_42%,rgba(64,224,208,0.06))] after:content-[\'\']',
        ACCENT_CLASSES[accent],
        interactive && 'transition-all duration-300 hover:-translate-y-1 hover:brightness-[1.025] hover:shadow-[0_30px_68px_rgba(0,106,98,0.12)] focus-within:-translate-y-1 focus-within:shadow-[0_0_0_4px_rgba(64,224,208,0.12),0_26px_62px_rgba(0,106,98,0.11)]',
        className,
      )}
      {...props}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
}
