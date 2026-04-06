import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,#006a62,#40e0d0_60%,#9bf3eb)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_14px_32px_rgba(64,224,208,0.22)] hover:-translate-y-0.5 hover:brightness-[1.03] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_18px_38px_rgba(64,224,208,0.28)] focus-visible:ring-[#40e0d0]/45 before:absolute before:inset-[1px] before:rounded-full before:bg-[linear-gradient(180deg,rgba(255,255,255,0.32),transparent_42%)] before:content-[\'\']',
  secondary:
    'bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(255,255,255,0.28))] text-[#006a62] shadow-[inset_0_0_0_1px_rgba(0,106,98,0.14),inset_0_1px_0_rgba(255,255,255,0.82)] hover:-translate-y-0.5 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0.4))] hover:text-[#005750] focus-visible:ring-[#40e0d0]/35',
  ghost:
    'bg-transparent text-[#151d22]/72 hover:bg-white/40 hover:text-[#151d22] focus-visible:ring-[#40e0d0]/25',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 text-sm',
  md: 'px-4.5 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
};

export function buttonClassName(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cn(
    'relative inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.08em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
    VARIANT_CLASSES[variant],
    SIZE_CLASSES[size],
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className,
  icon,
  children,
  ...props
}: ButtonProps) {
  return (
    <button className={cn(buttonClassName(variant, size), className)} {...props}>
      <span className="relative z-10 inline-flex items-center gap-2">
        {icon}
        {children}
      </span>
    </button>
  );
}
