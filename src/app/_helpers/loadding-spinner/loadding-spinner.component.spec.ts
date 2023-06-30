import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoaddingSpinnerComponent } from './loadding-spinner.component';

describe('LoaddingSpinnerComponent', () => {
  let component: LoaddingSpinnerComponent;
  let fixture: ComponentFixture<LoaddingSpinnerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ LoaddingSpinnerComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LoaddingSpinnerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
