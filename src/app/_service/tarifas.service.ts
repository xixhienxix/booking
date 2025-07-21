import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { BehaviorSubject, Observable, firstValueFrom, map } from "rxjs";
import { ITarifas } from "../_models/tarifas.model";
import { environment } from "src/environments/environment";
import { tarifarioTabla, Tarifas } from "../_models/tarifario.model";
import { DateTime } from "luxon"
@Injectable({
  providedIn: 'root'
})

export class TarifasService {

  constructor(private http: HttpClient) {
  }

  private tarifas$: BehaviorSubject<Tarifas[]> = new BehaviorSubject<Tarifas[]>([])
  currentData = this.tarifas$.asObservable();


  updateTarifario(data: any) {
    this.tarifas$.next(data)
  }

  getTarifas(): Observable<ITarifas[]> {
    return this.http
      .get<ITarifas[]>(environment.apiUrl + '/tarifario/tarifas')
      .pipe(
        map(responseData => {
          return responseData
        })
      )

  }

  getAll() :Observable<Tarifas[]> {
    return this.http
     .get<any[]>(environment.apiUrl + '/tarifario/tarifas')
     .pipe(
       map(responseData=>{
        return responseData
     })
     )
  }

  retriveBaseRatePrice(
    codigosCuarto: string,
    checkDay: Date,
    standardRatesArray: Tarifas[],
    adultos: number,
    ninos: number,
    tempRatesArray: Tarifas[],
  ): number {
    const tarifaBase = standardRatesArray.find(obj => obj.Habitacion.includes(codigosCuarto));
    const tarifaTemporada = this.checkIfTempRateAvaible(
      codigosCuarto,
      checkDay,
      tempRatesArray,
      adultos,
      ninos,
    );

    if (tarifaTemporada !== 0) {
      return Math.ceil(tarifaTemporada);
    }
    let tarifaTotal: number = 0
    if (tarifaBase?.TarifasActivas.length !== 0) {
      tarifaBase?.TarifasActivas.forEach((item) => {
        let rate = 0;
        switch (adultos) {
          case 1:
            rate = item.Tarifa_1;
            break;
          case 2:
            rate = item.Tarifa_2;
            break;
          case 3:
            rate = item.Tarifa_3;
            break;
          default:
            rate = item.Tarifa_3;
        }
        tarifaTotal += rate * adultos;
        if (ninos !== 0) {
          tarifaTotal += item.Tarifa_N * ninos;
        }
      });
    } else {
      tarifaTotal = tarifaBase?.TarifaRack!;
    }

    return Math.ceil(tarifaTotal! ?? 0);
  }

  checkIfTempRateAvaible(
    codigoCuarto: string,
    fecha: Date,
    tempRatesArray: Tarifas[],
    adultos: number,
    ninos: number,
  ): number {
    const fechaDate = DateTime.fromISO(fecha.toISOString(), { zone: 'America/Mexico_City' });

    // const tarifaTemporada = tempRatesArray.find(obj => obj.Habitacion.includes(codigoCuarto));
    const tarifaTemporada = tempRatesArray.find(obj => {
      const llegada = DateTime.fromISO(obj.Llegada.toString(), { zone: 'America/Mexico_City' })
        .startOf("day"); // Set to 00:00:00

      const salida = DateTime.fromISO(obj.Salida.toString(), { zone: 'America/Mexico_City' })
        .endOf("day"); // Set to 23:59:59

      // Compare DateTime objects
      const isWithinRange = fechaDate >= llegada && fechaDate <= salida;

      return obj.Habitacion.includes(codigoCuarto) && isWithinRange;
    });

    if (!tarifaTemporada) return 0;

    const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
    const day = fecha.getDay();
    const validDay = tarifaTemporada.TarifasActivas[0]?.Dias?.some(
      x => x.name === dayNames[day] && x.checked
    );

    if (validDay && tarifaTemporada.Estado) {
      let tarifaTotal = 0;
      tarifaTemporada.TarifasActivas.forEach(item => {
        let rate = 0;
        switch (adultos) {
          case 1:
            rate = item.Tarifa_1;
            break;
          case 2:
            rate = item.Tarifa_2;
            break;
          case 3:
            rate = item.Tarifa_3;
            break;
          default:
            rate = item.Tarifa_3;
        }
        tarifaTotal += rate * adultos;
        if (ninos !== 0) {
          tarifaTotal += item.Tarifa_N * ninos;
        }
      });
      return Math.ceil(tarifaTotal);
    }
    return 0;
  }

  ratesTotalCalcSelected(
    tarifa: Tarifas,
    adultos: number,
    ninos: number,
    initialDate: Date,
    endDate: Date,
    habitacion: string = '',
    tempArray: Tarifas[] = []
  ): { fecha: string; tarifaTotal: number }[] {

    const results: { fecha: string; tarifaTotal: number }[] = [];
    const start = DateTime.fromISO(initialDate.toISOString());
    const end = DateTime.fromISO(endDate.toISOString()).startOf('day'); // Ensure endDate excludes its time

    const applyRate = (item: any, date: DateTime) => {
      let rate = 0;
      switch (adultos) {
        case 1:
          rate = item.Tarifa_1;
          break;
        case 2:
          rate = item.Tarifa_2;
          break;
        case 3:
          rate = item.Tarifa_3;
          break;
        default:
          rate = item.Tarifa_3;
      }

      let tarifaTotal = rate * adultos;
      if (ninos !== 0) {
        tarifaTotal += item.Tarifa_N * ninos;
      }

      const formattedDate = date.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE);
      results.push({ fecha: formattedDate, tarifaTotal });
    };

    for (let current = start.startOf('day'), updatedInitialDate = start;
      current < end;
      current = current.plus({ days: 1 }), updatedInitialDate = updatedInitialDate.plus({ days: 1 })) {
      let dailyTarifaTotal = 0;

      //check if temp Rate avaible
      dailyTarifaTotal = this.checkIfTempRateAvaible(habitacion, updatedInitialDate.toJSDate(), tempArray, adultos, ninos);

      if (dailyTarifaTotal !== 0) {
        const formattedDate = current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE);
        results.push({ fecha: formattedDate, tarifaTotal: dailyTarifaTotal });

      } else {

        let tarifaAplicada = false;

        if (tarifa.Tarifa !== 'Tarifa Base' && tarifa.Estado) {
          const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];
          const day = current.weekday - 1; // Adjust for 0-based index

          tarifa.TarifasActivas.forEach(item => {
            const validDay = item.Dias?.some(x => x.name === dayNames[day] && x.checked);
            if (validDay && item.Activa) {
              applyRate(item, current);
              tarifaAplicada = true;
            }
          });
        }

        if (!tarifaAplicada) {
          // Call to base rate function if no active rates were applied
          dailyTarifaTotal = this.retriveBaseRatePriceSeleccionado(
            tarifa,
            adultos,
            ninos,
          );

          const formattedDate = current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE);
          results.push({ fecha: formattedDate, tarifaTotal: dailyTarifaTotal });
        }
      }
    }

    // Return results after the loop
    return results;
  }

    retriveBaseRatePriceSeleccionado(
      tarifaBase: Tarifas,
      adultos: number, 
      ninos: number,
  ): number {

      let tarifaTotal = 0;
      if (tarifaBase?.TarifasActivas.length !== 0) {
          tarifaBase?.TarifasActivas.forEach((item) => {
              let rate = 0;
              switch (adultos) {
                  case 1:
                      rate = item.Tarifa_1;
                      break;
                  case 2:
                      rate = item.Tarifa_2;
                      break;
                  case 3:
                      rate = item.Tarifa_3;
                      break;
                  default:
                      rate = item.Tarifa_3;
              }

              tarifaTotal += rate * adultos;

              if (ninos !== 0) {
                  tarifaTotal += item.Tarifa_N * ninos;
              }
          });
      } else {
          tarifaTotal = tarifaBase?.TarifaRack ?? 0;
      }

      return Math.ceil(tarifaTotal ?? 0);
  }

    ratesTotalCalc(
    tarifa: Tarifas,
    standardRatesArray:Tarifas[],
    tempRatesArray:Tarifas[],
    codigosCuarto: string,
    adultos: number,
    ninos: number,
    initialDate: Date,
    endDate: Date,
    stayNights: number,
    tarifaPromedio: boolean = false,
    returnArray: boolean = true,
    onlyBreakDown:boolean = false
): { fecha: string; tarifaTotal: number; }[] | number | any[]
 {

    const results: { fecha: string; tarifaTotal: number }[] = [];
    let tarifaTotal = 0;
    const start = DateTime.fromISO(initialDate.toISOString());
    const end = DateTime.fromISO(endDate.toISOString()).startOf('day');
    let tarifaBreakDown: any[] = [];

    const applyRate = (item: any, date: DateTime) => {
        let rate = adultos <= 3 ? item[`Tarifa_${adultos}`] : item.Tarifa_3;
        let total = rate * adultos;
        if (ninos !== 0) {
            total += item.Tarifa_N * ninos;
        }

        if (returnArray) {
            const formattedDate = date.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE);
            results.push({ fecha: formattedDate, tarifaTotal: total });
        } else {
            tarifaTotal += total;
            tarifaBreakDown.push({ tarifa: item.Descripcion, fecha: date.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE), tarifaTotal: total });
        }
    };

    if (tarifa.Tarifa !== 'Tarifa Base') {
        const zonaHoraria = 'America/Mexico_City';

        const initialDateLuxon = DateTime.fromJSDate(initialDate, { zone: zonaHoraria }).startOf('day');
        const endDateLuxon = DateTime.fromJSDate(endDate, { zone: zonaHoraria }).startOf('day');
        const llegadaDate = DateTime.fromISO(tarifa.Llegada.toString(), { zone: zonaHoraria }).startOf('day');
        const salidaDate = DateTime.fromISO(tarifa.Salida.toString(), { zone: zonaHoraria }).startOf('day');

        const isWithinRange =
            (llegadaDate >= initialDateLuxon && llegadaDate <= endDateLuxon) ||
            (salidaDate >= initialDateLuxon && salidaDate <= endDateLuxon) ||
            (llegadaDate <= initialDateLuxon && salidaDate >= endDateLuxon);

        if (isWithinRange && tarifa.Estado) {
            const dayNames = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

            for (let current = start.startOf('day'); current < end; current = current.plus({ days: 1 })) {
                const isDateWithinTarifa = current >= llegadaDate && current <= salidaDate;

                const applicableTempTarifa = tempRatesArray.find(item => {
                  const llegadaDate = DateTime.fromISO(item.Llegada.toString()); 
                  const salidaDate = DateTime.fromISO(item.Salida.toString());
                
                  const isDateWithinRange = current >= llegadaDate && current <= salidaDate;
                  const hasMatchingHabitacion = item.Habitacion.some(hab => tarifa.Habitacion.includes(hab));
                
                  return isDateWithinRange && hasMatchingHabitacion;
                });

                const applicableTarifa = isDateWithinTarifa
                ? tarifa
                : (applicableTempTarifa || standardRatesArray.find(item =>
                    item.Habitacion.some(hab => tarifa.Habitacion.includes(hab))
                  ));

                let tarifaAplicada = false;

                if (applicableTarifa) {
                    applicableTarifa.TarifasActivas.forEach(item => {
                        const day = current.weekday - 1;
                        if (item.Dias?.some(x => x.name === dayNames[day] && x.checked) && item.Activa) {
                            applyRate(item, current);
                            tarifaAplicada = true;
                        }
                    });
                }

                if (!tarifaAplicada) {
                    const baseRate = this.retriveBaseRatePrice(
                        codigosCuarto,
                        current.toJSDate(),
                        standardRatesArray,
                        adultos,
                        ninos,
                        tempRatesArray
                    );

                    if (returnArray) {
                        results.push({ fecha: current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE), tarifaTotal: baseRate });
                    } else {
                        tarifaTotal += baseRate;
                        tarifaBreakDown.push({ tarifa: "Tarifa Base", fecha: current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE), tarifaTotal: baseRate });
                    }
                }
            }
        } else {
        }
    } else {
        for (let current = start.startOf('day'); current < end; current = current.plus({ days: 1 })) {
            const baseRate = this.retriveBaseRatePrice(codigosCuarto, current.toJSDate(), standardRatesArray, adultos, ninos, tempRatesArray);
            if (returnArray) {
                results.push({ fecha: current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE), tarifaTotal: baseRate });
            } else {
                tarifaTotal += baseRate;
                tarifaBreakDown.push({ tarifa: "Tarifa Base", fecha: current.setLocale('es-MX').toLocaleString(DateTime.DATE_HUGE), tarifaTotal: baseRate });
            }
        }
        if (!returnArray) {
            tarifaTotal = tarifaPromedio ? Math.ceil(tarifaTotal / stayNights) : tarifaTotal;
        }
    }
    return onlyBreakDown ? tarifaBreakDown : returnArray ? results : tarifaTotal;
  }

  async roomRates(intialDate:Date,endDate:Date) {
    const availbleRates = await firstValueFrom(this.getAll());
    let filteredRates = availbleRates.filter((item) => item.Estado === true);


    // filteredRates = filteredRates.filter(obj => obj.Habitacion.includes('1'));

    // Update date range validation: include rates that overlap with the customer’s stay
    filteredRates = filteredRates.filter(item => {
      const llegadaDate = new Date(item.Llegada);
      const salidaDate = new Date(item.Salida);

      // Check if there is any overlap with the customer’s requested range
      return intialDate <= salidaDate && endDate >= llegadaDate;
    });

    filteredRates = filteredRates.filter(item => item.Tarifa !== 'Tarifa De Temporada');
    this.tarifas$.next(filteredRates);

    return filteredRates;
  }

}