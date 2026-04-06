import type { HTMLAttributes } from 'react';

import { cn } from './utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'cyan' | 'violet' | 'pink' | 'gold' | 'danger';
};

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'border-white/12 bg-white/8 text-slate-200',
  cyan: 'border-cyan-300/30 bg-cyan-400/12 text-cyan-100',
  violet: 'border-violet-300/30 bg-violet-400/12 text-violet-100',
  pink: 'border-pink-300/30 bg-pink-400/12 text-pink-100',
  gold: 'border-amber-200/30 bg-amber-300/12 text-amber-50',
  danger: 'border-rose-300/30 bg-rose-500/12 text-rose-100',
};

export default function Badge({ tone = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
