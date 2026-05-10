import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
    constructor(private authService: AuthService) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        const currentUser = this.authService.currentUserValue;
        const isLoggedIn = currentUser && currentUser.token;
        const isApiUrl = request.url.includes('/api/') || request.url.startsWith('https://smart-civic-backend-10052026.onrender.com/api');

        if (isLoggedIn && isApiUrl) {
            console.log('[JWT_INTERCEPTOR] Attaching token to request:', request.url);
            request = request.clone({
                setHeaders: {
                    Authorization: `Bearer ${currentUser.token}`
                }
            });
        } else {
            if (isApiUrl) {
                console.warn('[JWT_INTERCEPTOR] Request to API detected but NOT attaching token. isLoggedIn:', !!isLoggedIn, 'isApiUrl:', !!isApiUrl);
            }
        }

        return next.handle(request);
    }
}
