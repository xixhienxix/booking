import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ICreateAccount } from '../../create-account.helper';
import { ICalendario } from 'src/app/_models/calendario.model';

@Component({
  selector: 'app-step3',
  templateUrl: './step3.component.html',
})
export class Step3Component implements OnInit, OnDestroy {
  @Input('updateParentModel') updateParentModel: (
    part: Partial<ICalendario>,
    isFormValid: boolean
  ) => void;
  form: FormGroup;
  @Input() defaultValues: Partial<ICalendario>;

  private unsubscribe: Subscription[] = [];

  constructor(private fb: FormBuilder) {}

  ngOnInit() {
    this.initForm();
    this.updateParentModel({}, this.checkForm());
  }

  initForm() {
    // this.form = this.fb.group({
    //   businessName: [this.defaultValues.businessName, [Validators.required]],
    //   businessDescriptor: [
    //     this.defaultValues.businessDescriptor,
    //     [Validators.required],
    //   ],
    //   businessType: [this.defaultValues.businessType, [Validators.required]],
    //   businessDescription: [this.defaultValues.businessDescription],
    //   businessEmail: [
    //     this.defaultValues.businessEmail,
    //     [Validators.required, Validators.email],
    //   ],
    // });

    // const formChangesSubscr = this.form.valueChanges.subscribe((val) => {
    //   this.updateParentModel(val, this.checkForm());
    // });
    // this.unsubscribe.push(formChangesSubscr);
  }

  checkForm() {
    return !(
      this.form.get('businessName')?.hasError('required') ||
      this.form.get('businessDescriptor')?.hasError('required') ||
      this.form.get('businessType')?.hasError('required') ||
      this.form.get('businessEmail')?.hasError('required') ||
      this.form.get('businessEmail')?.hasError('email')
    );
  }

  ngOnDestroy() {
    this.unsubscribe.forEach((sb) => sb.unsubscribe());
  }
}
