import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const dateRangeValidator: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
  const start = group.get('fechaInicialForm')?.value;
  const end = group.get('fechaFinalForm')?.value;

  if (!start || !end) {
    // If either date is missing, don't flag error here (required validator handles that)
    return null;
  }

  if (new Date(start) > new Date(end)) {
    // Start date is after end date — invalid range
    return { dateRangeInvalid: true };
  }

  return null; // valid
};
