import { HttpErrorResponse } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdministrationAuditEntry, AdministrationService, CreateUserRequest, ManagedRole, ManagedUser } from '../../services/administration.service';

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
  protected readonly showCreateUser = signal(false);
  protected readonly creatingUser = signal(false);
  protected readonly createError = signal('');
  protected readonly createSuccess = signal('');
  protected newUser: CreateUserRequest & { confirmPassword: string } = this.blankUser();

  constructor() { this.load(); }

  protected get totalPages(): number { return Math.max(1, Math.ceil(this.totalCount() / this.pageSize)); }
  protected isEditedRole(role: ManagedRole): boolean { return this.editedRoleIds().includes(role.id); }
  protected isOperationalRole(role: ManagedRole): boolean { return role.name !== 'Customer'; }

  protected applyFilters(): void { this.page.set(1); this.loadUsers(); }
  protected changePage(page: number): void { this.page.set(page); this.loadUsers(); }

  protected openCreateUser(): void { this.newUser = this.blankUser(); this.createError.set(''); this.createSuccess.set(''); this.showCreateUser.set(true); }

  protected toggleNewUserRole(roleId: string, checked: boolean): void {
    this.newUser.roleIds = checked ? [...this.newUser.roleIds, roleId] : this.newUser.roleIds.filter((id) => id !== roleId);
  }

  protected submitCreateUser(): void {
    const email = this.newUser.email.trim();
    const userName = this.newUser.userName.trim();
    if (!email || !userName || !this.newUser.password) { this.createError.set('Email, username, and password are required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { this.createError.set('Enter a valid email address.'); return; }
    if (userName.length < 3) { this.createError.set('Username must be at least 3 characters.'); return; }
    if (this.newUser.password.length < 8) { this.createError.set('Password must be at least 8 characters.'); return; }
    if (this.newUser.password !== this.newUser.confirmPassword) { this.createError.set('Passwords do not match.'); return; }
    if (!this.newUser.roleIds.length) { this.createError.set('Assign at least one role.'); return; }
    this.creatingUser.set(true);
    this.createError.set('');
    const { confirmPassword: _, ...request } = this.newUser;
    this.administrationService.createUser({ ...request, email, userName }).subscribe({
      next: (user) => {
        this.creatingUser.set(false);
        this.createSuccess.set(`User ${user.userName} created successfully.`);
        this.newUser = this.blankUser();
        this.loadUsers();
        this.loadAudit();
      },
      error: (err: HttpErrorResponse) => { this.createError.set(this.message(err)); this.creatingUser.set(false); }
    });
  }

  protected editUser(user: ManagedUser): void {
    this.selectedUser.set(user);
    this.editedRoleIds.set(this.roles().filter((role) => user.roles.includes(role.name)).map((role) => role.id));
  }

  protected toggleEditedRole(roleId: string, checked: boolean): void {
    this.editedRoleIds.update((ids) => checked ? [...ids, roleId] : ids.filter((id) => id !== roleId));
  }

  protected saveRoles(): void {
    const user = this.selectedUser();
    if (!user) return;
    this.savingUserId.set(user.id);
    this.administrationService.updateRoles(user.id, this.editedRoleIds()).subscribe({
      next: () => { this.selectedUser.set(null); this.savingUserId.set(null); this.loadUsers(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.savingUserId.set(null); }
    });
  }

  protected updateStatus(user: ManagedUser): void {
    const nextStatus = !user.isActive;
    if (!confirm(`${nextStatus ? 'Activate' : 'Deactivate'} ${user.userName}?`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.updateStatus(user.id, nextStatus).subscribe({
      next: () => { this.savingUserId.set(null); this.loadUsers(); this.loadAudit(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.savingUserId.set(null); }
    });
  }

  protected revokeSessions(user: ManagedUser): void {
    if (!confirm(`Revoke all active sessions for ${user.userName}?`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.revokeSessions(user.id).subscribe({
      next: () => { this.savingUserId.set(null); this.loadAudit(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.savingUserId.set(null); }
    });
  }

  protected sendPasswordReset(user: ManagedUser): void {
    if (!confirm(`Send a password reset link to ${user.userName}?`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.sendPasswordReset(user.id).subscribe({
      next: () => { this.savingUserId.set(null); this.loadAudit(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.savingUserId.set(null); }
    });
  }

  protected deleteUser(user: ManagedUser): void {
    if (!confirm(`Delete ${user.userName}? This cannot be undone.`)) return;
    this.savingUserId.set(user.id);
    this.administrationService.deleteUser(user.id).subscribe({
      next: () => { this.savingUserId.set(null); this.loadUsers(); this.loadAudit(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.savingUserId.set(null); }
    });
  }

  private load(): void {
    this.administrationService.getRoles().subscribe({
      next: (roles) => { this.roles.set(roles.filter((role) => this.isOperationalRole(role))); this.loadUsers(); this.loadAudit(); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.loading.set(false); }
    });
  }

  private loadUsers(): void {
    this.loading.set(true);
    this.error.set('');
    this.administrationService.getUsers(this.search(), this.selectedRole(), this.page(), this.pageSize).subscribe({
      next: (result) => { this.users.set(result.items); this.totalCount.set(result.totalCount); this.page.set(result.page); this.loading.set(false); },
      error: (err: HttpErrorResponse) => { this.error.set(this.message(err)); this.loading.set(false); }
    });
  }

  private loadAudit(): void {
    this.administrationService.getAudit().subscribe({ next: (entries) => this.auditEntries.set(entries), error: () => {} });
  }

  private blankUser(): CreateUserRequest & { confirmPassword: string } {
    return { email: '', userName: '', password: '', confirmPassword: '', roleIds: [] };
  }

  private message(err: HttpErrorResponse): string {
    if (typeof err.error?.detail === 'string') return err.error.detail;
    if (typeof err.error?.title === 'string') return err.error.title;
    if (typeof err.error === 'string' && err.error.trim()) return err.error;
    if (err.error?.errors && typeof err.error.errors === 'object') {
      const validationMessages = Object.values(err.error.errors).flat().filter((message): message is string => typeof message === 'string');
      if (validationMessages.length) return validationMessages.join(' ');
    }
    if (err.status === 403) return 'Your account does not have user-management permission.';
    if (err.status === 401) return 'Your session has expired. Sign in again and retry.';
    if (err.status === 500) return 'Identity Service could not create the user. Check its Render logs for the server error.';
    return 'User management request failed. Please try again.';
  }
}
