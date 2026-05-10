import { Component, AfterViewInit } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { AdminService, AdminTab } from '../../core/services/admin.service';
import { SubAdminService, SubAdminTab } from '../../core/services/sub-admin.service';

declare var lucide: any;

@Component({
  selector: 'app-sidebar',
  standalone: false,
  template: `
    <div class="sidebar" *ngIf="authService.currentUserValue">
      <div class="role-badge">
        <span class="badge-label">Role</span>
        <h3 class="role-name">{{ userRole }}</h3>
        <span class="dept-label" *ngIf="isSubAdmin">{{ departmentLabel }}</span>
      </div>

      <nav>
        <ul>
          <!-- CITIZEN-ONLY TABS -->
          <ng-container *ngIf="isCitizenOnly">
            <li>
              <a routerLink="/user/dashboard" routerLinkActive="active">
                <i data-lucide="layout-dashboard"></i> Dashboard
              </a>
            </li>
            <li>
              <a routerLink="/user/raise" routerLinkActive="active">
                <i data-lucide="plus-circle"></i> Complaints
              </a>
            </li>
            <li>
              <a routerLink="/user/track" routerLinkActive="active">
                <i data-lucide="search"></i> Track Status
              </a>
            </li>
          </ng-container>

          <!-- ADMIN-ONLY TABS -->
          <ng-container *ngIf="isAdmin">
            <li>
              <a (click)="setAdminTab('Overview')" [class.active]="activeAdminTab('Overview')">
                <i data-lucide="bar-chart-2"></i> Admin Dashboard
              </a>
            </li>
            <li>
              <a (click)="setAdminTab('Land')" [class.active]="activeAdminTab('Land')">
                <i data-lucide="map"></i> Land Oversight
              </a>
            </li>
            <li>
              <a (click)="setAdminTab('Water')" [class.active]="activeAdminTab('Water')">
                <i data-lucide="droplet"></i> Water Oversight
              </a>
            </li>
            <li>
              <a (click)="setAdminTab('Power')" [class.active]="activeAdminTab('Power')">
                <i data-lucide="zap"></i> Power Insights
              </a>
            </li>
            <li>
              <a (click)="setAdminTab('Creation')" [class.active]="activeAdminTab('Creation')">
                <i data-lucide="user-plus"></i> User Creation
              </a>
            </li>
          </ng-container>

          <!-- SUB-ADMIN TABS — 5 Department Tabs -->
          <ng-container *ngIf="isSubAdmin">
            <li>
              <a (click)="setSubAdminTab('Issues')" [class.active]="activeSubAdminTab('Issues')">
                <i data-lucide="clipboard-list"></i> Issue Reports
              </a>
            </li>
            <li>
              <a (click)="setSubAdminTab('Employees')" [class.active]="activeSubAdminTab('Employees')">
                <i data-lucide="users"></i> Employee Management
              </a>
            </li>
            <li>
              <a (click)="setSubAdminTab('Assignment')" [class.active]="activeSubAdminTab('Assignment')">
                <i data-lucide="user-check"></i> Employee Assignment
              </a>
            </li>
            <li>
              <a (click)="setSubAdminTab('Resolution')" [class.active]="activeSubAdminTab('Resolution')">
                <i data-lucide="book-open"></i> Govt Schemes
              </a>
            </li>
          </ng-container>

          <!-- SHARED PROFILE -->
          <li>
            <a routerLink="/user/profile" routerLinkActive="active">
              <i data-lucide="user-cog"></i> Profile
            </a>
          </li>

          <li class="logout-item">
            <button (click)="logout()" class="btn-logout">
              <i data-lucide="log-out"></i> Logout
            </button>
          </li>
        </ul>
      </nav>
    </div>
  `,
  styles: [`
    .sidebar {
      width: 250px;
      height: calc(100vh - 70px);
      background-color: var(--smart-bg-card);
      padding: 1.5rem;
      position: fixed;
      left: 0;
      top: 70px;
      border-right: 1px solid rgba(255,255,255,0.05);
      display: flex;
      flex-direction: column;
      z-index: 99;
      overflow-y: auto;
    }

    .role-badge {
      background: rgba(255,255,255,0.03);
      padding: 1rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      border: 1px solid rgba(255,255,255,0.05);
      text-align: center;
    }

    .badge-label {
      font-size: 0.75rem;
      color: var(--smart-text-grey);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    .role-name {
      color: var(--smart-green-neon);
      margin-top: 5px;
      font-size: 1.1rem;
    }

    .dept-label {
      display: inline-block;
      margin-top: 6px;
      font-size: 0.72rem;
      color: var(--smart-green-neon);
      background: rgba(0,255,136,0.08);
      border: 1px solid rgba(0,255,136,0.2);
      border-radius: 20px;
      padding: 2px 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    nav ul {
      padding: 0;
      margin: 0;
      list-style: none;
    }

    nav ul li {
      margin-bottom: 0.75rem;
    }

    nav ul li a {
      color: var(--smart-green-neon);
      border: 1px solid var(--smart-green-neon);
      padding: 0.85rem 1rem;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-weight: 500;
      transition: var(--smart-transition);
      background: transparent;
      font-size: 0.88rem;
      cursor: pointer;
      text-decoration: none;
    }

    nav ul li a i { width: 1.1rem; height: 1.1rem; flex-shrink: 0; }

    nav ul li a:hover {
      box-shadow: 0 0 15px rgba(0,255,136,0.2);
      transform: translateX(5px);
    }

    nav ul li a.active {
      background: var(--smart-green-neon);
      color: var(--smart-bg-dark);
      box-shadow: 0 8px 25px rgba(0,255,136,0.3);
      border-color: transparent;
    }

    .logout-item {
      margin-top: auto;
      padding-top: 1rem;
    }

    .btn-logout {
      width: 100%;
      background: transparent;
      border: 1px solid #ff4d4d;
      color: #ff4d4d;
      padding: 1rem;
      border-radius: 12px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      transition: var(--smart-transition);
      cursor: pointer;
    }

    .btn-logout i { width: 1.2rem; height: 1.2rem; }

    .btn-logout:hover {
      background: #ff4d4d;
      color: white;
      box-shadow: 0 0 15px rgba(255,77,77,0.3);
    }
  `]
})
export class SidebarComponent implements AfterViewInit {
  constructor(
    public authService: AuthService,
    public adminService: AdminService,
    public subAdminService: SubAdminService,
    private router: Router
  ) { }

  ngAfterViewInit() {
    this.initIcons();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  get isAdmin(): boolean {
    return this.authService.hasRole('ROLE_ADMIN');
  }

  get isSubAdmin(): boolean {
    return this.authService.hasRole('ROLE_SUB_ADMIN') && !this.isAdmin;
  }

  get isCitizenOnly(): boolean {
    return this.authService.hasRole('ROLE_USER') && !this.authService.hasRole('ROLE_ADMIN') && !this.authService.hasRole('ROLE_SUB_ADMIN');
  }

  get department(): string {
    return this.authService.currentUserValue?.department || '';
  }

  get departmentLabel(): string {
    const dept = this.department;
    if (!dept) return '';
    return dept + ' Department';
  }

  get userRole(): string {
    if (this.isAdmin) return 'Administrator';
    const roles = this.authService.currentUserValue?.roles || [];
    if (roles.includes('ROLE_SUB_ADMIN')) return 'Sub Administrator';
    return 'Public Citizen';
  }

  setAdminTab(tab: AdminTab) {
    this.adminService.setTab(tab);
    if (!this.isAtAdminDashboard()) {
      this.router.navigate(['/admin/dashboard']);
    }
    setTimeout(() => this.initIcons(), 0);
  }

  activeAdminTab(tab: AdminTab): boolean {
    return this.adminService.currentTab === tab && this.isAtAdminDashboard();
  }

  isAtAdminDashboard(): boolean {
    return this.router.url.includes('/admin/dashboard');
  }

  setSubAdminTab(tab: SubAdminTab) {
    this.subAdminService.setTab(tab);
    if (!this.router.url.includes('/subadmin/dashboard')) {
      this.router.navigate(['/subadmin/dashboard']);
    }
    setTimeout(() => this.initIcons(), 0);
  }

  activeSubAdminTab(tab: SubAdminTab): boolean {
    return this.subAdminService.currentTab === tab && this.router.url.includes('/subadmin/dashboard');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
