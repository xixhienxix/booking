// _service/folio.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface Foliador {
  _id: string;
  Folio: string;
  hotel: string;
  Letra: string;
}

@Injectable({ providedIn: 'root' })
export class FolioService {

  constructor(private http: HttpClient) {}

  getAll(): Observable<Foliador[]> {
    return this.http.get<Foliador[]>(environment.apiUrl + '/folios/all').pipe(
      map(responseData => responseData)
    );
  }

  getBookingFolio(): Observable<Foliador> {
    return this.getAll().pipe(
      map(folios => {
        const folio = folios.find(f => f.Letra === 'R');
        if (!folio) throw new Error('Folio R not found');
        return folio;
      })
    );
  }
}