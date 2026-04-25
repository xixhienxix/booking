import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { BehaviorSubject, Subject, firstValueFrom, forkJoin } from 'rxjs';
import { ICalendario, defaultCalendario } from 'src/app/_models/calendario.model';
import { DisponibilidadService } from 'src/app/_service/disponibilidad.service';
import { TarifasService } from 'src/app/_service/tarifas.service';
import { SpinnerService } from 'src/app/_service/spinner.service';
import { PromosBookingService } from 'src/app/_service/promos.service';
import { Promos } from 'src/app/_models/promos.model';
import { HabitacionesService } from 'src/app/_service/habitacion.service';
import { Step3Component } from '../steps/step3/step3.component';
import { ParametersService } from 'src/app/_service/parameters.service';
import { HotelConfigService } from 'src/app/_service/hotel-config.service';

@Component({
  selector: 'app-horizontal',
  templateUrl: './horizontal.component.html',
  styleUrls: ['./horizontal.component.scss']
})
export class HorizontalComponent implements OnInit, OnDestroy {

  // Start at step 2 — step 1 is no longer used
  formsCount = 3;  // steps: 2 (availability), 3 (confirm), 4 (done)
  account$: BehaviorSubject<ICalendario> = new BehaviorSubject<ICalendario>(defaultCalendario);
  private ngUnsubscribe = new Subject<void>();

  isLoading = false;

  // Default dates: today → tomorrow. Step 2 banner lets user change them.
  intialDate: Date = (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })();
  endDate: Date   = (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(0,0,0,0); return d; })();

  qty    = 1;
  qtyNin = 0;

  step3Valid = false;
  hasSearched = false;   // ← guards the room list until first search

  currentStep$: BehaviorSubject<number> = new BehaviorSubject(2);  // start at 2
  isCurrentFormValid$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  @ViewChild(Step3Component) step3!: Step3Component;

  constructor(
    private _disponibilidadService: DisponibilidadService,
    private tarifasService: TarifasService,
    private spinnerService: SpinnerService,
    private _promosBookingService: PromosBookingService,
    private _habitacionService: HabitacionesService,
    private _parametrosService: ParametersService,
    private _hotelConfig: HotelConfigService,
  ) {
      console.log('✅ HorizontalComponent constructor called');
    this.spinnerService.isLoading$.subscribe(val => this.isLoading = val);
  }

  async ngOnInit(): Promise<void> {
    this.spinnerService.loadingState = true;

    // Await all prerequisites before turning off the spinner
    // This guarantees currentHabitaciones is populated before any availability query
    try {
      await firstValueFrom(forkJoin([
        this._promosBookingService.fetchPromos(),
        this._habitacionService.getHabitaciones(),
        this._parametrosService.getAll(),
      ]));
    } finally {
      this.spinnerService.loadingState = false;
    }

    // Patch hotel into account
    const hotelId = this._hotelConfig.current?.hotelID ?? '';
    this.account$.next({
      ...this.account$.value,
      hotel:        hotelId,
      fechaInicial: this.intialDate,
      fechaFinal:   this.endDate,
      adultos:      this.qty,
      ninos:        this.qtyNin,
    });

    // Step validity wiring
    this.currentStep$.subscribe(step => {
      switch (step) {
        case 2:  this.isCurrentFormValid$.next(false); break;
        case 3:  this.isCurrentFormValid$.next(this.step3Valid); break;
        default: this.isCurrentFormValid$.next(true); break;
      }
    });

    // Subscribe to reserva so step 2 validity updates when user adds a room
    this._disponibilidadService.currentReserva.subscribe(reservas => {
      if (this.currentStep$.value === 2) {
        this.isCurrentFormValid$.next(reservas.length > 0);
      }
    });

    // NOTE: No auto-query here — user must interact with the search banner first.
  }

  // ── Called when user hits Buscar in step2 editable banner ─────────────
  async onStep2SearchChanged(params: {
    intialDate: Date;
    endDate:    Date;
    qty:        number;
    qtyNin:     number;
  }) {
    console.log('%c[Horizontal] onStep2SearchChanged fired', 'color: cyan; font-weight: bold', params);

    this.intialDate = params.intialDate;
    this.endDate    = params.endDate;
    this.qty        = params.qty;
    this.qtyNin     = params.qtyNin;

    this.account$.next({
      ...this.account$.value,
      fechaInicial: params.intialDate,
      fechaFinal:   params.endDate,
      adultos:      params.qty,
      ninos:        params.qtyNin,
    });

    console.log('%c[Horizontal] account$ after patch', 'color: cyan', this.account$.value);

    await this._runAvailabilityQuery(params.intialDate, params.endDate);
  }

  // ── Shared availability query ──────────────────────────────────────────
  private async _runAvailabilityQuery(startDate: Date, endDate: Date) {
    console.log('%c[Horizontal] _runAvailabilityQuery start', 'color: orange; font-weight: bold', { startDate, endDate });

    const currentData: ICalendario = {
      ...this.account$.value,
      fechaInicial: startDate,
      fechaFinal:   endDate,
      adultos:      this.qty,
      ninos:        this.qtyNin,
    };

    console.log('%c[Horizontal] payload sent to getDisponibilidad', 'color: orange', currentData);

    let result: string[];
    try {
      result = await firstValueFrom(
        this._disponibilidadService.getDisponibilidad(currentData)
      );
      console.log('%c[Horizontal] getDisponibilidad result', 'color: orange', result);
    } catch (err) {
      console.error('[Horizontal] getDisponibilidad ERROR', err);
      return;
    }

    const currentHabs = this._habitacionService.currentHabitaciones;
    console.log('%c[Horizontal] currentHabitaciones at query time', 'color: orange', currentHabs);

    const validatedPromo = currentData.validatedPromo ?? null;
    let filteredResult   = result;

    if (validatedPromo && validatedPromo.habs?.length > 0) {
      filteredResult = result.filter((roomNumero: string) => {
        const roomObj = currentHabs.find((h: any) => h.Numero === roomNumero);
        return roomObj ? validatedPromo.habs.includes(roomObj.Codigo) : false;
      });
      console.log('%c[Horizontal] filteredResult after promo filter', 'color: orange', filteredResult);
    }

    let dispoResponse: any;
    try {
      dispoResponse = await this._disponibilidadService.calcHabitacionesDisponibles(
        filteredResult, startDate, endDate, '1'
      );
      console.log('%c[Horizontal] calcHabitacionesDisponibles response', 'color: orange', dispoResponse);
    } catch (err) {
      console.error('[Horizontal] calcHabitacionesDisponibles ERROR', err);
      return;
    }

    this._disponibilidadService.changePreAsignadas(dispoResponse.preAsignadasArray);
    console.log('%c[Horizontal] changePreAsignadas called with', 'color: orange', dispoResponse.preAsignadasArray);

    try {
      await this.tarifasService.roomRates(startDate, endDate);
      console.log('%c[Horizontal] roomRates completed', 'color: orange');
    } catch (err) {
      console.error('[Horizontal] roomRates ERROR', err);
      return;
    }

    this.hasSearched = true;
    console.log('%c[Horizontal] hasSearched = true, query complete', 'color: lime; font-weight: bold');
  }

  // ── Passed as @Input to step2 ─────────────────────────────────────────
  updateAccount = (part: Partial<ICalendario>, isFormValid: boolean) => {
    this.account$.next({ ...this.account$.value, ...part });
    this.isCurrentFormValid$.next(isFormValid);
  };

  // ── Navigation ────────────────────────────────────────────────────────
  async nextStep() {
    const currentStep = this.currentStep$.value;

    if (currentStep === 3) {
      this.step3.guestForm.markAllAsTouched();
      this.step3.cardForm.markAllAsTouched();
      if (!this.step3.guestForm.valid || !this.step3.cardForm.valid) return;

      const saved = await this.step3.submitBooking();
      if (!saved) {
        console.error('Reservation could not be saved');
        return;
      }
    }

    const nextStep = currentStep + 1;
    if (nextStep > 4) return;
    this.currentStep$.next(nextStep);
  }

  prevStep() {
    const prev = this.currentStep$.value - 1;
    if (prev < 2) return;   // floor is step 2, no step 1
    this.currentStep$.next(prev);
  }

  resetStepper() {
    this._disponibilidadService.changeMiReserva([]);
    this.currentStep$.next(2);
    this.isCurrentFormValid$.next(false);
  }

  honQtyHabsUpdate(numeroHabs: number) {
    this._disponibilidadService.changeCurrentNumeroHabs(numeroHabs);
  }

  updateStep3Validity(isValid: boolean) {
    this.step3Valid = isValid;
    if (this.currentStep$.value === 3) {
      this.isCurrentFormValid$.next(isValid);
    }
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }
}