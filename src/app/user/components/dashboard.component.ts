import { Component, OnInit, AfterViewInit, HostListener, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Complaint } from '../../core/models/models';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { DashboardStateService } from '../../core/services/dashboard-state.service';

declare var lucide: any;

@Component({
  selector: 'app-user-dashboard',
  standalone: false,
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class UserDashboardComponent implements OnInit, AfterViewInit {
  complaints: Complaint[] = [];
  isStatsLoading: boolean = true;
  isReportsLoading: boolean = true;
  summary: any = null;
  currentPage: number = 0;
  isLastPage: boolean = false;
  isFetchingBatch: boolean = false;

  constructor(
    private http: HttpClient,
    private dashboardStateService: DashboardStateService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    console.log('[DASHBOARD_DEBUG] Initializing Instant Stats + Lazy Loading...');

    // Immediate paint from state cache
    const cached = this.dashboardStateService.getSummary();
    if (cached) {
      this.summary = cached;
      this.isStatsLoading = false;
      console.log('[DASHBOARD_DEBUG] Displaying cached summary.');
    }

    this.fetchSummary();
    this.fetchBatch();
  }

  fetchSummary() {
    const start = performance.now();
    this.http.get<any>('https://smart-civic-backend-10052026.onrender.com/api/complaints/summary').subscribe({
      next: (data) => {
        const duration = (performance.now() - start).toFixed(2);
        console.log(`[DASHBOARD_DEBUG] Stats summary received in ${duration}ms:`, data);
        this.summary = data;
        this.dashboardStateService.setSummary(data); // Sync to state cache
        this.isStatsLoading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initIcons(), 0);
      },
      error: () => { this.isStatsLoading = false; }
    });
  }

  fetchBatch() {
    if (this.isFetchingBatch || this.isLastPage) return;

    this.isFetchingBatch = true;
    const page = this.currentPage;
    console.log(`[DASHBOARD_DEBUG] Loading batch for page ${page}...`);

    const start = performance.now();
    this.http.get<any>(`https://smart-civic-backend-10052026.onrender.com/api/complaints/my/paginated?page=${page}&size=6`).pipe(
      timeout(10000),
      catchError(err => {
        console.error('[DASHBOARD_DEBUG] Batch load failed:', err);
        return of({ content: [], last: true });
      })
    ).subscribe({
      next: (res) => {
        const duration = (performance.now() - start).toFixed(2);
        const content = res.content || [];
        this.isLastPage = res.last;
        this.complaints = [...this.complaints, ...content];
        this.currentPage++;
        this.isReportsLoading = false;
        this.isFetchingBatch = false;
        this.cdr.detectChanges();
        setTimeout(() => this.initIcons(), 0);

        // Auto-load more if we have space (e.g., initial load)
        if (!this.isLastPage && this.complaints.length < 12) {
          this.fetchBatch();
        }
      },
      error: () => {
        this.isReportsLoading = false;
        this.isFetchingBatch = false;
      }
    });
  }

  onScroll() {
    const scrollPos = window.innerHeight + window.scrollY;
    const thresh = document.body.offsetHeight - 500;
    if (scrollPos >= thresh) {
      this.fetchBatch();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.onScroll();
  }

  ngAfterViewInit() {
    this.initIcons();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  getCount(status: string) {
    return this.complaints.filter(c => c.status === status).length;
  }

  // --- EDIT & DELETE LOGIC ---
  editingComplaint: Complaint | null = null;
  editDesc: string = '';
  editLoc: string = '';
  isSavingEdit: boolean = false;

  openEdit(c: Complaint) {
    this.editingComplaint = c;
    this.editDesc = c.description;
    this.editLoc = c.location;
    setTimeout(() => this.initIcons(), 0);
  }

  saveEdit() {
    if (!this.editingComplaint || this.isSavingEdit) return;
    this.isSavingEdit = true;

    const payload = {
      description: this.editDesc,
      location: this.editLoc,
      category: this.editingComplaint.category
    };

    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/complaints/${this.editingComplaint.id}`, payload).subscribe({
      next: (res: any) => {
        // Update local state
        const idx = this.complaints.findIndex(c => c.id === this.editingComplaint!.id);
        if (idx !== -1) {
          this.complaints[idx].description = res.description;
          this.complaints[idx].location = res.location;
        }
        this.isSavingEdit = false;
        this.editingComplaint = null;
        this.fetchSummary(); // Refresh stats just in case
        this.cdr.detectChanges();
        console.log('[DASHBOARD_DEBUG] Complaint edited successfully. Modal closed.');
      },
      error: () => {
        this.isSavingEdit = false;
        alert('Failed to update complaint. Please try again.');
      }
    });
  }

  deleteReport(id: number) {
    if (!confirm('Are you sure you want to delete this pending report? This cannot be undone.')) return;

    this.http.delete(`https://smart-civic-backend-10052026.onrender.com/api/complaints/${id}`).subscribe({
      next: () => {
        this.complaints = this.complaints.filter(c => c.id !== id);
        this.fetchSummary(); // Refresh stats
        console.log('[DASHBOARD_DEBUG] Complaint deleted successfully.');
      },
      error: () => {
        alert('Failed to delete complaint. It may no longer be pending.');
      }
    });
  }
}
