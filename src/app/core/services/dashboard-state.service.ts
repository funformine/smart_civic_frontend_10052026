import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * DASHBOARD STATE SERVICE
 * Purpose: Caches statistics and summary data to prevent redundant DB hits on every refresh.
 */
@Injectable({
    providedIn: 'root'
})
export class DashboardStateService {
    private summarySource = new BehaviorSubject<any>(null);

    // Observable for components to listen to changes
    summary$ = this.summarySource.asObservable();

    /**
     * Update the cached summary data
     */
    setSummary(summary: any) {
        this.summarySource.next(summary);
    }

    /**
     * Retrieve the current cached summary (sync)
     */
    getSummary() {
        return this.summarySource.value;
    }
}
