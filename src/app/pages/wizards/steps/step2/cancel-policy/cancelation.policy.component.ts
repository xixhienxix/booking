import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

export type CancellationPolicyType = 'free' | 'partial' | 'nonrefundable';

export interface CancellationPolicy {
  type: CancellationPolicyType;
  label: string;
  description: string;
  // Config values (optional, used to build description dynamically)
  freeHours?: number;       // For 'free': hours before arrival
  partialDays?: number;     // For 'partial': days before arrival
  partialPenalty?: string;  // For 'partial': e.g. "20%" or "1 Noche"
}

@Component({
  selector: 'app-cancellation-policy',
  templateUrl: './cancelation.policy.component.html',
  styleUrls: ['./cancelation.policy.component.scss']
})
export class CancellationPolicyComponent implements OnChanges {

  /**
   * Pass a policy type + optional config values.
   * The component will auto-build the description if not provided.
   *
   * Usage examples:
   *
   * Free:
   *   [policyType]="'free'" [freeHours]="48"
   *
   * Partial:
   *   [policyType]="'partial'" [partialDays]="7" [partialPenalty]="'20% / 1 Noche'"
   *
   * Non-refundable:
   *   [policyType]="'nonrefundable'"
   *
   * Or pass a full CancellationPolicy object:
   *   [policy]="myPolicyObject"
   */

  @Input() policyType: CancellationPolicyType = 'free';
  @Input() freeHours: number = 48;
  @Input() partialDays: number = 7;
  @Input() partialPenalty: string = '20% / 1 Noche';

  /** Alternatively inject a pre-built policy object directly */
  @Input() policy: CancellationPolicy | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.policy) {
      this.policy = this.buildPolicy();
    }
  }

  private buildPolicy(): CancellationPolicy {
    switch (this.policyType) {
      case 'free':
        return {
          type: 'free',
          label: 'Cancelación Gratuita',
          description:
            `Puedes cancelar sin costo hasta <strong>${this.freeHours} horas</strong> antes de tu llegada. ` +
            `Si cancelas después de este tiempo, el hotel retendrá tu anticipo como penalización.`,
          freeHours: this.freeHours,
        };

      case 'partial':
        return {
          type: 'partial',
          label: 'Reembolso Parcial',
          description:
            `Cancelando hasta <strong>${this.partialDays} días</strong> antes de tu llegada, ` +
            `te devolveremos tu anticipo reteniendo solo <strong>${this.partialPenalty}</strong> ` +
            `por gastos de operación. Si cancelas después de este límite, el anticipo no será reembolsable.`,
          partialDays: this.partialDays,
          partialPenalty: this.partialPenalty,
        };

      case 'nonrefundable':
      default:
        return {
          type: 'nonrefundable',
          label: 'Tarifa No Reembolsable',
          description:
            `Al ser una tarifa especial, si decides cancelar o no te presentas el día de tu llegada, ` +
            `el anticipo depositado no podrá ser devuelto bajo ninguna circunstancia.`,
        };
    }
  }
}