import { Packages } from "./packages.model";

export interface miReserva {
    codigoCuarto:string,
    numeroCuarto:string,
    cantidadHabitaciones:number,
    nombreTarifa:string,
    precioTarifa:number,
    detallesTarifa:string,
    cantidadAdultos:number,
    cantidadNinos:number,
    packageList?:Packages[]
  }
  