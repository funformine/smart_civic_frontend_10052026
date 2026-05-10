import { Component, AfterViewInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { filter } from 'rxjs/operators';

declare var lucide: any;

@Component({
  selector: 'app-navbar',
  standalone: false,
  template: `
    <nav class="navbar">
      <!-- Section 1: Logo -->
      <div class="nav-logo" routerLink="/home">
        <div class="logo-box">
          <i data-lucide="shield" class="logo-icon-lucide"></i>
        </div>
        <span class="logo-text">Smart<span class="text-neon">Civic</span></span>
      </div>

      <!-- Section 2: Nav Elements -->
      <div class="nav-links" [class.active]="isMenuOpen">
        <a routerLink="/home" routerLinkActive="active" (click)="closeMenu()">
          <i data-lucide="home" class="nav-mini-icon"></i> Home
        </a>
        <a routerLink="/about" routerLinkActive="active" (click)="closeMenu()">
          <i data-lucide="info" class="nav-mini-icon"></i> About
        </a>
        <a routerLink="/contact" routerLinkActive="active" (click)="closeMenu()">
          <i data-lucide="phone" class="nav-mini-icon"></i> Contact
        </a>
      </div>

      <!-- Section 3: Auth Buttons -->
      <div class="nav-auth">
        <ng-container *ngIf="!authService.currentUserValue; else userMenu">
          <button *ngIf="showLogin" class="btn-primary" routerLink="/auth/login">Login</button>
        </ng-container>
        
        <ng-template #userMenu>
          <div class="user-profile" (click)="toggleDropdown()">
            <i data-lucide="user" class="user-icon"></i>
            <span class="username">{{ authService.currentUserValue?.username }}</span>
            <i data-lucide="chevron-down" class="chevron-icon"></i>
            <div class="dropdown-menu" *ngIf="dropdownOpen">
              <a (click)="dashboard()"><i data-lucide="layout-dashboard"></i> Dashboard</a>
              <a (click)="profile()"><i data-lucide="user-cog"></i> My Profile</a>
              <a (click)="logout()"><i data-lucide="log-out"></i> Logout</a>
            </div>
          </div>
        </ng-template>

        <!-- Mobile Toggle -->
        <div class="mobile-toggle" (click)="toggleMenu()">
          <i [attr.data-lucide]="isMenuOpen ? 'x' : 'menu'"></i>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .navbar {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 70px;
      background: rgba(15, 17, 16, 0.95);
      backdrop-filter: blur(10px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0 5%;
      z-index: 1000;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .nav-logo {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
    }

    .logo-box {
      width: 38px;
      height: 38px;
      background: var(--smart-green-neon);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 15px rgba(0, 255, 136, 0.3);
    }

    .logo-icon-lucide {
      width: 1.2rem;
      height: 1.2rem;
      color: var(--smart-bg-dark);
      stroke-width: 2.5px;
    }

    .logo-text {
      font-size: 1.3rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }

    .nav-links {
      display: flex;
      gap: 35px;
    }

    .nav-links a {
      color: var(--smart-text-grey);
      font-weight: 500;
      transition: var(--smart-transition);
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .nav-mini-icon { width: 1rem; height: 1rem; opacity: 0.7; }

    .nav-links a:hover, .nav-links a.active {
      color: white;
    }

    .nav-links a.active .nav-mini-icon { color: var(--smart-green-neon); opacity: 1; }

    .nav-auth {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .user-profile {
      cursor: pointer;
      position: relative;
      background: rgba(255, 255, 255, 0.05);
      padding: 6px 16px;
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 10px;
      transition: 0.3s;
    }
    
    .user-profile:hover { background: rgba(255, 255, 255, 0.08); border-color: var(--smart-green-neon); }

    .user-icon { width: 1.1rem; height: 1.1rem; color: var(--smart-green-neon); }
    .chevron-icon { width: 0.9rem; height: 0.9rem; opacity: 0.5; }

    .dropdown-menu {
      position: absolute;
      top: calc(100% + 15px);
      right: 0;
      background: var(--smart-bg-card);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      width: 180px;
      overflow: hidden;
      box-shadow: 0 15px 40px rgba(0,0,0,0.6);
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn { from { opacity: 0; transform: translateY(10px); } }

    .dropdown-menu a {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 18px;
      color: white;
      font-size: 0.95rem;
      transition: 0.2s;
    }

    .dropdown-menu a i { width: 1.1rem; height: 1.1rem; opacity: 0.7; }

    .dropdown-menu a:hover {
      background: var(--smart-green-neon);
      color: var(--smart-bg-dark);
    }

    .dropdown-menu a:hover i { opacity: 1; color: var(--smart-bg-dark); }

    .mobile-toggle {
      display: none;
      cursor: pointer;
      font-size: 1.5rem;
    }

    @media (max-width: 768px) {
      .nav-links {
        position: absolute;
        top: 70px;
        left: -100%;
        width: 100%;
        height: calc(100vh - 70px);
        background: var(--smart-bg-dark);
        flex-direction: column;
        align-items: center;
        justify-content: center;
        transition: 0.5s;
        z-index: 999;
      }

      .nav-links.active {
        left: 0;
      }

      .mobile-toggle {
        display: block;
      }
    }
  `]
})
export class NavbarComponent implements AfterViewInit {
  isMenuOpen = false;
  dropdownOpen = false;
  showLogin = true;

  constructor(public authService: AuthService, private router: Router) {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      const url = event.url;
      this.showLogin = !url.includes('/auth/login');
      setTimeout(() => this.initIcons(), 0);
    });
  }

  ngAfterViewInit() {
    this.initIcons();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
    setTimeout(() => this.initIcons(), 0);
  }

  closeMenu() {
    this.isMenuOpen = false;
  }

  toggleDropdown() {
    this.dropdownOpen = !this.dropdownOpen;
    setTimeout(() => this.initIcons(), 0);
  }

  dashboard() {
    const user = this.authService.currentUserValue;
    if (user?.roles.includes('ROLE_ADMIN')) {
      this.router.navigate(['/admin/dashboard']);
    } else if (user?.roles.includes('ROLE_SUB_ADMIN')) {
      this.router.navigate(['/subadmin/dashboard']);
    } else {
      this.router.navigate(['/user/dashboard']);
    }
  }

  profile() {
    const user = this.authService.currentUserValue;
    if (user?.roles.includes('ROLE_ADMIN')) {
      this.router.navigate(['/admin/dashboard']);
    } else {
      this.router.navigate(['/user/profile']);
    }
    this.dropdownOpen = false;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
