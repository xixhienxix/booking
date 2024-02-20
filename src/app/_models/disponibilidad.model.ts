
export interface IDisponibilidad
{
  _id: string;
  Cuarto: string;
  Habitacion: string;
  Estatus: number;
  Llegada: Date;
  Salida: Date;
  Estatus_AMA: string;
  hotel: string;
  Folio: string;
}

export let defaultDispo: IDisponibilidad = {
  _id: '',
  Cuarto: '',
  Habitacion: '',
  Estatus:1,
  Llegada: new Date(),
  Salida: new Date(Date.now() + ( 3600 * 1000 * 24)),
  Estatus_AMA: '',
  hotel: '',
  Folio: ''
};
