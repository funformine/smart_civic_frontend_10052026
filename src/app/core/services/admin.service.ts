import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AdminTab = 'Overview' | 'Land' | 'Power' | 'Water' | 'Creation';

@Injectable({
    providedIn: 'root'
})
export class AdminService {
    private activeTabSubject = new BehaviorSubject<AdminTab>('Overview');
    activeTab$ = this.activeTabSubject.asObservable();

    setTab(tab: AdminTab) {
        this.activeTabSubject.next(tab);
    }

    get currentTab(): AdminTab {
        return this.activeTabSubject.value;
    }
}
