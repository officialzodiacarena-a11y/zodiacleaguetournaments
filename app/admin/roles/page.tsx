'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Shield, ShieldAlert, Search, Loader2 } from 'lucide-react';

interface Player {
  id: string;
  display_name: string;
  athlete_id: string | null;
  role: string | null;
}

export default function AdminRolesPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    // Fetch all players
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, display_name, athlete_id')
      .limit(50);

    if (playersError) {
      console.error(playersError);
      setLoading(false);
      return;
    }

    // Fetch user_roles
    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('player_id, role');

    const roleMap = new Map((rolesData || []).map(r => [r.player_id, r.role]));

    const merged = (playersData || []).map(p => ({
      ...p,
      role: roleMap.get(p.id) || 'NONE'
    }));

    setPlayers(merged);
    setLoading(false);
  };

  const handleRoleAction = async (targetUserId: string, action: 'ASSIGN' | 'REVOKE', newRole?: string) => {
    const confirmMessage = action === 'ASSIGN' 
      ? `Confirm assign ${newRole} to this user?` 
      : `Confirm revoke role from this user?`;
      
    if (!window.confirm(confirmMessage)) return;

    try {
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action, role: newRole })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update role');

      alert('Success!');
      fetchData(); // Refresh data
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredPlayers = players.filter(p => 
    p.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.athlete_id?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#07090E] text-white p-8 font-mono">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 border-b border-[#00D4FF]/20 pb-4">
          <div className="flex items-center gap-3 text-[#00D4FF] mb-2">
            <ShieldAlert className="w-6 h-6" />
            <span className="tracking-widest font-bold uppercase text-sm">Zodiac Arena Command Center</span>
          </div>
          <h1 className="text-3xl font-black tracking-wider">SUPER ADMIN ROLE MANAGEMENT</h1>
        </header>

        <div className="bg-[#12121A] border border-[#00D4FF]/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 bg-[#0D0E1A] border border-[#00D4FF]/20 rounded-lg px-4 py-2 w-full max-w-md">
            <Search className="w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              placeholder="Search by player name or athlete ID..."
              className="bg-transparent border-none outline-none w-full text-sm text-white placeholder-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-[#00D4FF]">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>LOADING DIRECTORY...</span>
          </div>
        ) : (
          <div className="bg-[#12121A] border border-[#00D4FF]/30 rounded-xl overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800 bg-[#07090E]/80">
                  <th className="p-4">PLAYER</th>
                  <th className="p-4">CURRENT ROLE</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {filteredPlayers.map(p => (
                  <tr key={p.id} className="hover:bg-white/5">
                    <td className="p-4">
                      <div className="font-bold text-white">{p.display_name || 'Unknown'}</div>
                      <div className="text-xs text-gray-500">{p.athlete_id || p.id}</div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        p.role === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400' :
                        p.role === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' :
                        p.role === 'REFEREE' ? 'bg-[#00D4FF]/20 text-[#00D4FF]' :
                        p.role === 'COACH' ? 'bg-green-500/20 text-green-400' :
                        'bg-gray-800 text-gray-400'
                      }`}>
                        {p.role}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2">
                      <select 
                        className="bg-[#0D0E1A] border border-gray-700 rounded text-xs px-2 py-1 outline-none text-white"
                        onChange={(e) => {
                          if (e.target.value) handleRoleAction(p.id, 'ASSIGN', e.target.value);
                          e.target.value = '';
                        }}
                      >
                        <option value="">Assign Role...</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="REFEREE">REFEREE</option>
                        <option value="COACH">COACH</option>
                        <option value="MARKETPLACE_ADMIN">MARKETPLACE_ADMIN</option>
                      </select>
                      
                      {p.role !== 'NONE' && (
                        <button 
                          onClick={() => handleRoleAction(p.id, 'REVOKE')}
                          className="bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 rounded px-3 py-1 text-xs font-bold transition-colors"
                        >
                          REVOKE
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
