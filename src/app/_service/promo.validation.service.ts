// promo-validator.service.ts
import { Injectable } from '@angular/core';
import { DateTime } from 'luxon';
import { Promos } from '../_models/promos.model';

export interface PromoValidationResult {
  valid: boolean;
  promo?: Promos;
  discountAmount?: number;
  reason?: string;
}

// promo-validator.service.ts

export interface DesgloseDia {
  fecha: string;           // full Luxon DATE_HUGE — kept for compat
  fechaCorta: string;      // ← NEW: e.g. "Jue 11 jun"
  dayName: string;
  tarifaOriginal: number;
  tarifaFinal: number;
  promoAplicada: boolean;
  label: string;
}

export interface PromoApplicationResult {
  pendiente: number;
  desgloseEdoCuenta: { tarifa: string; fecha: string; tarifaTotal: number }[];
  discountAmount: number;
  promoApplied: boolean;
  desgloseDetalle: DesgloseDia[];  // ← new: day-by-day breakdown for tooltip
}

@Injectable({ providedIn: 'root' })
export class PromoValidatorService {

  private readonly DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];

  // ─────────────────────────────────────────────────────────────────────────────
  // VALIDATE
  // selectedDays is NO LONGER a validity gate — only date windows matter
  // ─────────────────────────────────────────────────────────────────────────────
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

    // 1 — Find promo
    const promo = promosArray.find(p => p.codigo === promoCode && p.estado === true);
    if (!promo) {
      return { valid: false, reason: `Código '${promoCode}' no encontrado o inactivo.` };
    }

    const now = DateTime.now();
    const checkInLuxon = DateTime.fromJSDate(checkIn).startOf('day');

    // 2 — Coupon sale window (intialDateFC / endDateFC)
    // "Cupón válido solo para los siguientes días" — when the coupon can be USED
    if (promo.intialDateFC && promo.endDateFC) {
      const promoStart = DateTime.fromJSDate(new Date(promo.intialDateFC)).startOf('day');
      const promoEnd   = DateTime.fromJSDate(new Date(promo.endDateFC)).startOf('day');
      if (now < promoStart || now > promoEnd) {
        return {
          valid: false,
          reason: `Este código promocional solo es válido del ${promoStart.setLocale('es-MX').toFormat('dd MMM yyyy')} al ${promoEnd.setLocale('es-MX').toFormat('dd MMM yyyy')}.`
        };
      }
    }

    // 3 — Check-in window (intialDateFCCheckIn / endDateFCCheckIn)
    // "Y el cliente llegue al hotel (Check-In) entre:" — when guest must arrive
    if (promo.intialDateFCCheckIn && promo.endDateFCCheckIn) {
      const checkInStart = DateTime.fromJSDate(new Date(promo.intialDateFCCheckIn)).startOf('day');
      const checkInEnd   = DateTime.fromJSDate(new Date(promo.endDateFCCheckIn)).startOf('day');
      if (checkInLuxon < checkInStart || checkInLuxon > checkInEnd) {
        return {
          valid: false,
          reason: `Esta promoción requiere que tu llegada sea entre el ${checkInStart.setLocale('es-MX').toFormat('dd MMM yyyy')} y el ${checkInEnd.setLocale('es-MX').toFormat('dd MMM yyyy')}.`
        };
      }
    }

    // 4 — Min/max nights
    if (promo.minNoches && stayNights < promo.minNoches) {
      return { valid: false, reason: `La estancia mínima para esta promoción es de ${promo.minNoches} noches.` };
    }
    if (promo.maxNoches && promo.maxNoches > 0 && stayNights > promo.maxNoches) {
      return { valid: false, reason: `La estancia máxima para esta promoción es de ${promo.maxNoches} noches.` };
    }

    // 5 — For free-night promos: validate minimum nights required (stay value)
    // Guest needs at least `stay` valid-day nights to qualify for the free night
    if (Number(promo.tipo) !== 3 && promo.selectedDays && promo.selectedDays.length > 0) {
      const stayDays = this.getStayDayNames(checkIn, checkOut);
      const invalidDay = stayDays.find(d => !promo.selectedDays.includes(d));
      if (invalidDay) {
        return { valid: false, reason: `La promoción no aplica para el día ${invalidDay}.` };
      }
    }

    // 6 — selectedDays: check-in day restriction
    // Only applies to tipos 0, 1, 2 — NOT free night (tipo 3)
    if (promo.selectedDays && promo.selectedDays.length > 0 && promo.selectedDays.length < 7) {
      const checkInDayName = this.DAY_NAMES[checkIn.getDay()];
      if (!promo.selectedDays.includes(checkInDayName)) {
        const daysLabel = promo.selectedDays.join(', ');
        return {
          valid: false,
          reason: `Esta promoción solo aplica si llegas en: ${daysLabel}. Tu fecha de llegada es ${checkInDayName}.`
        };
      }
    }

    if (Number(promo.tipo) === 3 && stayNights < promo.stay) {
      const noches_faltantes = promo.stay - stayNights;
      const promoLabel = `${promo.stay}x${promo.payonly}`;
      return {
        valid: false,
        reason: `Este cupón requiere mínimo ${promo.stay} noches. Agrega ${noches_faltantes} noche${noches_faltantes > 1 ? 's' : ''} más para activar la promoción ${promoLabel}.`
      };
    }
    

    // 7 — Room type check
    if (!skipRoomCheck && promo.habs && promo.habs.length > 0) {
      const hasMatchingRoom = habitaciones.some(hab => promo.habs.includes(hab));
      if (!hasMatchingRoom) {
        return { valid: false, reason: 'La promoción no aplica para el tipo de habitación seleccionado.' };
      }
    }

    // 8 — tipo-specific rules
    const tipoValidation = this.validateTipoRules(promo, checkIn, stayNights);
    if (!tipoValidation.valid) return tipoValidation;

    // 9 — Inventory (codigos de canje disponibles)
    if (promo.inventario !== undefined && promo.inventario <= 0) {
      return { valid: false, reason: 'Este código promocional ha agotado sus canjes disponibles.' };
    }

    return { valid: true, promo };
  }

  private countValidDayNights(checkIn: Date, checkOut: Date, selectedDays: string[]): number {
    if (!selectedDays || selectedDays.length === 0) return 0;
    let count = 0;
    const current = new Date(checkIn.getFullYear(), checkIn.getMonth(), checkIn.getDate());
    const end     = new Date(checkOut.getFullYear(), checkOut.getMonth(), checkOut.getDate());
    while (current < end) {
      if (selectedDays.includes(this.DAY_NAMES[current.getDay()])) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // APPLY — mixed desglose: promo on valid days, base rate on others
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * @param promo          Validated promo object
   * @param desglose       Night-by-night breakdown [{tarifa, fecha, tarifaTotal}]
   *                       tarifaTotal must already be the BASE RATE for that specific night
   * @param totalPorPagar  Sum of all tarifaTotal in desglose (used for free-night delta)
   * @param stayNights     Total nights
   * @param checkIn        Stay start date (needed to resolve day names per entry)
   */
  applyPromo(
    promo: Promos,
    desglose: { tarifa: string; fecha: string; tarifaTotal: number }[],
    totalPorPagar: number,
    stayNights: number,
    checkIn?: Date,
  ): PromoApplicationResult {

    const validDays = promo.selectedDays && promo.selectedDays.length > 0
      ? promo.selectedDays
      : this.DAY_NAMES; // empty selectedDays = applies to all days

    // Build day-name array parallel to desglose entries
    // We derive day name from checkIn + index (each entry = one night in order)
    const dayNamesForEntries = this.buildEntryMeta(desglose, checkIn);

    switch (Number(promo.tipo)) {

      case 0: // Basic
      case 1: // Anticipada
      case 2: // Last minute
        return this.applyPercentageOrFixedMixed(promo, desglose, dayNamesForEntries, validDays);

      case 3: // Free night
        return this.applyFreeNightMixed(promo, desglose, dayNamesForEntries, validDays, totalPorPagar);

      default:
        return this.noOpResult(desglose);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE — percentage / fixed on valid days only
  // ─────────────────────────────────────────────────────────────────────────────
private applyPercentageOrFixedMixed(
  promo: Promos,
  desglose: { tarifa: string; fecha: string; tarifaTotal: number }[],
  entryMeta: { dayName: string; fechaCorta: string }[],   // ← changed
  validDays: string[],
): PromoApplicationResult {

  let discountAmount = 0;
  const desgloseDetalle: DesgloseDia[] = [];

  const updatedDesglose = desglose.map((entry, i) => {
    const { dayName, fechaCorta } = entryMeta[i];
    const isValidDay = validDays.includes(dayName);
    const original   = entry.tarifaTotal;

    if (isValidDay) {
      const discounted = this.calculateDiscount(original, promo);
      discountAmount  += original - discounted;
      desgloseDetalle.push({
        fecha: entry.fecha, fechaCorta, dayName,         // ← fechaCorta added
        tarifaOriginal: original, tarifaFinal: discounted,
        promoAplicada: true,
        label: promo.discountType ? `${promo.qtyPrecio}% desc.` : `-$${promo.qtyPrecio}`,
      });
      return { ...entry, tarifaTotal: discounted };
    } else {
      desgloseDetalle.push({
        fecha: entry.fecha, fechaCorta, dayName,
        tarifaOriginal: original, tarifaFinal: original,
        promoAplicada: false, label: 'Tarifa Base',
      });
      return entry;
    }
  });

  const newPendiente = updatedDesglose.reduce((s, e) => s + e.tarifaTotal, 0);
  return {
    pendiente: Math.ceil(newPendiente),
    desgloseEdoCuenta: updatedDesglose,
    discountAmount: Math.ceil(discountAmount),
    promoApplied: true,
    desgloseDetalle,
  };
}

private applyFreeNightMixed(
  promo: Promos,
  desglose: { tarifa: string; fecha: string; tarifaTotal: number }[],
  entryMeta: { dayName: string; fechaCorta: string }[],
  validDays: string[],
  totalPorPagar: number,
): PromoApplicationResult {

  const payOnly    = promo.payonly ?? 1;
  const stay       = promo.stay ?? 1;
  const freeNights = stay - payOnly;
  const desgloseDetalle: DesgloseDia[] = [];

  if (freeNights <= 0) return this.noOpResult(desglose, desgloseDetalle);

  const allEntries = desglose.map((e, i) => ({ ...e, originalIndex: i, ...entryMeta[i] }));

  // Candidatos: TODAS las noches de la estancia, sin filtrar por selectedDays
  const candidates = allEntries;

  const freeIndex = new Set<number>();

  if (candidates.length >= payOnly) {
    const sorted = [...candidates].sort((a, b) =>
      promo.discountType === true
        ? b.tarifaTotal - a.tarifaTotal   // más cara primero
        : a.tarifaTotal - b.tarifaTotal   // más barata primero
    );
    sorted.slice(0, freeNights).forEach(e => freeIndex.add(e.originalIndex));
  }

  const updatedDesglose = desglose.map((entry, i) => {
    const { dayName, fechaCorta } = entryMeta[i];
    const original = entry.tarifaTotal;
    const isFree   = freeIndex.has(i);

    if (isFree) {
      desgloseDetalle.push({
        fecha: entry.fecha, fechaCorta, dayName,
        tarifaOriginal: original, tarifaFinal: 0,
        promoAplicada: true, label: '🎁 Noche Gratis',
      });
      return { ...entry, tarifaTotal: 0, tarifa: `${entry.tarifa} (Noche Gratis)` };
    }

    desgloseDetalle.push({
      fecha: entry.fecha, fechaCorta, dayName,
      tarifaOriginal: original, tarifaFinal: original,
      promoAplicada: false, label: 'Noche Pagada',
    });
    return entry;
  });

  const newTotal = updatedDesglose.reduce((s, e) => s + e.tarifaTotal, 0);

  return {
    pendiente: Math.ceil(newTotal),
    desgloseEdoCuenta: updatedDesglose,
    discountAmount: Math.ceil(totalPorPagar - newTotal),
    promoApplied: true,
    desgloseDetalle,
  };
}

  // ─────────────────────────────────────────────────────────────────────────────
  // PRIVATE helpers
  // ─────────────────────────────────────────────────────────────────────────────

  private validateTipoRules(promo: Promos, checkIn: Date, stayNights: number): PromoValidationResult {
    const now              = DateTime.now().startOf('day');
    const checkInLuxon     = DateTime.fromJSDate(checkIn).startOf('day');
    const daysUntilCheckIn = checkInLuxon.diff(now, 'days').days;

    switch (Number(promo.tipo)) {

      case 0: // Basic — no special timing rules
        break;

      case 1: // Anticipada
        if (promo.minNoches && stayNights < promo.minNoches) {
          return {
            valid: false,
            reason: `Esta promoción anticipada requiere una estancia mínima de ${promo.minNoches} noche${promo.minNoches > 1 ? 's' : ''}. Tu estancia actual es de ${stayNights} noche${stayNights > 1 ? 's' : ''}.`
          };
        }
        if (promo.anticipatedNights && daysUntilCheckIn < promo.anticipatedNights) {
          return {
            valid: false,
            reason: `Esta promoción requiere reservar con al menos ${promo.anticipatedNights} día${promo.anticipatedNights > 1 ? 's' : ''} de anticipación. Tu llegada es en ${Math.floor(daysUntilCheckIn)} día${Math.floor(daysUntilCheckIn) !== 1 ? 's' : ''}.`
          };
        }
        break;

      case 2: // Último Minuto
        if (promo.maxNoches && promo.maxNoches > 0 && stayNights > promo.maxNoches) {
          return {
            valid: false,
            reason: `Esta promoción de último minuto aplica para estancias de máximo ${promo.maxNoches} noche${promo.maxNoches > 1 ? 's' : ''}. Tu estancia actual es de ${stayNights} noche${stayNights > 1 ? 's' : ''}.`
          };
        }
        if (promo.anticipatedNightsmax && daysUntilCheckIn > promo.anticipatedNightsmax) {
          return {
            valid: false,
            reason: `Esta es una promoción de último minuto, válida solo si reservas dentro de los ${promo.anticipatedNightsmax} día${promo.anticipatedNightsmax > 1 ? 's' : ''} previos a tu llegada. Tu llegada es en ${Math.floor(daysUntilCheckIn)} día${Math.floor(daysUntilCheckIn) !== 1 ? 's' : ''}.`
          };
        }
        break;

      case 3: // Free night — no timing rules here
        break;
    }

    return { valid: true };
  }

  private calculateDiscount(originalRate: number, promo: Promos): number {
    if (!promo.qtyPrecio) return originalRate;
    if (promo.discountType === true) {
      return Math.ceil(originalRate * (1 - promo.qtyPrecio / 100));
    }
    return Math.ceil(Math.max(0, originalRate - promo.qtyPrecio));
  }

// Replace buildDayNamesForEntries() with this:
private buildEntryMeta(
  desglose: { tarifa: string; fecha: string; tarifaTotal: number }[],
  checkIn?: Date,
): { dayName: string; fechaCorta: string }[] {
  return desglose.map((_, i) => {
    let d: Date;
    if (checkIn) {
      // Pure local date — avoids UTC midnight shifting the day name
      d = new Date(
        checkIn.getFullYear(),
        checkIn.getMonth(),
        checkIn.getDate() + i
      );
    } else {
      const parsed = new Date(_.fecha);
      d = isNaN(parsed.getTime()) ? new Date() : parsed;
    }

    const dayName = this.DAY_NAMES[d.getDay()];

    // Build display string using local year/month/day to stay timezone-safe
    const dt = DateTime.fromObject(
      { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() },
      { zone: 'America/Mexico_City' }
    ).setLocale('es-MX');

    const raw = dt.toFormat('cccc d');
    const fechaCorta = raw.charAt(0).toUpperCase() + raw.slice(1);

    return { dayName, fechaCorta };
  });
}

  private noOpResult(
    desglose: { tarifa: string; fecha: string; tarifaTotal: number }[],
    desgloseDetalle: DesgloseDia[] = [],
  ): PromoApplicationResult {
    const total = desglose.reduce((s, e) => s + e.tarifaTotal, 0);
    return {
      pendiente: Math.ceil(total),
      desgloseEdoCuenta: [...desglose],
      discountAmount: 0,
      promoApplied: false,
      desgloseDetalle,
    };
  }

  getStayDayNames(checkIn: Date, checkOut: Date): string[] {
    const days: string[] = [];
    let current = DateTime.fromJSDate(checkIn).startOf('day');
    const end   = DateTime.fromJSDate(checkOut).startOf('day');
    while (current < end) {
      days.push(this.DAY_NAMES[current.toJSDate().getDay()]);
      current = current.plus({ days: 1 });
    }
    return days;
  }
}