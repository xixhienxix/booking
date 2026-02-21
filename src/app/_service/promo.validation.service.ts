// promos-validator.service.ts
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Promos } from '../_models/promos.model';

export interface PromoValidationResult {
  valid: boolean;
  promo?: Promos;
  discountAmount?: number;
  reason?: string; // why it failed — useful for debugging
}

export interface PromoApplicationResult {
  pendiente: number;
  desgloseEdoCuenta: { tarifa: string; fecha: string; tarifaTotal: number }[];
  discountAmount: number;
  promoApplied: boolean;
}

@Injectable({ providedIn: 'root' })
export class PromoValidatorService {

  /**
   * Main entry — validates all promo rules and returns result
   */
  validatePromo(
    promoCode: string,
    promosArray: Promos[],
    checkIn: Date,
    checkOut: Date,
    stayNights: number,
    habitaciones: string[],        
    selectedDays: string[],       
    skipRoomCheck: boolean = false,
  ): PromoValidationResult {

    // 1 — Find promo by code
    const promo = promosArray.find(p => p.codigo === promoCode && p.estado === true);
    if (!promo) {
      return { valid: false, reason: `Código '${promoCode}' no encontrado o inactivo.` };
    }

    const now = DateTime.now();
    const checkInLuxon = DateTime.fromJSDate(checkIn).startOf('day');
    const checkOutLuxon = DateTime.fromJSDate(checkOut).startOf('day');

    // 2 — Validate cupon validity dates (promo sale window)
    if (promo.intialDateFC && promo.endDateFC) {
      const promoStart = DateTime.fromJSDate(new Date(promo.intialDateFC)).startOf('day');
      const promoEnd = DateTime.fromJSDate(new Date(promo.endDateFC)).startOf('day');
      if (now < promoStart || now > promoEnd) {
        return { valid: false, reason: 'El código de promoción está fuera del período de venta.' };
      }
    }

    // 3 — Validate check-in window dates
    if (promo.intialDateFCCheckIn && promo.endDateFCCheckIn) {
      const checkInStart = DateTime.fromJSDate(new Date(promo.intialDateFCCheckIn)).startOf('day');
      const checkInEnd = DateTime.fromJSDate(new Date(promo.endDateFCCheckIn)).startOf('day');
      if (checkInLuxon < checkInStart || checkInLuxon > checkInEnd) {
        return { valid: false, reason: 'La fecha de llegada no está dentro del rango permitido por la promoción.' };
      }
    }

    // 4 — Validate min/max nights
    if (promo.minNoches && stayNights < promo.minNoches) {
      return { valid: false, reason: `La estancia mínima es de ${promo.minNoches} noches.` };
    }
    if (promo.maxNoches && promo.maxNoches > 0 && stayNights > promo.maxNoches) {
      return { valid: false, reason: `La estancia máxima es de ${promo.maxNoches} noches.` };
    }

    // 5 — Validate valid days (all stay days must be in promo's selectedDays)
    if (promo.selectedDays && promo.selectedDays.length > 0) {
      const stayDays = this.getStayDayNames(checkIn, checkOut);
      const invalidDay = stayDays.find(d => !promo.selectedDays.includes(d));
      if (invalidDay) {
        return { valid: false, reason: `La promoción no aplica para el día ${invalidDay}.` };
      }
    }

    // 6 — Validate room type (promo must include at least one of the reserved rooms)
    if (!skipRoomCheck && promo.habs && promo.habs.length > 0) {
        const hasMatchingRoom = habitaciones.some(hab => promo.habs.includes(hab));
        if (!hasMatchingRoom) {
        return { valid: false, reason: 'La promoción no aplica para el tipo de habitación seleccionado.' };
        }
    }

    // 7 — Validate tipo-specific rules
    const tipoValidation = this.validateTipoRules(promo, checkIn);
    if (!tipoValidation.valid) {
      return tipoValidation;
    }

    // 8 — Validate inventory (inventario > 0)
    if (promo.inventario !== undefined && promo.inventario <= 0) {
      return { valid: false, reason: 'La promoción ha agotado su inventario.' };
    }

    return { valid: true, promo };
  }

  /**
   * Validates tipo-specific rules (anticipada, lastminute, freenight)
   */
private validateTipoRules(promo: Promos, checkIn: Date): PromoValidationResult {
  const now = DateTime.now().startOf('day');
  const checkInLuxon = DateTime.fromJSDate(checkIn).startOf('day');
  const daysUntilCheckIn = checkInLuxon.diff(now, 'days').days;

  switch (Number(promo.tipo)) {  // ← cast to Number just in case it comes as string from DB
    case 1:
      if (promo.anticipatedNights && daysUntilCheckIn < promo.anticipatedNights) {
        return { valid: false, reason: `Esta promoción requiere reservar con al menos ${promo.anticipatedNights} días de anticipación.` };
      }
      break;
    case 2:
      if (promo.anticipatedNightsmax && daysUntilCheckIn > promo.anticipatedNightsmax) {
        return { valid: false, reason: `Esta es una promoción last minute válida solo ${promo.anticipatedNightsmax} días antes de la llegada.` };
      }
      break;
    case 3:
      break;
  }
  return { valid: true };
}

  /**
   * Applies the promo discount to the desglose and returns updated values
   */
  applyPromo(
    promo: Promos,
    desgloseEdoCuenta: { tarifa: string; fecha: string; tarifaTotal: number }[],
    totalPorPagar: number,
    stayNights: number,
  ): PromoApplicationResult {

    let updatedDesglose = [...desgloseEdoCuenta];
    let discountAmount = 0;

    switch (promo.tipo) {
      case 0: // Basic — percentage or fixed discount on all nights
      case 1: // Anticipada
      case 2: // Last Minute
        updatedDesglose = desgloseEdoCuenta.map(entry => {
          const discounted = this.calculateDiscount(entry.tarifaTotal, promo);
          discountAmount += entry.tarifaTotal - discounted;
          return { ...entry, tarifaTotal: discounted };
        });
        break;

      case 3: // Free Night — pay `payonly` nights, get `stay` nights
        updatedDesglose = this.applyFreeNightDiscount(promo, desgloseEdoCuenta);
        const newTotal = updatedDesglose.reduce((sum, e) => sum + e.tarifaTotal, 0);
        discountAmount = totalPorPagar - newTotal;
        break;
    }

    const newPendiente = updatedDesglose.reduce((sum, e) => sum + e.tarifaTotal, 0);

    return {
      pendiente: Math.ceil(newPendiente),
      desgloseEdoCuenta: updatedDesglose,
      discountAmount: Math.ceil(discountAmount),
      promoApplied: true,
    };
  }

  /**
   * Calculates discount per night entry based on promo type (% or fixed)
   */
  private calculateDiscount(originalRate: number, promo: Promos): number {
    if (!promo.qtyPrecio) return originalRate;

    if (promo.discountType === true) {
      // Percentage discount
      const discounted = originalRate * (1 - promo.qtyPrecio / 100);
      return Math.ceil(discounted);
    } else {
      // Fixed amount discount
      return Math.ceil(Math.max(0, originalRate - promo.qtyPrecio));
    }
  }

  /**
   * Free night: pay X stay Y — cheapest nights become free based on rateType
   */
private applyFreeNightDiscount(
  promo: Promos,
  desglose: { tarifa: string; fecha: string; tarifaTotal: number }[]
): { tarifa: string; fecha: string; tarifaTotal: number }[] {

  const payOnly = promo.payonly ?? 1;
  const stay = promo.stay ?? 1;
  const freeNights = stay - payOnly;

  if (freeNights <= 0) return desglose;

  const rateType = String(promo.tipo); // ← normalize to string regardless of what DB returns

  const sorted = [...desglose].sort((a, b) =>
    rateType === 'low'
      ? a.tarifaTotal - b.tarifaTotal   // cheapest nights are free
      : b.tarifaTotal - a.tarifaTotal   // most expensive nights are free
  );

  const freeEntries = new Set(sorted.slice(0, freeNights).map(e => e.fecha));

  return desglose.map(entry => ({
    ...entry,
    tarifaTotal: freeEntries.has(entry.fecha) ? 0 : entry.tarifaTotal,
    tarifa: freeEntries.has(entry.fecha) ? `${entry.tarifa} (Noche Gratis)` : entry.tarifa,
  }));
}

  /**
   * Returns day names (Lun, Mar...) for each night of the stay
   */
  private getStayDayNames(checkIn: Date, checkOut: Date): string[] {
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const days: string[] = [];
    let current = DateTime.fromJSDate(checkIn).startOf('day');
    const end = DateTime.fromJSDate(checkOut).startOf('day');
    while (current < end) {
      days.push(dayNames[current.toJSDate().getDay()]);
      current = current.plus({ days: 1 });
    }
    return days;
  }
}