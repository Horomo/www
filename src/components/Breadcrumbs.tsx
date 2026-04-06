import Link from 'next/link';

type BreadcrumbItem = {
  name: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-slate-400">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center gap-2">
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-cyan-200">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-slate-100">
                {item.name}
              </span>
            )}
            {index < items.length - 1 ? <span aria-hidden="true" className="text-slate-600">/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
