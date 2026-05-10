import { Component, OnInit, AfterViewInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Complaint, User } from '../../core/models/models';
import { AuthService } from '../../core/services/auth.service';
import { AdminService, AdminTab } from '../../core/services/admin.service';
import { finalize, timeout, catchError } from 'rxjs/operators';
import { Subscription, of } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface GroupedIssue {
  category: string;
  subCategory: string;
  location: string;
  status: string;
  reportersCount: number;
  complaintIds: number[];
  description: string;
  representative: Complaint;
  assignedEmployees?: any[];
  assignedHeadName?: string;
  assignedHeadPhone?: string;
  slaTimeline?: string;
  priorityLevel?: string;
  slaAssigned?: boolean;
}

declare var lucide: any;

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrl: './admin-dashboard.component.css'
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  complaints: Complaint[] = [];
  filteredComplaints: GroupedIssue[] = [];
  subAdmins: User[] = [];
  allUsers: User[] = [];
  filteredUsers: User[] = [];
  activeTab: AdminTab = 'Overview';
  userTableFilter: string = 'All';
  isLoading: boolean = false;
  isProvisioning: boolean = false;

  private tabSub: Subscription | null = null;

  selectedComplaint: Complaint | null = null;

  // Advanced User Provisioning
  newUser = { username: '', email: '', password: '', name: '', contact: '', district: '', area: '', department: 'Land' };
  confirmPassword = '';
  formError = '';
  formSuccess = '';



  // Inline User Editing
  editingId: number | null = null;
  editingUser: any = {};
  showDeptDropdown: boolean = false;
  showProvisionDeptDropdown: boolean = false;
  isRefreshing: boolean = false;

  priorityFilter: string = 'All';
  editingComplaint: Complaint | null = null;
  oversightUpdate = { priority: 'Not Set', slaDate: '' };

  // Overview Filters
  overviewAreaFilter: string = '';
  overviewDeptFilter: string = 'All';

  get filteredOverviewIssues(): GroupedIssue[] {
    const list = this.complaints.filter(c => {
      const areaMatch = !this.overviewAreaFilter ||
        (c.location && c.location.toLowerCase().includes(this.overviewAreaFilter.toLowerCase())) ||
        (c.district && c.district.toLowerCase().includes(this.overviewAreaFilter.toLowerCase()));

      const deptMatch = this.overviewDeptFilter === 'All' ||
        (c.category && c.category.toLowerCase().includes(this.overviewDeptFilter.toLowerCase()));

      return areaMatch && deptMatch;
    });
    return this.groupIssues(list);
  }

  groupIssues(complaints: Complaint[]): GroupedIssue[] {
    const groupedMap = new Map<string, GroupedIssue>();
    complaints.forEach(c => {
      const sub = (c.subCategory || 'General').trim();
      const loc = (c.location || 'Unknown').trim();
      const cat = (c.category || 'Unknown').trim();
      const key = `${ cat.toLowerCase() }| ${ sub.toLowerCase() }| ${ loc.toLowerCase() } `;

      if (groupedMap.has(key)) {
        const group = groupedMap.get(key)!;
        group.reportersCount++;
        group.complaintIds.push(c.id);
        // Prioritize "In Progress" or most advanced status
        if (c.status === 'In Progress') group.status = 'In Progress';
        else if (c.status === 'Accepted' && group.status !== 'In Progress') group.status = 'Accepted';

        // Grab assignment info if present
        if (c.assignedEmployees && c.assignedEmployees.length > 0 && (!group.assignedEmployees || group.assignedEmployees.length === 0)) {
          group.assignedEmployees = c.assignedEmployees;
          group.assignedHeadName = c.assignedHeadName;
          group.assignedHeadPhone = c.assignedHeadPhone;
          group.slaTimeline = c.slaTimeline;
        }
        if (c.slaAssigned) group.slaAssigned = true;
      } else {
        groupedMap.set(key, {
          category: cat,
          subCategory: sub,
          location: loc,
          status: c.status,
          reportersCount: 1,
          complaintIds: [c.id],
          description: c.description,
          representative: c,
          assignedEmployees: c.assignedEmployees,
          assignedHeadName: c.assignedHeadName,
          assignedHeadPhone: c.assignedHeadPhone,
          slaTimeline: c.slaTimeline,
          priorityLevel: c.priorityLevel || 'Not Set',
          slaAssigned: c.slaAssigned
        });
      }
    });
    return Array.from(groupedMap.values());
  }

  get recentActivities(): Complaint[] {
    return [...this.complaints]
      .sort((a, b) => new Date(b.raisedDate).getTime() - new Date(a.raisedDate).getTime())
      .slice(0, 3);
  }

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    public adminService: AdminService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    this.tabSub = this.adminService.activeTab$.subscribe(tab => {
      this.activeTab = tab;
      if (['Land', 'Power', 'Water', 'Overview'].includes(tab)) {
        this.loadComplaints();
      } else {
        this.applyFilters();
      }
      if (tab === 'Creation') {
        this.loadAllUsers();
      }
      setTimeout(() => this.initIcons(), 0);
    });
    // loadComplaints is already called by the subscription above for initial 'Overview'
    this.loadAllUsers();
  }

  ngOnDestroy() {
    if (this.tabSub) this.tabSub.unsubscribe();
  }

  ngAfterViewInit() {
    this.initIcons();
  }

  initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  loadComplaints() {
    // Only show full-screen loader if we have NO data yet
    if (this.complaints.length === 0) this.isLoading = true;

    console.log('[ADMIN_DEBUG] Initiating system sync. Silent mode:', this.complaints.length > 0);

    this.http.get<Complaint[]>('https://smart-civic-backend-10052026.onrender.com/api/complaints/all').pipe(
      timeout(8000),
      catchError(err => {
        console.error('[ADMIN_DEBUG] HTTP Error:', err);
        return of([]);
      }),
      finalize(() => {
        this.isLoading = false;
        this.initIcons();
        this.cdr.detectChanges();
        console.log('[ADMIN_DEBUG] Sync finalize block executed.');
      })
    ).subscribe(res => {
      console.log('[ADMIN_DEBUG] Raw Data Received:', res.length, 'items');
      this.complaints = res;
      this.applyFilters();
      this.cdr.detectChanges();
    });
  }

  loadSubAdmins() {
    this.http.get<any[]>('https://smart-civic-backend-10052026.onrender.com/api/admin/subadmins').subscribe(res => {
      this.subAdmins = res.map(u => ({
        ...u,
        roles: u.roles.map((r: any) => typeof r === 'string' ? r : r.name)
      }));
    });
  }

  loadAllUsers() {
    this.http.get<any[]>('https://smart-civic-backend-10052026.onrender.com/api/admin/users').subscribe(res => {
      // Flatten roles to strings to match frontend model
      this.allUsers = res.map(u => ({
        ...u,
        roles: u.roles.map((r: any) => typeof r === 'string' ? r : r.name)
      }));
      this.applyUserTableFilter();
    });
  }

  refreshUsers() {
    this.isRefreshing = true;
    this.loadAllUsers();
    setTimeout(() => { this.isRefreshing = false; }, 800);
  }

  applyUserTableFilter() {
    if (this.userTableFilter === 'All') {
      this.filteredUsers = this.allUsers;
    } else if (this.userTableFilter === 'Citizen') {
      this.filteredUsers = this.allUsers.filter(u => u.roles.includes('ROLE_USER') && !u.roles.includes('ROLE_SUB_ADMIN') && !u.roles.includes('ROLE_ADMIN'));
    } else {
      this.filteredUsers = this.allUsers.filter(u => u.department === this.userTableFilter);
    }
    setTimeout(() => this.initIcons(), 0);
  }

  deleteUser(id: number) {
    if (confirm('Are you sure you want to permanently delete this user?')) {
      this.http.delete(`https://smart-civic-backend-10052026.onrender.com/api/admin/users/${id}`).subscribe({
next: () => {
  this.loadAllUsers();
  this.loadSubAdmins();
},
  error: (err) => alert(err.error?.message || 'Deletion failed')
      });
    }
  }

getFilteredSubAdmins(dept: string): User[] {
  return this.subAdmins.filter(sa => sa.department === dept);
}

applyFilters() {
  console.log('[ADMIN_DEBUG] applyFilters running. Active Tab:', this.activeTab, 'Priority Filter:', this.priorityFilter);
  if (['Land', 'Power', 'Water'].includes(this.activeTab)) {
    const activeTabLower = this.activeTab.toLowerCase().trim();
    const list = this.complaints.filter(c => {
      if (!c.category) return false;

      const catLower = c.category.toLowerCase().trim();
      // Support partial matches (e.g. "Power Oversight" matches "Power")
      const catMatch = catLower === activeTabLower || catLower.includes(activeTabLower) || activeTabLower.includes(catLower);

      const cPriority = c.priorityLevel || 'Not Set';
      const priorityMatch = this.priorityFilter === 'All' || cPriority.toLowerCase() === this.priorityFilter.toLowerCase();

      return catMatch && priorityMatch;
    });
    this.filteredComplaints = this.groupIssues(list);
  } else {
    this.filteredComplaints = [];
  }
  console.log('[ADMIN_DEBUG] Filtered results count:', this.filteredComplaints.length);
}

setPriorityFilter(p: string) {
  this.priorityFilter = p;
  this.applyFilters();
}


getSlaCount(assigned: boolean): number {
  return this.filteredComplaints.filter(c => !!c.slaAssigned === assigned).length;
}

openEditModal(c: Complaint) {
  this.editingComplaint = c;
  this.oversightUpdate = {
    priority: c.priorityLevel || 'Not Set',
    slaDate: c.slaTimeline ? c.slaTimeline.substring(0, 16) : ''
  };
}

saveOversight() {
  if (this.editingComplaint) {
    // Create a clean payload without 'status' to follow the new streamlined workflow
    const payload = {
      priority: this.oversightUpdate.priority,
      slaDate: this.oversightUpdate.slaDate
    };

    this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/admin/complaints/${this.editingComplaint.id}/priority`, payload)
      .subscribe({
        next: () => {
          this.editingComplaint = null;
          this.loadComplaints();
        },
        error: (err) => alert('Oversight update failed')
      });
  }
}

getStatusCount(status: string) {
  return this.complaints.filter(c => c.status === status).length;
}

getCategoryCount(category: string) {
  return this.complaints.filter(c => c.category === category).length;
}

getNotSetCount(): number {
  return this.filteredComplaints.filter(c => !c.priorityLevel || c.priorityLevel === 'Not Set').length;
}


reject(id: number) {
  const reason = prompt('Administrative Rejection Reason:');
  if (reason) {
    this.http.post(`https://smart-civic-backend-10052026.onrender.com/api/complaints/${id}/reject?reason=${reason}`, {})
      .subscribe(() => this.loadComplaints());
  }
}

onCreateUser(event: Event) {
  event.preventDefault();
  this.formError = '';
  this.formSuccess = '';

  // Advanced Validation
  const complexityRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]+$/;
  const phoneRegex = /^[0-9]{10}$/;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!complexityRegex.test(this.newUser.username)) {
    this.formError = 'Username Complexity: Must contain Uppercase, Lowercase, Number & Special Character.';
    return;
  }

  if (this.newUser.password !== this.confirmPassword) {
    this.formError = 'Security Alert: Passwords do not match.';
    return;
  }

  if (this.newUser.password.length < 6 || !complexityRegex.test(this.newUser.password)) {
    this.formError = 'Security Requirement: Password must be 6+ chars with Uppercase, Lowercase, Number & Special Character.';
    return;
  }

  if (!phoneRegex.test(this.newUser.contact)) {
    this.formError = 'Invalid Input: Phone number must be exactly 10 digits.';
    return;
  }

  if (!emailRegex.test(this.newUser.email)) {
    this.formError = 'Invalid Input: Please enter a valid email address.';
    return;
  }

  this.isProvisioning = true;
  const payload = {
    ...this.newUser,
    roles: ['SUB_ADMIN'] // Automated for Administrative Provisioning
  };

  this.http.post('https://smart-civic-backend-10052026.onrender.com/api/admin/users/create', payload)
    .pipe(finalize(() => this.isProvisioning = false))
    .subscribe({
      next: () => {
        this.formSuccess = `System Account for ${this.newUser.name} provisioned successfully in ${this.newUser.department}.`;
        this.newUser = { username: '', email: '', password: '', name: '', contact: '', district: '', area: '', department: 'Land' };
        this.confirmPassword = '';
        this.loadSubAdmins();
        setTimeout(() => this.formSuccess = '', 5000);
      },
      error: (err) => {
        this.formError = err.error?.message || 'Provisioning sequence failed. Check system logs.';
      }
    });
}



startEditing(user: User) {
  this.editingId = user.id;
  this.editingUser = { ...user };
  setTimeout(() => this.initIcons(), 0);
}

cancelEditing() {
  this.editingId = null;
  this.editingUser = {};
  this.showDeptDropdown = false;
  setTimeout(() => this.initIcons(), 0);
}

selectProvisionDepartment(dept: string) {
  this.newUser.department = dept;
  this.showProvisionDeptDropdown = false;
}

selectDepartment(dept: string) {
  this.editingUser.department = dept;
  this.showDeptDropdown = false;
}
saveUser() {
  if (!this.editingId) return;
  this.http.put(`https://smart-civic-backend-10052026.onrender.com/api/admin/users/${this.editingId}`, this.editingUser)
    .subscribe({
      next: () => {
        // Success State
        this.editingId = null;
        this.showDeptDropdown = false;
        this.loadAllUsers();
        this.loadSubAdmins();
      },
      error: (err) => alert(err.error?.message || 'Update failed')
    });
}
logout() {
  this.authService.logout();
  this.router.navigate(['/auth/login']);
}
}

