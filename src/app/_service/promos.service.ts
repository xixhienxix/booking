// _service/promos.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { Promos } from '../_models/promos.model';

@Injectable({ providedIn: 'root' })
export class PromosBookingService {

  private _promos$ = new BehaviorSubject<Promos[]>([]);
  readonly promos$ = this._promos$.asObservable();

  constructor(private http: HttpClient) {}

  get currentPromos(): Promos[] {
    return this._promos$.value;
  }

  fetchPromos(): Observable<Promos[]> {
    return this.http.get<Promos[]>(`${environment.apiUrl}/promos`)
      .pipe(tap(promos => this._promos$.next(promos)));
  }
}