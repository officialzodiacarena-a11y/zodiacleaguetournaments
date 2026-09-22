import StreamHubMainPage from '../page';

export default function MatchStreamHubPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  return <StreamHubMainPage params={params} />;
}
