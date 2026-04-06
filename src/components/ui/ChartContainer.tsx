import type { ReactNode } from 'react';

import GlowCard from './GlowCard';

type ChartContainerProps = {
  eyebrow: string;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function ChartContainer({
  eyebrow,
  title,
  description,
  children,
}: ChartContainerProps) {
  return (
    <GlowCard accent="violet" className="h-full p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-cyan-200/70">
        {eyebrow}
      </p>
      <h3 className="mt-3 text-xl font-semibold text-white">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-lg text-sm leading-7 text-slate-300">{description}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </GlowCard>
  );
}
