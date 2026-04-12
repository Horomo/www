'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
};

const MOBILE_NAV_ITEMS: NavItem[] = [
  {
    href: '/hourly',
    label: 'Hourly Score',
    isActive: (pathname) => pathname === '/hourly',
  },
  {
    href: '/calculator',
    label: 'Calculator',
    isActive: (pathname) => pathname === '/calculator' || pathname === '/calculator/result',
  },
  {
    href: '/learn',
    label: 'Learn',
    isActive: (pathname) => pathname === '/learn' || pathname.startsWith('/learn/'),
  },
];

export default function MobilePrimaryNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Primary mobile"
      className="mt-3 grid grid-cols-3 gap-2 rounded-[1.6rem] bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(244,251,250,0.84))] p-3 text-sm text-[#151d22]/78 shadow-[0_18px_40px_rgba(0,106,98,0.06)] backdrop-blur-[18px] md:hidden"
    >
      {MOBILE_NAV_ITEMS.map((item) => {
        const active = item.isActive(pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'min-w-0 rounded-full bg-[#0d5d56] px-3 py-2.5 text-center text-[13px] font-medium text-white shadow-[0_12px_28px_rgba(13,93,86,0.22)]'
                : 'min-w-0 rounded-full bg-white/62 px-3 py-2.5 text-center text-[13px] text-[#415654] transition-all duration-300 hover:bg-white hover:text-[#006a62]'
            }
          >
            <span className="block truncate">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
