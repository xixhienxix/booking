import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatFormFieldModule} from '@angular/material/form-field';
import {HttpClientModule} from '@angular/common/http'
import { AppComponent } from './app.component';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { MatNativeDateModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { AppRoutingModule } from './app-routing.module';
import { LoaddingSpinnerComponent } from './_helpers/loadding-spinner/loadding-spinner.component';

@NgModule({
  declarations: [
    AppComponent,
    LoaddingSpinnerComponent,    
  ],
  imports: [
    HttpClientModule,
    AppRoutingModule,
    MatButtonModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatDatepickerModule,
    BrowserModule,
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
