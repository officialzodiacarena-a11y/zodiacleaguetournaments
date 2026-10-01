import { AdjustForm } from '@/components/admin/league/AdjustForm';

export default function TournamentAdminDashboard() {
  return (
    <div className="p-4 bg-[#0A0A0F] text-white min-h-screen">
      <h1 className="text-xl font-bold mb-4">Tournament Admin Dashboard - Standings / Teams</h1>
      {/* We reuse the AdjustForm as requested by the Admin Bonus Point Tool */}
      <AdjustForm seasons={[]} standingsBySeasonId={{}} />
    </div>
  );
}