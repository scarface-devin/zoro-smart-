import { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ChevronDown, ChevronUp, ExternalLink, MessageCircle } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

const faqs: FaqItem[] = [
  {
    q: 'What is SolShare Network?',
    a: 'SolShare is a Soroban-powered Real World Asset (RWA) engine for crowdfunded urban solar arrays. It lets anyone invest in solar energy by purchasing fractional shares of verified rooftop installations, earning proportional yield from energy sales.',
    category: 'General',
  },
  {
    q: 'How do I start investing?',
    a: 'Connect a Freighter wallet, browse the Arrays page for active installations, and purchase shares in any array. Each share represents a proportional stake in the array\'s energy production and revenue.',
    category: 'Investing',
  },
  {
    q: 'What is yield and how is it calculated?',
    a: 'Yield is the revenue generated from selling solar energy to the grid. It\'s distributed proportionally to share holders through the yield-distributor contract. Your claimable amount depends on your share balance and the global yield-per-share metric.',
    category: 'Yield',
  },
  {
    q: 'How does cross-chain bridging work?',
    a: 'SolShare\'s bridge-wrapper contract lets you wrap USDC, wETH, wSOL, and other tokens from external chains (Ethereum, Polygon, Solana, Arbitrum, etc.) onto Stellar/Soroban. Validators observe lock events on the source chain, sign them, and submit to the bridge contract to mint wrapped tokens.',
    category: 'Bridge',
  },
  {
    q: 'What is governance and how can I participate?',
    a: 'Governance lets share holders vote on proposals that shape the protocol — from fee adjustments to array expansions. Voting power is proportional to your total share holdings. Visit the Governance page to see active proposals and cast your vote.',
    category: 'Governance',
  },
  {
    q: 'Are my funds safe?',
    a: 'SolShare is fully self-custodial — you control your funds through your wallet (Freighter). All contracts are deployed on Stellar/Soroban and each transaction is verifiable on-chain. The protocol is open-source under Apache-2.0.',
    category: 'Security',
  },
  {
    q: 'How do I bridge tokens to Stellar?',
    a: 'Navigate to the Bridge page, select your source chain, enter the amount and your Stellar recipient address, then confirm. The bridge-wrapper contract coordinates with validators to verify the lock event and mint your wrapped tokens.',
    category: 'Bridge',
  },
  {
    q: 'What wallets are supported?',
    a: 'SolShare supports Freighter wallet for Stellar. We\'re planning to add Lobster, xBull, and Albedo support in future releases.',
    category: 'Wallet',
  },
  {
    q: 'How is my portfolio performance tracked?',
    a: 'Visit the Portfolio page to see all your holdings, total shares, claimable yield, and performance metrics across all arrays you\'ve invested in. Data refreshes every 30 seconds.',
    category: 'Portfolio',
  },
];

const categories = [...new Set(faqs.map((f) => f.category))];

export default function FAQ() {
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const filtered = activeFilter
    ? faqs.filter((f) => f.category === activeFilter)
    : faqs;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-sun-400" />
          Frequently asked questions
        </h1>
        <p className="text-ink-300 text-sm mt-1">
          Everything you need to know about investing in solar energy with SolShare.
        </p>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFilter(null)}
          className={`pill ring-1 text-xs ${
            !activeFilter
              ? 'ring-white/30 bg-white/10 text-white'
              : 'ring-white/10 bg-ink-800 text-ink-300 hover:bg-white/5'
          }`}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveFilter(c)}
            className={`pill ring-1 text-xs ${
              activeFilter === c
                ? 'ring-white/30 bg-white/10 text-white'
                : 'ring-white/10 bg-ink-800 text-ink-300 hover:bg-white/5'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* FAQ accordion */}
      <div className="space-y-2">
        {filtered.map((item, idx) => (
          <div key={idx} className="card overflow-hidden">
            <button
              onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
              className="w-full p-5 flex items-start justify-between gap-4 text-left hover:bg-white/5 transition"
            >
              <div>
                <div className="text-xs text-sun-400 mb-1">{item.category}</div>
                <div className="font-semibold text-sm">{item.q}</div>
              </div>
              {openIdx === idx ? (
                <ChevronUp className="w-4 h-4 text-ink-400 shrink-0 mt-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-ink-400 shrink-0 mt-1" />
              )}
            </button>
            {openIdx === idx && (
              <div className="px-5 pb-5 pt-0">
                <p className="text-sm text-ink-300 leading-relaxed">{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Still need help */}
      <div className="card p-6 flex items-center gap-4">
        <MessageCircle className="w-8 h-8 text-sun-400 shrink-0" />
        <div>
          <h3 className="font-semibold">Still have questions?</h3>
          <p className="text-sm text-ink-300 mt-1">
            Check the{' '}
            <Link to="/docs" className="text-sun-400 hover:underline">
              documentation
            </Link>{' '}
            or{' '}
            <a
              href="https://github.com/solshare-network/solshare-network"
              target="_blank"
              rel="noreferrer"
              className="text-sun-400 hover:underline inline-flex items-center gap-1"
            >
              open an issue <ExternalLink className="w-3 h-3" />
            </a>{' '}
            on GitHub.
          </p>
        </div>
      </div>
    </div>
  );
}
