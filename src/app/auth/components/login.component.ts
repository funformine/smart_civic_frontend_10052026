import { Component, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  loginForm: FormGroup;
  errorMessage: string = '';
  isLoading: boolean = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.pattern(complexityRegex)]],
      password: ['', [Validators.required, Validators.pattern(complexityRegex)]]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.errorMessage = '';

    if (this.loginForm.valid) {
      this.isLoading = true;
      console.log('Sending login request for:', this.loginForm.value.username);

      this.authService.login(this.loginForm.value.username, this.loginForm.value.password)
        .subscribe({
          next: () => {
            this.isLoading = false;
            this.cdr.detectChanges();
            const user = this.authService.currentUserValue;
            if (user?.roles.includes('ROLE_ADMIN')) {
              this.router.navigate(['/admin/dashboard']);
            } else if (user?.roles.includes('ROLE_SUB_ADMIN')) {
              this.router.navigate(['/subadmin/dashboard']);
            } else {
              this.router.navigate(['/user/dashboard']);
            }
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Login error details:', err);
            this.errorMessage = err.error?.message || 'Login failed. Please check your credentials.';
            this.cdr.detectChanges();
          }
        });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }
}
