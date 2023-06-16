import { DateTime } from 'luxon'


export interface ICalendario {
  fechaInicial:any,
  fechaFinal:any,
  codigoPromo:string
}
export let defaultCalendario = {
  fechaInicial:undefined,
  fechaFinal:undefined,
  codigoPromo:''
}


