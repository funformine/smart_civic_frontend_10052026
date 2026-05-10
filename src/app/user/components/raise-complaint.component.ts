import { Component, OnInit, AfterViewInit, HostListener } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

declare var lucide: any;

@Component({
  selector: 'app-raise-complaint',
  standalone: false,
  templateUrl: './raise-complaint.component.html',
  styleUrl: './raise-complaint.component.css'
})
export class RaiseComplaintComponent implements OnInit, AfterViewInit {
  complaintForm: FormGroup;
  isSubmitting: boolean = false;
  openDropdown: string | null = null;

  submitStatus: 'success' | 'error' | null = null;
  feedbackMessage: string = '';
  showFeedback: boolean = false;
  countdown: number = 3;

  subCategories: string[] = [];
  areaOptions: string[] = ['Downtown', 'West End', 'Green Valley', 'Industrial Zone', 'Civic Square'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private authService: AuthService
  ) {
    // Immediate pre-fill from cache during construction for maximum speed
    const cachedUser = this.authService.currentUserValue;
    const initialArea = cachedUser?.area || cachedUser?.district || '';

    this.complaintForm = this.fb.group({
      category: ['', Validators.required],
      subCategory: ['', Validators.required],
      customIssue: [''],
      description: ['', Validators.required],
      area: [initialArea, Validators.required],
      imageName: ['', Validators.required]
    });
  }

  ngOnInit() {
    // Double check if area is still empty (e.g. if profile was updated since login)
    // or if the cached value was not available.
    if (!this.complaintForm.get('area')?.value) {
      this.fetchUserProfile();
    }
  }

  fetchUserProfile() {
    this.http.get<any>('https://smart-civic-backend-10052026.onrender.com/api/user/profile').subscribe({
      next: (profile) => {
        if (profile.location) {
          console.log('[COMPLAINT_DEBUG] Setting auto-area from profile:', profile.location);
          this.complaintForm.patchValue({ area: profile.location });
        }
      }
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.openDropdown = null;
    }
  }

  ngAfterViewInit() {
    this.initIcons();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  toggleDropdown(type: string, event: Event) {
    event.stopPropagation();
    this.openDropdown = this.openDropdown === type ? null : type;
    console.log('[COMPLAINT_DEBUG] Toggled dropdown:', type, 'Current state:', this.openDropdown);
    setTimeout(() => this.initIcons(), 0);
  }

  selectCategory(cat: string) {
    console.log('[COMPLAINT_DEBUG] Category selected:', cat);
    this.complaintForm.patchValue({ category: cat, subCategory: '', customIssue: '' });

    // Fetch dynamic issue types from backend
    this.http.get<string[]>(`https://smart-civic-backend-10052026.onrender.com/api/issue-types/${cat}`).subscribe({
      next: (types) => {
        this.subCategories = [...types, 'Others'];
        console.log('[COMPLAINT_DEBUG] Sub-categories fetched:', this.subCategories);
        setTimeout(() => this.initIcons(), 0);
      },
      error: () => {
        // Fallback if API fails
        this.subCategories = ['Others'];
        setTimeout(() => this.initIcons(), 0);
      }
    });
  }

  selectSub(sub: string, event: Event) {
    event.stopPropagation();
    this.complaintForm.patchValue({ subCategory: sub });
    if (sub !== 'Others') {
      this.complaintForm.patchValue({ customIssue: '' });
      this.complaintForm.get('customIssue')?.clearValidators();
    } else {
      this.complaintForm.get('customIssue')?.setValidators(Validators.required);
    }
    this.complaintForm.get('customIssue')?.updateValueAndValidity();
    this.openDropdown = null;
    setTimeout(() => this.initIcons(), 0);
  }


  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.complaintForm.patchValue({ imageName: file.name });
    }
    setTimeout(() => this.initIcons(), 0);
  }

  onSubmit() {
    if (this.complaintForm.invalid) return;

    this.isSubmitting = true;
    const formValue = this.complaintForm.value;

    const finalSubCategory = formValue.subCategory === 'Others' ? formValue.customIssue : formValue.subCategory;
    const finalDescription = `[${finalSubCategory}] ${formValue.description}`;

    const payload = {
      category: formValue.category,
      subCategory: finalSubCategory,
      description: finalDescription,
      location: formValue.area,
      imageName: formValue.imageName,
      status: 'Pending'
    };

    this.http.post('https://smart-civic-backend-10052026.onrender.com/api/complaints/raise', payload)
      .subscribe({
        next: () => {
          this.isSubmitting = false;
          this.submitStatus = 'success';
          this.feedbackMessage = 'Your complaint has been logged and assigned to the relevant department.';
          this.triggerFeedback();
          this.startCountdown();
        },
        error: (err) => {
          this.isSubmitting = false;
          this.submitStatus = 'error';
          this.feedbackMessage = err.error?.message || 'We encountered an error while processing your request.';
          this.triggerFeedback();
        }
      });
  }

  triggerFeedback() {
    setTimeout(() => {
      this.showFeedback = true;
      this.initIcons();
    }, 100);
  }

  startCountdown() {
    const timer = setInterval(() => {
      this.countdown--;
      if (this.countdown <= 0) {
        clearInterval(timer);
        this.router.navigate(['/user/dashboard']);
      }
    }, 1000);
  }
}
