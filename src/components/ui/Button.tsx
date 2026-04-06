import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { cn } from './utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(72,214,255,0.95),rgba(168,85,247,0.92)_58%,rgba(244,114,182,0.88))] text-slate-950 shadow-[0_0_35px_rgba(56,189,248,0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_45px_rgba(168,85,247,0.38)] focus-visible:ring-cyan-300/60',
  secondary:
    'border border-white/12 bg-white/8 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_30px_rgba(15,23,42,0.32)] hover:-translate-y-0.5 hover:border-cyan-300/30 hover:bg-white/12 focus-visible:ring-cyan-300/40',
  ghost:
    'border border-transparent bg-transparent text-slate-200 hover:bg-white/8 hover:text-white focus-visible:ring-cyan-300/30',
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
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-[0.02em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60',
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
      {icon}
      {children}
    </button>
  );
}
