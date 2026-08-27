import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdministrationAuditEntry, AdministrationService, ManagedRole, ManagedUser } from '../../services/administration.service';

@Component({
  selector: 'app-administration',
  imports: [DatePipe, FormsModule],
  templateUrl: './administration.component.html'
})
export class AdministrationComponent {
  private readonly administrationService = inject(AdministrationService);
  protected readonly users = signal<ManagedUser[]>([]);
  protected readonly roles = signal<ManagedRole[]>([]);
  protected readonly loading = signal(true);
  protected readonly savingUserId = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly search = signal('');
  protected readonly selectedRole = signal('');
  protected readonly page = signal(1);
  protected readonly pageSize = 25;
  protected readonly totalCount = signal(0);
  protected readonly selectedUser = signal<ManagedUser | null>(null);
  protected readonly editedRoleIds = signal<string[]>([]);
  protected readonly auditEntries = signal<AdministrationAuditEntry[]>([]);

  constructor() { this.load(); }

  protected get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount() / this.pageSize)); }
  protected isEditedRole(role: ManagedRole): boolean { return this.editedRoleIds().includes(role.id); }

  protected applyFilters(): void { this.page.set(1); this.loadUsers(); }
  protected changePage(page: number): void { this.page.set(page); this.loadUsers(); }

  protected editUser(user: ManagedUser): void {
    this.selectedUser.set(user);
    this.editedRoleIds.set(this.roles().filter((role) => user.roles.includes(role.name)).map((role) => role.id));
  }

  protected toggleEditedRole(roleId: string, checked: boolean): void {
    this.editedRoleIds.update((roleIds) => checked ? [...roleIds, roleId] : roleIds.filter((id) => id !== roleId));
  }

  protected saveRoles(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.savingUserId.set(user.id);
    this.administrationService.updateRoles(user.id, this.editedRoleIds()).subscribe({
      next: () => { this.selectedUser.set(null); this.savingUserId.set(null); this.loadUsers(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingUserId.set(null); }
    });
  }

  protected updateStatus(user: ManagedUser): void {
    const nextStatus = !user.isActive;
    if (!confirm(`${nextStatus ? 'Activate' : 'Deactivate'} ${user.userName}?`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.updateStatus(user.id, nextStatus).subscribe({
      next: () => { this.savingUserId.set(null); this.loadUsers(); this.loadAudit(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingUserId.set(null); }
    });
  }

  protected revokeSessions(user: ManagedUser): void {
    if (!confirm(`Revoke all active sessions for ${user.userName}?`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.revokeSessions(user.id).subscribe({
      next: () => { this.savingUserId.set(null); this.loadAudit(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingUserId.set(null); }
    });
  }

  protected deleteUser(user: ManagedUser): void {
    if (!confirm(`Delete ${user.userName}? This cannot be undone.`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.deleteUser(user.id).subscribe({
      next: () => { this.savingUserId.set(null); this.loadUsers(); this.loadAudit(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.savingUserId.set(null); }
    });
  }

  private load(): void {
    this.administrationService.getRoles().subscribe({
      next: (roles) => { this.roles.set(roles); this.loadUsers(); this.loadAudit(); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.loading.set(false); }
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set('');
    this.administrationService.getUsers(this.search(), this.selectedRole(), this.page(), this.pageSize).subscribe({
      next: (result) => { this.users.set(result.items); this.totalCount.set(result.totalCount); this.page.set(result.page); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.error.set(this.message(error)); this.loading.set(false); }
    });
  }

  private loadAudit(): void {
    this.administrationService.getAudit().subscribe({ next: (entries) => this.auditEntries.set(entries), error: () => {} });
  }

  private message(error: HttpErrorResponse): string {
    if (typeof error.error?.detail === 'string') return error.error.detail;
    return error.status === 403 ? 'Your account does not have user-management permission.' : 'User management is unavailable until the updated Identity Service is deployed.';
  }
}