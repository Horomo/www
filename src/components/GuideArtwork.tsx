import { cn } from '@/components/ui/utils';

type GuideArtworkProps = {
  seed: number;
  className?: string;
};

const ACCENTS = [
  'from-cyan-400/55 via-sky-500/15 to-transparent',
  'from-violet-400/55 via-fuchsia-500/15 to-transparent',
  'from-pink-400/55 via-orange-300/15 to-transparent',
  'from-amber-300/55 via-yellow-200/15 to-transparent',
  'from-sky-400/55 via-indigo-500/15 to-transparent',
  'from-fuchsia-400/55 via-violet-500/15 to-transparent',
];

export default function GuideArtwork({ seed, className }: GuideArtworkProps) {
  const accent = ACCENTS[seed % ACCENTS.length];

  return (
    <div
      className={cn(
        'relative h-40 overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(30,41,59,0.7))]',
        className,
      )}
      aria-hidden="true"
    >
      <div className={cn('absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,var(--tw-gradient-stops))]', accent)} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,rgba(255,255,255,0.18),transparent_24%),radial-gradient(circle_at_40%_70%,rgba(34,211,238,0.2),transparent_26%),linear-gradient(140deg,transparent_30%,rgba(255,255,255,0.05),transparent_68%)]" />
      <div className="absolute inset-x-8 bottom-8 top-8 rounded-[20px] border border-white/12 bg-white/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm">
        <div className="absolute left-4 top-4 h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_20px_rgba(103,232,249,0.65)]" />
        <div className="absolute right-6 top-6 h-14 w-14 rounded-full border border-white/15 bg-white/6" />
        <div className="absolute bottom-4 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
        <div className="absolute bottom-7 left-4 h-10 w-22 rounded-full border border-white/10 bg-white/6" />
      </div>
    </div>
  );
}
