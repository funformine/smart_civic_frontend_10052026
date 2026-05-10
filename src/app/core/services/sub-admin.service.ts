import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SubAdminTab = 'Issues' | 'Employees' | 'Assignment' | 'Resolution' | 'Profile' | any;

@Injectable({
    providedIn: 'root'
})
export class SubAdminService {
    private activeTabSubject = new BehaviorSubject<SubAdminTab>('Issues');
    public activeTab$ = this.activeTabSubject.asObservable();

    get currentTab(): SubAdminTab {
        return this.activeTabSubject.value;
    }

    setTab(tab: SubAdminTab) {
        this.activeTabSubject.next(tab);
    }
}
