export function computeStuckMinutes(updatedAt: string): number {
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 60000);
}
