import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { AuthResponse } from '../models/auth.models';

export interface ManagedUser { id: string; email: string; userName: string; isActive: boolean; roles: string[]; }
export interface ManagedRole { id: string; name: string; description: string; }
export interface PagedUsers { items: ManagedUser[]; totalCount: number; page: number; pageSize: number; }
export interface AdministrationAuditEntry { id: string; actorUserId: string; targetUserId: string; action: string; details: string; occurredAtUtc: string; }
export interface CreateUserRequest { email: string; userName: string; password: string; roleIds: string[]; }

@Injectable({ providedIn: 'root' })
export class AdministrationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = '/identity-api/api/administration';
  private readonly authApiUrl = '/identity-api/api/auth';

  getUsers(search: string, role: string, page: number, pageSize: number): Observable<PagedUsers> {
    return this.http.get<PagedUsers>(`${this.apiUrl}/users`, { params: { search, role, page, pageSize } });
  }
  getRoles(): Observable<ManagedRole[]> { return this.http.get<ManagedRole[]>(`${this.apiUrl}/roles`); }
  createUser(request: CreateUserRequest): Observable<ManagedUser> {
    return this.http.post<AuthResponse>(`${this.authApiUrl}/register`, request).pipe(
      switchMap((registeredUser) => this.updateRoles(registeredUser.userId, request.roleIds).pipe(
        map(() => ({
          id: registeredUser.userId,
          email: registeredUser.email ?? request.email,
          userName: registeredUser.userName ?? request.userName,
          isActive: true,
          roles: []
        }))
      ))
    );
  }
  updateRoles(userId: string, roleIds: string[]): Observable<void> { return this.http.put<void>(`${this.apiUrl}/users/${userId}/roles`, { roleIds }); }
  updateStatus(userId: string, isActive: boolean): Observable<void> { return this.http.put<void>(`${this.apiUrl}/users/${userId}/status`, { isActive }); }
  revokeSessions(userId: string): Observable<void> { return this.http.post<void>(`${this.apiUrl}/users/${userId}/revoke-sessions`, {}); }
  sendPasswordReset(userId: string): Observable<void> { return this.http.post<void>(`${this.apiUrl}/users/${userId}/send-password-reset`, {}); }
  deleteUser(userId: string): Observable<void> { return this.http.delete<void>(`${this.apiUrl}/users/${userId}`); }
  getAudit(): Observable<AdministrationAuditEntry[]> { return this.http.get<AdministrationAuditEntry[]>(`${this.apiUrl}/audit`); }
}