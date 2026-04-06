import Link from 'next/link';

import type { LearnGuide } from '@/lib/learn';
import GuideArtwork from '@/components/GuideArtwork';
import Badge from '@/components/ui/Badge';
import GlowCard from '@/components/ui/GlowCard';
import { buttonClassName } from '@/components/ui/Button';

type LearnGuideCardProps = {
  guide: LearnGuide;
  index: number;
};

export default function LearnGuideCard({ guide, index }: LearnGuideCardProps) {
  return (
    <GlowCard accent={index % 3 === 0 ? 'cyan' : index % 3 === 1 ? 'violet' : 'pink'} interactive className="h-full p-4 sm:p-5">
      <GuideArtwork seed={index} />
      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <Badge tone="violet">Guide</Badge>
          <h2 className="mt-3 text-xl font-semibold leading-tight text-white">
            <Link href={guide.href} className="transition-colors hover:text-cyan-100">
              {guide.title}
            </Link>
          </h2>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-300">{guide.excerpt}</p>
      <p className="mt-3 text-sm leading-7 text-slate-400">{guide.description}</p>
      <div className="mt-5">
        <Link href={guide.href} className={buttonClassName('secondary', 'sm')}>
          Read guide
        </Link>
      </div>
    </GlowCard>
  );
}
