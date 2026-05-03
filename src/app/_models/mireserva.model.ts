// mireserva.model.ts — add fechaInicial and fechaFinal to support Bug 4
// (each reservation entry is tagged with its search date range)
export interface miReserva {
  codigoCuarto:        string;
  numeroCuarto:        string;
  cantidadHabitaciones: number;
  nombreTarifa:        string;
  precioTarifa:        number;
  precioOriginal?:     number;
  descuentoAplicado?:  number;
  promoNombre?:        string;
  detallesTarifa:      string;
  cantidadAdultos:     number;
  cantidadNinos:       number;
  packageList?:        any[];

  // BUG 4 FIX: store the search date range with each reservation
  // so multi-date bookings track which dates each room belongs to
  fechaInicial?:       Date;
  fechaFinal?:         Date;
}