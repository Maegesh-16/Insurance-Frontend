export function hasEligibleClaimPayment(statuses: readonly string[]): boolean {
  const normalizedStatuses = statuses.map((status) => status.toLowerCase());
  return normalizedStatuses.some((status) => status === 'paid' || status === 'completed')
    && !normalizedStatuses.some((status) => status === 'overdue');
}
