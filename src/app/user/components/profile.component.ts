import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

declare var lucide: any;

@Component({
  selector: 'app-profile',
  standalone: false,
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  profileData: any;
  profileForm: FormGroup;
  passwordForm: FormGroup;

  isUpdatingProfile = false;
  isChangingPassword = false;

  submitStatus: 'success' | 'error' | null = null;
  feedbackMessage: string = '';
  showFeedback: boolean = false;

  notification = {
    show: false,
    visible: false,
    type: 'success',
    icon: 'check-circle',
    title: '',
    message: ''
  };

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;

    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      contact: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]],
      area: ['', Validators.required],
      district: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6), Validators.pattern(complexityRegex)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(g: FormGroup) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { 'mismatch': true };
  }

  ngOnInit() {
    this.fetchProfile();
    setTimeout(() => { this.initIcons(); }, 100);
  }

  initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  showNotification(type: string, title: string, message: string, icon: string) {
    this.notification = { show: true, visible: false, type, title, message, icon };
    setTimeout(() => {
      this.notification.visible = true;
      this.initIcons();
    }, 10);

    // Auto hide after 5 seconds
    setTimeout(() => this.hideNotification(), 5000);
  }

  hideNotification() {
    this.notification.visible = false;
    setTimeout(() => this.notification.show = false, 500);
  }

  fetchProfile() {
    console.log('[PROFILE_DEBUG] Fetching profile from: http://localhost:8081/api/user/profile');
    this.http.get('http://localhost:8081/api/user/profile').subscribe({
      next: (data: any) => {
        console.log('[PROFILE_DEBUG] Profile data successfully fetched:', data);
        this.profileData = data;
        this.profileForm.patchValue({
          name: data.name,
          contact: data.contact,
          area: data.area,
          district: data.district
        });
        setTimeout(() => this.initIcons(), 0);
      },
      error: (err) => {
        console.error('[PROFILE_DEBUG] Error fetching profile:', err);
        this.showNotification('error', 'Fetch Failed', 'Could not load your profile data from the server.', 'alert-circle');
      }
    });
  }

  onUpdateProfile() {
    this.isUpdatingProfile = true;
    this.http.put('http://localhost:8081/api/user/profile', this.profileForm.value)
      .pipe(finalize(() => this.isUpdatingProfile = false))
      .subscribe({
        next: (res: any) => {
          this.profileData = res;

          // Sync with global auth state for instant UI refresh
          this.authService.updateUser(res);

          this.submitStatus = 'success';
          this.feedbackMessage = 'Your profile has been updated and synchronized instantly across the system.';
          this.triggerFeedback();

          // Visual Refresh: Re-fetch the clean record from DB
          setTimeout(() => this.fetchProfile(), 500);

          // Auto hide overlay after 2.5 seconds
          setTimeout(() => {
            this.submitStatus = null;
            this.showFeedback = false;
            this.cdr.detectChanges();
          }, 2500);
        },
        error: (err) => {
          this.submitStatus = 'error';
          this.feedbackMessage = err.error?.message || 'We could not update your profile. Please check your connection.';
          this.triggerFeedback();
        }
      });
  }

  triggerFeedback() {
    this.cdr.detectChanges();
    setTimeout(() => {
      this.showFeedback = true;
      this.initIcons();
      this.cdr.detectChanges();
    }, 100);
  }

  onChangePassword() {
    this.isChangingPassword = true;
    const payload = {
      currentPassword: this.passwordForm.value.currentPassword,
      newPassword: this.passwordForm.value.newPassword
    };

    this.http.put('http://localhost:8081/api/user/password', payload)
      .pipe(finalize(() => this.isChangingPassword = false))
      .subscribe({
        next: () => {
          this.submitStatus = 'success';
          this.feedbackMessage = 'Your password has been changed successfully. Your account is now more secure.';
          this.triggerFeedback();
          this.passwordForm.reset();

          setTimeout(() => {
            this.submitStatus = null;
            this.showFeedback = false;
          }, 2500);
        },
        error: (err) => {
          this.submitStatus = 'error';
          this.feedbackMessage = err.error?.message || 'Failed to change password. Please check your current credentials.';
          this.triggerFeedback();
        }
      });
  }

  onUnimplementedFeature() {
    this.showNotification('info', 'Feature Locked', 'Profile photo customization is part of our upcoming roadmap.', 'info');
  }
}
