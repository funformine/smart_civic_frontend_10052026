import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { SubAdminService, SubAdminTab } from '../../core/services/sub-admin.service';
import { Complaint, User } from '../../core/models/models';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

declare var lucide: any;

interface GroupedIssue {
  category: string;
  subCategory: string;
  location: string;
  status: string;
  reportersCount: number;
  complaintIds: number[];
  description: string;
  imageName: string;
  assignedHeadName?: string;
  assignedEmployees?: any[];
  slaTimeline?: string;
  representative: Complaint;
  reporters: any[]; // for legacy template compatibility (reporters.length)
}

@Component({
  selector: 'app-subadmin-dashboard',
  standalone: false,
  templateUrl: './subadmin-dashboard.component.html',
  styleUrl: './subadmin-dashboard.component.css'
})
export class SubAdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  activeTab: SubAdminTab = 'Issues';
  issues: Complaint[] = [];
  employees: User[] = [];
  isLoading = false;

  groupedIssues: GroupedIssue[] = [];
  filteredGroupedIssues: GroupedIssue[] = [];
  statusFilter = 'All';
  expandedGroups: Record<string, boolean> = {};
  hasLoaded = false;

  showFilterDropdown = false;

  get acceptedCount(): number { return this.groupedIssues.filter(g => g.representative.status === 'Accepted').length; }
  get rejectedCount(): number { return this.groupedIssues.filter(g => g.representative.status === 'Rejected').length; }
  get pendingCount(): number { return this.groupedIssues.filter(g => g.representative.status === 'Pending').length; }

  selectedIssue: Complaint | null = null;
  selectedEmployee: User | null = null;
  assignSlaDate = '';
  showEmpDropdown = false;
  isReassigning = false; // true when editing an already-assigned issue

  // New Assignment Flow Properties
  assignedTeam: User[] = [];
  assignedHead: User | null = null;
  assignStartDate: string = '';
  assignEndDate: string = '';

  resolvingGroup: GroupedIssue | null = null;
  rejectingGroup: GroupedIssue | null = null;
  showCompletionModal = false;
  resolutionNotes = '';
  rejectReason = '';
  completionProof: string = '';

  get anyHasAssignments(): boolean {
    return this.filteredGroupedIssues.some(g => this.hasAssignments(g));
  }

  get anyHasPriority(): boolean {
    return this.filteredGroupedIssues.some(g => this.hasPriority(g) && g.status !== 'Resolved');
  }

  hasAssignments(g: GroupedIssue): boolean {
    return !!g?.representative?.assignedEmployees && g.representative.assignedEmployees.length > 0;
  }

  hasPriority(g: GroupedIssue): boolean {
    const p = g?.representative?.priorityLevel;
    return !!p && p !== 'Not Set';
  }

  confirmComplete() {
    // Legacy - replaced by confirmCompletion
  }
  showAddEmployeeForm = false;
  newEmp: any = { name: '', contact: '', area: '', status: 'Not Assigned' };
  isSavingEmployee = false;
  empFeedback: { message: string, type: 'success' | 'error' | null } = { message: '', type: null };

  get availableEmployeesCount(): number {
    return this.employees.filter(e => (e as any).status === 'Not Assigned' || !(e as any).status).length;
  }

  /** For new assignments: only Available (non-Assigned and non-NotAvailable) employees */
  get assignableEmployees(): User[] {
    return this.employees.filter(e => e.status !== 'Assigned' && e.status !== 'Not Available');
  }

  /** For re-assignment: show Available employees + those specifically on this issue's team */
  get allEmployeesForReassign(): User[] {
    if (!this.isReassigning) return this.assignableEmployees;
    return this.employees.filter(e => {
      // Never show employees marked explicitly as offline
      if (e.status === 'Not Available') return false;

      // Option 1: Not Assigned (available)
      if (e.status === 'Not Assigned' || !e.status) return true;

      // Option 2: Part of the selected issue's current team (CRITICAL: show them even if status is 'Assigned')
      if (this.selectedIssue?.assignedEmployees) {
        return this.selectedIssue.assignedEmployees.some(ae => ae.id === e.id);
      }
      return false;
    });
  }

  openReassign(c: Complaint) {
    this.selectedIssue = c;
    this.isReassigning = true;
    this.subAdminService.setTab('Assignment');
    this.assignedTeam = [];
    this.assignedHead = null;

    // Map existing employees from the master list to preserve object references for the UI
    if (c.assignedEmployees && c.assignedEmployees.length > 0) {
      this.assignedTeam = this.employees.filter(emp =>
        c.assignedEmployees!.some(ae => ae.id === emp.id)
      );

      if (c.assignedHeadName) {
        this.assignedHead = this.assignedTeam.find(emp =>
          emp.name === c.assignedHeadName || emp.username === c.assignedHeadName
        ) || null;
      }
    } else {
      this.assignedTeam = [];
      this.assignedHead = null;
    }

    // Pre-fill dates with existing SLA if available
    if (c.slaTimeline) {
      const d = new Date(c.slaTimeline);
      this.assignEndDate = d.toISOString().slice(0, 16);
    } else {
      this.assignEndDate = '';
    }
    this.assignStartDate = new Date().toISOString().slice(0, 16);
    // Scroll top so user sees the assignment panel
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getSchemesByDept(): any[] {
    const dept = this.department.toLowerCase();
    const common = [
      { title: 'Digital India Mission', desc: 'Central governance digitizing public services.', budget: '?1.1L Cr', color: '#00ccff', icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>', benefits: ['Fast Process', 'Transparency'] }
    ];

    if (dept.includes('water')) {
      return [
        { title: 'Jal Jeevan Mission', desc: 'Piped water supply for all rural households.', budget: '?3.6L Cr', color: '#00bfff', icon: '<path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>', benefits: ['Clean Water', '24/7 Supply', 'Quality Monitor'] },
        { title: 'AMRUT 2.0', desc: 'Water security & circular economy of water.', budget: '?2.77L Cr', color: '#00ffa2', icon: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>', benefits: ['Smart Meters', 'Rejuvenation'] },
        ...common
      ];
    } else if (dept.includes('land')) {
      return [
        { title: 'SVAMITVA Scheme', desc: 'Drone based surveying & mapping of land.', budget: '?566 Cr', color: '#ffcc00', icon: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>', benefits: ['Drone Surveys', 'Property Cards', 'Clear Title'] },
        { title: 'DILRMP', desc: 'Computerization of land records and management.', budget: '?1.5K Cr', color: '#ff9900', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>', benefits: ['e-Registration', 'Auto Update'] },
        ...common
      ];
    } else if (dept.includes('power')) {
      return [
        { title: 'KUSUM Scheme', desc: 'Solar pumps for farmers & clean energy.', budget: '?34K Cr', color: '#ffea00', icon: '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>', benefits: ['Solar Power', 'Grid Stability', 'Lesser Cost'] },
        { title: 'RDSS Power Revamp', desc: 'Loss reduction & operational efficiency.', budget: '?3L Cr', color: '#ff3300', icon: '<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>', benefits: ['Hi-Tech Meters', 'Low Loss'] },
        ...common
      ];
    }
    return common;
  }
  get assignedEmployeesCount(): number {
    return this.employees.filter(e => (e as any).status === 'Assigned').length;
  }
  get notAvailableEmployeesCount(): number {
    return this.employees.filter(e => (e as any).status === 'Not Available').length;
  }

  private tabSub: Subscription | null = null;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    public subAdminService: SubAdminService,
    private cdr: ChangeDetectorRef
  ) { }

  get department(): string {
    return this.authService.currentUserValue?.department || 'Department';
  }

  get pendingIssues(): GroupedIssue[] {
    return this.groupedIssues.filter(g => g.status === 'Accepted');
  }

  get assignedIssues(): GroupedIssue[] {
    return this.groupedIssues.filter(g => g.status === 'In Progress');
  }

  get activeIssues(): GroupedIssue[] {
    return this.groupedIssues.filter(c => c.status !== 'Resolved' && c.status !== 'Rejected');
  }

  ngOnInit() {
    console.log('[DEBUG] SubAdminDashboard Init');
    console.log('[DEBUG] Current User Dept:', this.department);
    this.tabSub = this.subAdminService.activeTab$.subscribe(tab => {
      this.activeTab = tab;
    });
    this.loadIssues();
    this.loadEmployees();
  }

  ngAfterViewInit() {
    this.initIcons();
  }

  ngOnDestroy() {
    if (this.tabSub) this.tabSub.unsubscribe();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  loadIssues() {
    this.isLoading = true;
    this.http.get<any[]>('https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues')
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: res => {
          this.groupedIssues = res.map(g => ({
            ...g,
            representative: {
              id: g.complaintIds[0],
              category: g.category,
              subCategory: g.subCategory,
              location: g.location,
              status: g.status,
              description: g.description,
              imageName: g.imageName,
              assignedHeadName: g.assignedHeadName,
              assignedEmployees: g.assignedEmployees,
              slaTimeline: g.slaTimeline
            },
            reporters: new Array(g.reportersCount)
          }));
          this.applyFilter();
          this.hasLoaded = true;
          this.cdr.detectChanges();
          setTimeout(() => this.initIcons(), 50);
        },
        error: () => {
          this.issues = []; this.groupedIssues = []; this.filteredGroupedIssues = [];
          this.hasLoaded = true;
          this.cdr.detectChanges();
        }
      });
  }

  getIssueLabel(description: string): string {
    if (!description) return '—';
    const match = description.match(/^\[([^\]]+)\]/);
    return match ? match[1] : description.split(' ').slice(0, 3).join(' ');
  }

  buildGroupedIssues() {
    // Legacy method - the backend now handles grouping
    this.applyFilter();
  }

  setStatusFilter(val: string) {
    this.statusFilter = val;
    this.showFilterDropdown = false;
    this.applyFilter();
  }

  applyFilter() {
    if (this.statusFilter === 'All') {
      this.filteredGroupedIssues = [...this.groupedIssues];
    } else {
      this.filteredGroupedIssues = this.groupedIssues.filter(g => g.status === this.statusFilter);
    }
  }

  toggleExpand(key: string) {
    this.expandedGroups = { ...this.expandedGroups, [key]: !this.expandedGroups[key] };
  }

  loadEmployees() {
    console.log('[DEBUG] Loading Employees...');
    this.http.get<User[]>('https://smart-civic-backend-10052026.onrender.com/api/subadmin/employees')
      .subscribe({
        next: res => {
          console.log('[DEBUG] Employees loaded:', res.length);
          this.employees = res;
          this.cdr.detectChanges();
        },
        error: err => {
          console.error('[DEBUG] Load Employees Error:', err);
          this.employees = [];
          this.cdr.detectChanges();
        }
      });
  }

  saveEmployee() {
    // 1. Strict Validation
    if (!this.newEmp.name || !this.newEmp.contact || !this.newEmp.area || !this.newEmp.status) {
      this.empFeedback = { message: 'All fields are required.', type: 'error' };
      return;
    }

    this.isSavingEmployee = true;
    this.empFeedback = { message: '', type: null };

    const saveObs = this.newEmp.id
      ? this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/employees/${this.newEmp.id}`, this.newEmp)
      : (() => {
        const username = this.newEmp.name.toLowerCase().replace(/\s+/g, '.') + Math.floor(Math.random() * 100);
        const payload = { ...this.newEmp, username, password: 'password123' };
        return this.http.post('https://smart-civic-backend-10052026.onrender.com/api/subadmin/employees', payload);
      })();

    saveObs.subscribe({
      next: () => {
        this.isSavingEmployee = false;
        this.showAddEmployeeForm = false;
        this.loadEmployees();
        this.resetEmpForm();
        this.cdr.detectChanges();
        console.log(`[DEBUG] Employee ${this.newEmp.id ? 'updated' : 'added'} successfully.`);
      },
      error: (err) => {
        console.error('Save Employee Error:', err);
        this.isSavingEmployee = false;
        this.empFeedback = { message: 'Failed to save employee. Please try again.', type: 'error' };
        this.cdr.detectChanges();
      }
    });
  }

  editEmployee(e: User) {
    this.newEmp = { ...e };
    this.empFeedback = { message: '', type: null };
    this.showAddEmployeeForm = true;
  }

  deleteEmployee(id: number) {
    if (confirm('Are you sure you want to delete this employee?')) {
      this.http.delete(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/employees/${id}`)
        .subscribe(() => {
          this.loadEmployees();
          this.empFeedback = { message: 'Employee deleted successfully.', type: 'success' };
          setTimeout(() => this.empFeedback = { message: '', type: null }, 3000);
        });
    }
  }

  resetEmpForm() {
    this.newEmp = { name: '', contact: '', area: '', status: 'Not Assigned' };
    this.empFeedback = { message: '', type: null };
    this.isSavingEmployee = false;
  }
  // New Assignment Flow Methods
  toggleMember(e: User) {
    const idx = this.assignedTeam.findIndex(u => u.id === e.id);
    if (idx > -1) {
      this.assignedTeam.splice(idx, 1);
      if (this.assignedHead?.id === e.id) this.assignedHead = null;
    } else {
      if (this.assignedTeam.length >= 5) {
        alert("Maximum 5 team members allowed.");
        return;
      }
      this.assignedTeam.push(e);
    }
  }

  toggleHead(e: User) {
    if (!this.assignedTeam.some(u => u.id === e.id)) {
      alert("Must select this employee as a team member first.");
      return;
    }
    this.assignedHead = e;
  }

  submitAssignment() {
    if (!this.selectedIssue || !this.assignedHead || !this.assignStartDate || !this.assignEndDate) {
      alert("Please select an issue, team members, a head, and set the time period.");
      return;
    }

    // Find the group related to this dummy selectedIssue
    const group = this.groupedIssues.find(g => g.complaintIds.includes(this.selectedIssue!.id!));
    if (!group) return;

    const payload = {
      ids: group.complaintIds,
      headName: this.assignedHead.name || this.assignedHead.username,
      headPhone: this.assignedHead.contact,
      startDate: new Date(this.assignStartDate).toISOString(),
      endDate: new Date(this.assignEndDate).toISOString(),
      memberIds: this.assignedTeam.map(u => u.id)
    };

    this.http.post(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues/assign`, payload)
      .subscribe({
        next: (res) => {
          alert("Grouped assignment updated successfully!");
          this.loadIssues();
          this.loadEmployees();
          this.selectedIssue = null;
          this.assignedTeam = [];
          this.assignedHead = null;
          this.assignStartDate = '';
          this.assignEndDate = '';
          this.isReassigning = false; // Reset re-assignment mode
        },
        error: (err) => alert("Failed to submit assignment.")
      });
  }


  getStatusClass(status: string): string {
    const map: Record<string, string> = {
      'Pending': 'pending', 'Accepted': 'accepted',
      'In Progress': 'in-progress', 'Resolved': 'resolved', 'Rejected': 'rejected'
    };
    return map[status] || 'pending';
  }

  updateStatus(id: number, status: string) {
    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/complaints/${id}/status?status=${status}`, {})
      .subscribe({ next: () => this.loadIssues(), error: err => alert(err.error?.message || 'Update failed') });
  }

  acceptGroup(g: GroupedIssue) {
    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues/status`, {
      ids: g.complaintIds,
      status: 'Accepted'
    }).subscribe({
      next: () => this.loadIssues(),
      error: err => alert(err.error?.message || 'Accept failed')
    });
  }

  openReject(g: GroupedIssue) {
    this.rejectingGroup = g;
    this.rejectReason = '';
  }

  confirmReject() {
    if (!this.rejectingGroup || !this.rejectReason.trim()) return;
    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues/status`, {
      ids: this.rejectingGroup.complaintIds,
      status: 'Rejected',
      resolutionNotes: this.rejectReason
    }).subscribe({
      next: () => { this.rejectingGroup = null; this.loadIssues(); },
      error: err => alert(err.error?.message || 'Rejection failed')
    });
  }

  openResolve(g: GroupedIssue) {
    this.resolvingGroup = g;
    this.resolutionNotes = '';
  }

  confirmResolve() {
    if (!this.resolvingGroup) return;
    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues/status`, {
      ids: this.resolvingGroup.complaintIds,
      status: 'Resolved',
      resolutionNotes: this.resolutionNotes
    }).subscribe({
      next: () => { this.resolvingGroup = null; this.loadIssues(); },
      error: err => alert(err.error?.message || 'Resolution failed')
    });
  }

  openCompletion(g: GroupedIssue) {
    // User interface for marking as completed
    this.resolvingGroup = g;
    this.resolutionNotes = '';
    this.showCompletionModal = true;
  }

  confirmCompletion() {
    if (!this.resolvingGroup) return;
    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/subadmin/grouped-issues/status`, {
      ids: this.resolvingGroup.complaintIds,
      status: 'Resolved',
      resolutionNotes: this.resolutionNotes,
      completionProof: this.completionProof
    }).subscribe({
      next: () => {
        this.showCompletionModal = false;
        this.resolvingGroup = null;
        this.loadIssues();
      },
      error: err => alert(err.error?.message || 'Completion failed')
    });
  }

  goToAssign(c: Complaint) {
    this.selectedIssue = c;
    this.subAdminService.setTab('Assignment');
  }
}
