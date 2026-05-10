import { Component, OnInit, AfterViewInit, ElementRef, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Complaint } from '../../core/models/models';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

declare var lucide: any;

@Component({
  selector: 'app-track-status',
  standalone: false,
  templateUrl: './track-status.component.html',
  styleUrl: './track-status.component.css'
})
export class TrackStatusComponent implements OnInit, AfterViewInit {
  @ViewChild('scroller') scroller!: ElementRef;

  complaints: Complaint[] = [];
  filteredComplaints: Complaint[] = [];
  selectedComplaint: Complaint | null = null;
  activeFilter: string = 'All';
  activeScope: 'Personal' | 'Local' = 'Personal';
  userLocation: string = '';
  currentUserId: number | null = null;
  isLoading: boolean = false;

  standardSteps = ['Reported', 'Approved', 'Process Ongoing', 'Completed'];

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit() { this.fetchUserProfile(); }
  ngAfterViewInit() { this.initIcons(); }
  initIcons() { if (typeof lucide !== 'undefined') lucide.createIcons(); }

  fetchUserProfile() {
    this.http.get<any>('http://localhost:8081/api/user/profile').subscribe({
      next: (profile) => {
        this.userLocation = profile.location;
        this.currentUserId = profile.id;
        this.fetchData();
      }
    });
  }

  fetchData() {
    if (this.activeScope === 'Personal') this.fetchMyComplaints();
    else this.fetchAreaComplaints();
  }

  refreshData() { this.fetchData(); }

  fetchMyComplaints() {
    this.isLoading = true;
    this.http.get<Complaint[]>('http://localhost:8081/api/complaints/my').pipe(
      timeout(10000),
      catchError(err => { console.error('[TRACK_DEBUG] My reports failed:', err); return of([]); })
    ).subscribe({
      next: (res) => { this.complaints = res || []; this.applyFilter(); this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  fetchAreaComplaints() {
    this.isLoading = true;
    this.http.get<Complaint[]>(`http://localhost:8081/api/complaints/area?location=${encodeURIComponent(this.userLocation)}`).pipe(
      timeout(10000),
      catchError(err => { console.error('[TRACK_DEBUG] Area reports failed:', err); return of([]); })
    ).subscribe({
      next: (res) => { this.complaints = res || []; this.applyFilter(); this.isLoading = false; this.cdr.detectChanges(); },
      error: () => { this.isLoading = false; this.cdr.detectChanges(); }
    });
  }

  setFilter(filter: string) { this.activeFilter = filter; this.applyFilter(); }

  setScope(scope: 'Personal' | 'Local') {
    this.activeScope = scope;
    this.selectedComplaint = null;
    this.fetchData();
  }

  applyFilter() {
    this.filteredComplaints = this.activeFilter === 'All'
      ? [...this.complaints]
      : this.complaints.filter(c => c.category === this.activeFilter);
    this.cdr.detectChanges();
    setTimeout(() => this.initIcons(), 0);
  }

  selectComplaint(c: Complaint) {
    this.selectedComplaint = c;
    setTimeout(() => this.initIcons(), 0);
  }

  scroll(dir: string) {
    this.scroller.nativeElement.scrollLeft += dir === 'left' ? -300 : 300;
  }

  /**
   * Maps actual backend status strings → timeline step index:
   *   'Pending'     → 0  (Reported)
   *   'Accepted'    → 1  (Approved  — department accepted the issue)
   *   'In Progress' → 2  (Process Ongoing — assigned to employee)
   *   'Resolved'    → 3  (Completed)
   */
  private getStatusIndex(status: string): number {
    const map: { [key: string]: number } = {
      'Pending': 0,
      'Accepted': 1,
      'In Progress': 2,
      'Resolved': 3
    };
    return map[status] ?? -1;
  }

  isStepCompleted(index: number): boolean {
    if (!this.selectedComplaint) return false;
    const status = this.selectedComplaint.status;
    // 'In Progress': steps 0, 1, and 2 all filled solid green
    if (status === 'In Progress') return index <= 2;
    // 'Resolved': all 4 steps filled
    if (status === 'Resolved') return index <= 3;
    // General case
    return index < this.getStatusIndex(status);
  }

  isStepActive(index: number): boolean {
    if (!this.selectedComplaint) return false;
    const status = this.selectedComplaint.status;
    // Prevent the transparent 'active' ring from overriding the solid fill
    if (status === 'In Progress' && index <= 2) return false;
    if (status === 'Resolved' && index <= 3) return false;
    return index === this.getStatusIndex(status);
  }
}
