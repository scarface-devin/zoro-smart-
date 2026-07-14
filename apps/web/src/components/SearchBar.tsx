import { useState, useEffect, useRef } from 'react';
import { Search, X, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import type { SearchResult } from '@solshare/shared';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery({
    queryKey: ['search', query],
    queryFn: () => api.search(query),
    enabled: query.length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    }
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('keydown', handle);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handle);
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const results = data?.results ?? [];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 text-sm text-ink-400 bg-ink-800/50 hover:bg-ink-700/50 ring-1 ring-white/10 rounded-lg px-3 py-1.5 transition min-w-[200px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-ink-400">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg mx-4">
            <div className="card p-2">
              <div className="flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-ink-400 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-sm py-2.5 placeholder:text-ink-400"
                  placeholder="Search arrays, proposals, transactions…"
                />
                <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-white/5">
                  <X className="w-4 h-4 text-ink-400" />
                </button>
              </div>

              {query.length >= 2 && (
                <div className="border-t border-white/5 mt-1 pt-1">
                  {isFetching ? (
                    <div className="px-3 py-4 text-sm text-ink-400 text-center">
                      Searching…
                    </div>
                  ) : results.length === 0 ? (
                    <div className="px-3 py-4 text-sm text-ink-400 text-center">
                      No results for &ldquo;{query}&rdquo;
                    </div>
                  ) : (
                    results.map((r) => (
                      <SearchResultItem key={r.id} result={r} onClick={() => setOpen(false)} />
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchResultItem({ result, onClick }: { result: SearchResult; onClick: () => void }) {
  const typeColors: Record<string, string> = {
    array: 'bg-sun-500/10 text-sun-400',
    proposal: 'bg-violet-500/10 text-violet-400',
    bridge_tx: 'bg-sky-500/10 text-sky-400',
    token: 'bg-leaf-500/10 text-leaf-400',
  };

  return (
    <Link
      to={result.url}
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition group"
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium group-hover:text-white transition-colors truncate">
          {result.title}
        </div>
        <div className="text-xs text-ink-400 truncate">{result.subtitle}</div>
      </div>
      <span className={`pill ring-1 text-[10px] shrink-0 ${typeColors[result.type] ?? 'bg-white/10'}`}>
        {result.type}
      </span>
      <ArrowRight className="w-3 h-3 text-ink-400 group-hover:text-white transition-colors" />
    </Link>
  );
}
