// app/tournaments/[id]/pay/page.tsx
import { redirect } from 'next/navigation';

export default async function TournamentsPayRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tournament/${id}/pay`);
}
