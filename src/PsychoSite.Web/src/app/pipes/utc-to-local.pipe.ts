import { Pipe, PipeTransform } from '@angular/core';
import { format } from 'date-fns';

@Pipe({
  name: 'utcToLocal',
  standalone: true
})
export class UtcToLocalPipe implements PipeTransform {
  transform(value: Date | string | null | undefined, formatStr: string = 'HH:mm'): string {
    if (!value) return '';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    // Конвертируем UTC в локальное время (московское UTC+3)
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const localTime = new Date(utcTime);

    return format(localTime, formatStr);
  }
}
