import type { HTMLAttributes } from 'react';

import { cn } from './utils';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'cyan' | 'violet' | 'pink' | 'gold' | 'danger';
};

const TONE_CLASSES: Record<NonNullable<BadgeProps['tone']>, string> = {
  default: 'bg-white/52 text-[#151d22]/72 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.65)]',
  cyan: 'bg-[linear-gradient(135deg,rgba(64,224,208,0.28),rgba(255,255,255,0.42))] text-[#006a62] shadow-[inset_0_0_0_1px_rgba(64,224,208,0.18)]',
  violet: 'bg-[linear-gradient(135deg,rgba(255,183,194,0.3),rgba(255,255,255,0.42))] text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.12)]',
  pink: 'bg-[linear-gradient(135deg,rgba(255,183,194,0.34),rgba(255,255,255,0.46))] text-[#874e58] shadow-[inset_0_0_0_1px_rgba(255,183,194,0.24)]',
  gold: 'bg-[linear-gradient(135deg,rgba(252,212,0,0.3),rgba(255,255,255,0.44))] text-[#705d00] shadow-[inset_0_0_0_1px_rgba(112,93,0,0.12)]',
  danger: 'bg-[linear-gradient(135deg,rgba(255,183,194,0.42),rgba(255,255,255,0.42))] text-[#874e58] shadow-[inset_0_0_0_1px_rgba(135,78,88,0.16)]',
};

export default function Badge({ tone = 'default', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.22em]',
        TONE_CLASSES[tone],
        className,
      )}
      {...props}
    />
  );
}
