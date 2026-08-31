import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { NotificationChannel, NotificationHistoryItem } from '../models/notification.models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/notification-api/api/notifications';

  getHistory(channel?: NotificationChannel): Observable<NotificationHistoryItem[]> {
    const params = channel ? new HttpParams().set('channel', channel) : undefined;
    return this.http.get<NotificationHistoryItem[]>(`${this.apiUrl}/history`, { params });
  }
}