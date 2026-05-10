import { Injectable } from '@angular/core';
import { Router, CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
    constructor(
        private router: Router,
        private authService: AuthService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
        const currentUser = this.authService.currentUserValue;
        if (currentUser) {
            // Check if route is restricted by role
            if (route.data['roles'] && !route.data['roles'].some((role: string) => currentUser.roles.includes(role))) {
                // Role not authorized, so redirect to home page
                this.router.navigate(['/']);
                return false;
            }
            // Authorized
            return true;
        }

        // Not logged in, so redirect to login page with the return url
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
