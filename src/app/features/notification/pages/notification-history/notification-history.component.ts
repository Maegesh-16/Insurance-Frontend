import { DatePipe, TitleCasePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { NotificationChannel, NotificationHistoryItem } from '../../models/notification.models';
import { NotificationService } from '../../services/notification.service';

type NotificationFilter = NotificationChannel | 'all';

@Component({
  selector: 'app-notification-history',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './notification-history.component.html'
})
export class NotificationHistoryComponent {
  private readonly notificationService = inject(NotificationService);
  protected readonly notifications = signal<NotificationHistoryItem[]>([]);
  protected readonly selectedFilter = signal<NotificationFilter>('all');
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly filters: readonly NotificationFilter[] = ['all', 'email', 'sms', 'push'];

  constructor() {
    this.loadHistory();
  }

  protected selectFilter(filter: NotificationFilter): void {
    if (this.selectedFilter() === filter) return;
    this.selectedFilter.set(filter);
    this.loadHistory();
  }

  protected loadHistory(): void {
    this.isLoading.set(true);
    this.error.set('');
    const filter = this.selectedFilter();
    this.notificationService.getHistory(filter === 'all' ? undefined : filter).subscribe({
      next: (notifications) => {
        this.notifications.set(notifications);
        this.isLoading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.getErrorMessage(error));
        this.isLoading.set(false);
      }
    });
  }

  protected statusClass(status: string): string {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === 'sent') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    if (normalizedStatus === 'failed') return 'border-red-200 bg-red-50 text-red-800';
    return 'border-amber-200 bg-amber-50 text-amber-900';
  }

  private getErrorMessage(error: HttpErrorResponse): string {
    if (error.status === 0) return 'Cannot reach Notification Service. Start it on port 5080 and try again.';
    if (error.status === 401 || error.status === 403) return 'Your account is not authorized to view notification history.';
    if (typeof error.error?.detail === 'string') return error.error.detail;
    if (typeof error.error?.title === 'string') return error.error.title;
    return 'We could not load your notification history. Please try again.';
  }
}