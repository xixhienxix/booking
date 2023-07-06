import { DateTime } from 'luxon'


export interface ICalendario {
  fechaInicial:any,
  fechaFinal:any,
  codigoPromo:string
  adultos:number,
  ninos:number
}
export let defaultCalendario = {
  fechaInicial:undefined,
  fechaFinal:undefined,
  codigoPromo:'',
  adultos:1,
  ninos:0
}


