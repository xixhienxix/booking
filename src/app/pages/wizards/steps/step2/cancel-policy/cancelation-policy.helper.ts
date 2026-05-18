// cancellation-policy.helper.ts
// Reads the Politicas array from a tarifa object and returns the
// CancellationPolicyType used by <app-cancellation-policy>.
//
// Array shape from backend:
//   [
//     { name: 'Gratis',               value: boolean },
//     { name: 'No Reembolsable',      value: boolean },
//     { name: 'Reembolsable Parcial', value: boolean },
//   ]

import { CancellationPolicyType } from './cancelation.policy.component';

export interface PoliticaItem {
  name: string;
  value: boolean;
}

/**
 * Returns which cancellation policy type is active.
 * Falls back to 'nonrefundable' if none match or all are false.
 */
export function resolvePolicyType(politicas: PoliticaItem[] | undefined | null): CancellationPolicyType {
  const active = politicas?.find(p => p.value === true);
  if (!active) return 'nonrefundable';

  switch (active.name) {
    case 'Gratis':               return 'free';
    case 'Reembolsable Parcial': return 'partial';
    case 'No Reembolsable':
    default:                     return 'nonrefundable';
  }
}