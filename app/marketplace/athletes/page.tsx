'use client';

import { useEffect, useState, useCallback } from 'react';
import { AuctionListingCard } from '@/components/marketplace/AuctionListingCard';
import { AthleteMarketQueryInput } from '@/types/marketplace';

type ListingData = {
  listing_id: string;
  listing_type: string;
  pricing: {
    buyout_price_ap: number | null;
    current_highest_bid_ap: number | null;
  };
  seller_team: {
    id: string;
    name: string;
    tag: string;
    logo_url: string;
  } | null;
  target_player: {
    id: string;
    athlete_id: string;
    display_name: string;
    avatar_url: string;
    country_code: string;
    primary_role: string;
    player_stats: {
      avg_acs: number;
      avg_kd: number;
      avg_adr: number;
      headshot_pct: number;
      win_rate: number;
    } | null;
  } | null;
  contract_note: string;
  expires_at: string;
};

export default function AthleteMarketplacePage() {
  const [listings, setListings] = useState<ListingData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [position, setPosition] = useState<AthleteMarketQueryInput['position']>('ALL');
  const [sort, setSort] = useState<AthleteMarketQueryInput['sort']>('RECENT');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        position: position || 'ALL',
        sort: sort || 'RECENT',
        page: page.toString(),
        limit: '50',
      });
      const res = await fetch(`/api/v1/athlete-market/listings?${params.toString()}`);
      if (res.ok) {
        const json = await res.json();
        setListings(json.data || []);
        setTotalPages(json.pagination?.total_pages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [position, sort, page]);

  const [nowTime, setNowTime] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNowTime(Date.now());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchListings();
  }, [fetchListings]);

  return (
    <div className="min-h-screen bg-[#0D0E1A] text-white p-6 md:p-12">
      <div className="max-w-7xl mx-auto space-y-8">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <h1 className="text-3xl font-black text-[#F9EDD8] font-mono tracking-wider">ATHLETE MARKET</h1>
            <p className="text-sm text-[#94A3B8] mt-2">Trade and acquire new talents for your roster.</p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <select
              value={position}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => { setPosition(e.target.value as any); setPage(1); }}
              className="bg-[#121424] border border-[#334B5C] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#E8B429]"
            >
              <option value="ALL">All Roles</option>
              <option value="DUELIST">Duelist</option>
              <option value="INITIATOR">Initiator</option>
              <option value="CONTROLLER">Controller</option>
              <option value="SENTINEL">Sentinel</option>
              <option value="FLEX">Flex</option>
            </select>
            
            <select
              value={sort}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onChange={(e) => { setSort(e.target.value as any); setPage(1); }}
              className="bg-[#121424] border border-[#334B5C] rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-[#E8B429]"
            >
              <option value="RECENT">Recent</option>
              <option value="PRICE_ASC">Price: Low to High</option>
              <option value="PRICE_DESC">Price: High to Low</option>
              <option value="HIGHEST_ACS">Highest ACS</option>
            </select>
          </div>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-64 bg-[#1A1C2E] animate-pulse rounded-xl" />
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 bg-[#1A1C2E] rounded-xl border border-white/10">
            <p className="text-xl font-bold text-[#94A3B8]">No athletes available matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((l) => (
              <AuctionListingCard
                key={l.listing_id}
                listingId={l.listing_id}
                itemTitle={l.target_player?.display_name || 'Unknown Athlete'}
                currentHighestBid={l.pricing.current_highest_bid_ap}
                buyoutPrice={l.pricing.buyout_price_ap}
                auctionEndsAt={l.expires_at}
                status={l.expires_at && new Date(l.expires_at).getTime() < nowTime ? 'EXPIRED' : 'ACTIVE'}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-8">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-[#121424] rounded-lg border border-white/10 disabled:opacity-50 hover:border-[#E8B429] transition-colors"
            >
              Previous
            </button>
            <span className="text-sm font-mono text-[#94A3B8]">Page {page} of {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-[#121424] rounded-lg border border-white/10 disabled:opacity-50 hover:border-[#E8B429] transition-colors"
            >
              Next
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
