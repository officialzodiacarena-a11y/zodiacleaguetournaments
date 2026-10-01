// app/tournaments/[id]/register/page.tsx
import { redirect } from 'next/navigation';

export default async function TournamentsRegisterRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/tournament/${id}/register`);
}
