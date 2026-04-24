import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'utcToLocal',
  standalone: true
})
export class UtcToLocalPipe implements PipeTransform {
  transform(value: Date | string | null | undefined, formatStr: string = 'HH:mm'): string {
    if (!value) return '';

    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    // Показываем время в Москве стабильно, независимо от TZ пользователя
    if (formatStr === 'HH:mm') {
      return new Intl.DateTimeFormat('ru-RU', {
        timeZone: 'Europe/Moscow',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).format(date);
    }

    // Фолбэк: просто toLocaleString по Москве
    return new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow' }).format(date);
  }
}
