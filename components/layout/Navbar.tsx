// components/layout/Navbar.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NavbarUser, NavbarUserSchema, ZodiacSign } from '@/types/navbar';
import {
  Coins,
  LogOut,
  Menu,
  X,
  User,
  Shield,
} from 'lucide-react';

function computeZodiacSign(dateOfBirth: string | null): ZodiacSign | null {
  if (!dateOfBirth) return null;
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return null;

  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return 'Aries';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return 'Taurus';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 20)) return 'Gemini';
  if ((month === 6 && day >= 21) || (month === 7 && day <= 22)) return 'Cancer';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return 'Leo';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return 'Virgo';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 22)) return 'Libra';
  if ((month === 10 && day >= 23) || (month === 11 && day <= 21)) return 'Scorpio';
  if ((month === 11 && day >= 22) || (month === 12 && day <= 21)) return 'Sagittarius';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return 'Capricorn';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return 'Aquarius';
  return 'Pisces';
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<NavbarUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  // Feature Flag สำหรับ Sprint Demo วันที่ 23 ก.ย.
  const isMarketplaceDemoEnabled = process.env.NEXT_PUBLIC_ENABLE_MARKETPLACE_DEMO === 'true';

  useEffect(() => {
    let isMounted = true;

    async function fetchUserProfile() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authError || !authUser) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        const { data: playerRow, error: playerError } = await supabase
          .from('players')
          .select('id, user_id, display_name, avatar_url, ap_balance, date_of_birth')
          .eq('user_id', authUser.id)
          .maybeSingle();

        if (playerError || !playerRow) {
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
          return;
        }

        // Fetch active user roles
        const { data: userRoles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('player_id', playerRow.id)
          .is('revoked_at', null);

        const roles = (userRoles || []).map((r) => r.role);

        const validatedUser = NavbarUserSchema.safeParse({
          id: playerRow.id,
          userId: playerRow.user_id,
          displayName: playerRow.display_name || authUser.email?.split('@')[0] || 'Athlete',
          avatarUrl: playerRow.avatar_url,
          zodiacSign: computeZodiacSign(playerRow.date_of_birth),
          apBalance: playerRow.ap_balance || 0,
          roles: roles
        });

        if (validatedUser.success && isMounted) {
          setUser(validatedUser.data);
        }
      } catch (err) {
        console.error('[Navbar Engine] Profile Fetch Error:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchUserProfile();

    // Realtime Balance & Profile Subscription
    const channel = supabase
      .channel('navbar-player-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'players' },
        (payload) => {
          setUser((prev) => {
            if (!prev || payload.new.id !== prev.id) return prev;
            return {
              ...prev,
              apBalance: payload.new.ap_balance ?? prev.apBalance,
              avatarUrl: payload.new.avatar_url ?? prev.avatarUrl,
              displayName: payload.new.display_name ?? prev.displayName
            };
          });
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await supabase.auth.signOut();
      setUser(null);
      setMobileMenuOpen(false);
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('[Navbar Engine] Logout Error:', err);
    } finally {
      setLoggingOut(false);
    }
  };

  const roleConfig = React.useMemo(() => {
    const roles = user?.roles || [];
    if (roles.includes('SUPER_ADMIN')) {
      return { label: 'SUPER ADMIN', badge: 'ROOT', href: '/admin' };
    }
    if (roles.includes('ADMIN')) {
      return { label: 'LEAGUE ADMIN', badge: 'ADMIN', href: '/admin' };
    }
    if (roles.includes('REFEREE')) {
      return { label: 'REFEREE DESK', badge: 'OPS', href: '/admin/command-room' };
    }
    if (roles.includes('CASTER')) {
      return { label: 'CASTER ROOM', badge: 'LIVE', href: '/spectate' };
    }
    if (roles.includes('MARKETPLACE_ADMIN')) {
      return { label: 'MARKET ADMIN', badge: 'STORE', href: '/admin/marketplace' };
    }
    if (roles.includes('MODERATOR')) {
      return { label: 'MODERATOR', badge: 'CREW', href: '/admin' };
    }
    return null;
  }, [user?.roles]);

  const navLinks = [
    { label: 'HOME', href: '/' },
    { label: 'TOURNAMENT', href: '/tournament' },
    { label: 'LEADERBOARD', href: '/leaderboard' },
    { label: 'STORE', href: '/store' },
    {
      label: 'ATHLETE MARKET',
      href: '/marketplace/athletes',
      isBadge: isMarketplaceDemoEnabled ? 'DEMO' : null
    },
    { label: 'AI ORACLE', href: '/chatbot' },
    ...(user ? [{ label: 'DASHBOARD', href: '/dashboard' }] : []),
    ...(roleConfig ? [{ label: roleConfig.label, href: roleConfig.href, isBadge: roleConfig.badge }] : [])
  ];

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-[#080810]/85 backdrop-blur-md border-b border-white/10 transition-all font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">

          {/* BRAND LOGO */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#E8B429] via-[#00D4FF] to-[#8B5CF6] p-[1.5px] shadow-[0_0_15px_rgba(0,212,255,0.3)] group-hover:shadow-[0_0_22px_rgba(232,180,41,0.5)] transition-all">
              <div className="w-full h-full bg-[#080810] rounded-[10.5px] flex items-center justify-center font-black text-white text-base tracking-tighter">
                ZA
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-base text-white tracking-wider flex items-center gap-1 group-hover:text-[#00D4FF] transition-colors">
                ZODIAC <span className="text-[#E8B429]">ARENA</span>
              </span>
              <span className="text-[9px] text-neutral-400 tracking-widest font-bold -mt-1">
                ESPORTS SAAS PROTOCOL
              </span>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION LINKS */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`relative px-3 py-1.5 rounded-lg text-xs font-bold tracking-wider transition-all flex items-center gap-1.5 ${
                    active
                      ? 'text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30 shadow-[0_0_10px_rgba(0,212,255,0.2)]'
                      : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {link.label}
                  {link.isBadge && (
                    <span className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#8B5CF6] text-[9px] px-1.5 py-0.2 rounded font-black animate-pulse">
                      {link.isBadge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* RIGHT ACTION CONTROLS */}
          <div className="hidden sm:flex items-center gap-3">
            {loading ? (
              <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {/* AP BALANCE PILL */}
                <div className="bg-[#E8B429]/10 border border-[#E8B429]/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold text-[#E8B429] shadow-[0_0_10px_rgba(232,180,41,0.15)]">
                  <Coins className="w-3.5 h-3.5" />
                  <span>{user.apBalance.toLocaleString()} AP</span>
                </div>

                {/* ATHLETE PASSPORT PROFILE LINK */}
                <Link
                  href="/profile"
                  className="flex items-center gap-2 p-1 pl-2 pr-3 rounded-xl bg-white/5 border border-white/10 hover:border-[#E8B429]/50 transition-all group"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#E8B429]/20 border border-[#E8B429] flex items-center justify-center text-xs font-bold text-[#E8B429] overflow-hidden">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                    ) : (
                      user.displayName.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="text-xs font-bold text-neutral-200 group-hover:text-white max-w-[100px] truncate">
                    {user.displayName}
                  </span>
                </Link>

                {/* DYNAMIC ROLE BADGE BUTTON */}
                {roleConfig && (
                  <Link
                    href={roleConfig.href}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black tracking-wider transition-all bg-red-950/60 border border-red-500/50 text-red-300 hover:bg-red-900/80 hover:border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.25)] group"
                    title={roleConfig.label}
                  >
                    <Shield className="w-3.5 h-3.5 text-red-400 group-hover:animate-pulse" />
                    <span>{roleConfig.label}</span>
                  </Link>
                )}

                {/* RED OUTLINE LOGOUT BUTTON (STRICT SPEC) */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 flex items-center gap-1.5 border border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.25)] disabled:opacity-50"
                  title="Logout Session"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{loggingOut ? 'EXITING...' : 'LOGOUT'}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-[#E8B429]/10 border border-[#E8B429]/40 text-[#E8B429] hover:bg-[#E8B429]/20 hover:border-[#E8B429] text-xs font-bold px-4 py-2 rounded-lg transition-all shadow-[0_0_12px_rgba(232,180,41,0.2)] flex items-center gap-1.5"
              >
                <User className="w-3.5 h-3.5" />
                <span>LOGIN / REGISTER</span>
              </Link>
            )}
          </div>

          {/* MOBILE HAMBURGER BUTTON */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden w-11 h-11 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-neutral-300 hover:text-white"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-red-400" /> : <Menu className="w-5 h-5 text-[#00D4FF]" />}
          </button>
        </div>
      </header>

      {/* MOBILE DRAWER OVERLAY */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 font-mono">
          {/* BACKDROP */}
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* DRAWER PANEL */}
          <div className="fixed top-0 right-0 w-80 max-w-[85vw] h-full bg-[#0D0E1A] border-l border-white/10 p-6 z-50 flex flex-col justify-between shadow-2xl overflow-y-auto">
            <div className="space-y-6">
              {/* DRAWER HEADER */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/20 border border-[#00D4FF] flex items-center justify-center font-bold text-xs text-[#00D4FF]">
                    ZA
                  </div>
                  <span className="font-bold text-sm text-white">NAVIGATION</span>
                </div>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ATHLETE BALANCE HUD (MOBILE) */}
              {user && (
                <div className="bg-[#121424] border border-white/10 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2.5 border-b border-white/5 pb-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8B429]/20 border border-[#E8B429] flex items-center justify-center text-xs font-bold text-[#E8B429]">
                      {user.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        user.displayName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{user.displayName}</div>
                      {user.zodiacSign && (
                        <div className="text-[10px] text-[#00D4FF] font-bold">SIGN: {user.zodiacSign.toUpperCase()}</div>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#E8B429]/10 border border-[#E8B429]/30 p-2 rounded-lg text-[#E8B429] flex items-center gap-1.5 text-xs font-bold">
                    <Coins className="w-3.5 h-3.5" />
                    <span>{user.apBalance.toLocaleString()} AP</span>
                  </div>
                </div>
              )}

              {/* MOBILE NAV LINKS */}
              <div className="space-y-1.5">
                {navLinks.map((link) => {
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wider transition-all flex items-center justify-between ${
                        active
                          ? 'text-[#00D4FF] bg-[#00D4FF]/10 border border-[#00D4FF]/30'
                          : 'text-neutral-300 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span>{link.label}</span>
                      {link.isBadge && (
                        <span className="bg-[#8B5CF6]/20 border border-[#8B5CF6]/50 text-[#8B5CF6] text-[9px] px-1.5 py-0.2 rounded font-black">
                          {link.isBadge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* DRAWER FOOTER ACTION */}
            <div className="pt-6 border-t border-white/10 space-y-2">
              {user ? (
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-red-500/40 text-red-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loggingOut ? 'EXITING SESSION...' : 'LOGOUT ATHLETE'}</span>
                </button>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 bg-[#E8B429]/10 border border-[#E8B429]/40 text-[#E8B429] hover:bg-[#E8B429]/20"
                >
                  <User className="w-4 h-4" />
                  <span>LOGIN / REGISTER</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
