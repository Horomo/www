'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';

type NavItem = {
  href: string;
  labelKey: 'calculator' | 'hourly' | 'home' | 'learn' | 'dayMaster' | 'tenGods' | 'luckPillars';
  isActive: (pathname: string) => boolean;
};

const DESKTOP_NAV_ITEMS: NavItem[] = [
  {
    href: '/calculator',
    labelKey: 'calculator',
    isActive: (pathname) => pathname === '/calculator' || pathname === '/calculator/result',
  },
  {
    href: '/hourly',
    labelKey: 'hourly',
    isActive: (pathname) => pathname === '/hourly',
  },
  {
    href: '/',
    labelKey: 'home',
    isActive: (pathname) => pathname === '/',
  },
  {
    href: '/learn',
    labelKey: 'learn',
    isActive: (pathname) => pathname === '/learn',
  },
  {
    href: '/learn/day-master',
    labelKey: 'dayMaster',
    isActive: (pathname) => pathname === '/learn/day-master',
  },
  {
    href: '/learn/ten-gods',
    labelKey: 'tenGods',
    isActive: (pathname) => pathname === '/learn/ten-gods',
  },
  {
    href: '/learn/luck-pillars',
    labelKey: 'luckPillars',
    isActive: (pathname) => pathname === '/learn/luck-pillars',
  },
];

export default function DesktopPrimaryNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav
      aria-label="Primary"
      className="hidden flex-wrap items-center gap-2 rounded-full bg-white/36 px-3 py-2 text-sm text-[#151d22]/72 backdrop-blur-[18px] md:flex"
    >
      {DESKTOP_NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'rounded-full bg-[#0d5d56] px-3 py-2 font-medium text-white shadow-[0_10px_24px_rgba(13,93,86,0.16)]'
                : 'rounded-full px-3 py-2 transition-all duration-300 hover:bg-white/58 hover:text-[#006a62]'
            }
          >
            {t(item.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
