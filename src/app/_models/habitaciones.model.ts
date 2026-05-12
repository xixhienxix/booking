export interface IHabitacionImage {
  key: string;
  thumbKey: string;
  mediumKey: string;
  largeKey: string;
  isCover: boolean;
  uploadedAt?: string;
  _id?: string;
}

export interface IHabitaciones {
  _id: string;
  Codigo: string;
  Numero: string[];
  Tipo: string;
  Descripcion: string;
  Adultos: number;
  Ninos: number;
  Inventario: number;
  Vista: string;
  Camas: number;
  Tipos_Camas: string[];
  Amenidades: string[];
  Orden: Number;
  Tarifa: number;
  URL?: string;
  hotel?: string;
  Color?: string;
  Estatus: string;
  Personas?: number;
  images?: IHabitacionImage[];
}