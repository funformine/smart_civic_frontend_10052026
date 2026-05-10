import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/models';

const AUTH_API = 'https://smart-civic-backend-10052026.onrender.com/api/auth/';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private currentUserSubject: BehaviorSubject<User | null>;
    public currentUser: Observable<User | null>;
    public apiUrl = 'https://smart-civic-backend-10052026.onrender.com/api';

    constructor(private http: HttpClient) {
        const storedUser = localStorage.getItem('currentUser');
        this.currentUserSubject = new BehaviorSubject<User | null>(storedUser ? JSON.parse(storedUser) : null);
        this.currentUser = this.currentUserSubject.asObservable();
    }

    public get currentUserValue(): User | null {
        return this.currentUserSubject.value;
    }

    login(username: string, password: string): Observable<any> {
        return this.http.post<any>(AUTH_API + 'signin', { username, password })
            .pipe(
                map(user => {
                    localStorage.setItem('currentUser', JSON.stringify(user));
                    this.currentUserSubject.next(user);
                    return user;
                })
            );
    }

    register(user: any): Observable<any> {
        return this.http.post(AUTH_API + 'signup', user);
    }

    logout(): void {
        localStorage.removeItem('currentUser');
        this.currentUserSubject.next(null);
    }

    updateUser(user: User): void {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const currentUser = JSON.parse(storedUser);
            const updatedUser = { ...currentUser, ...user };
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
            this.currentUserSubject.next(updatedUser);
        }
    }

    isLoggedIn(): boolean {
        return !!this.currentUserSubject.value;
    }

    hasRole(role: string): boolean {
        const user = this.currentUserValue;
        return !!user && user.roles.includes(role);
    }
}
