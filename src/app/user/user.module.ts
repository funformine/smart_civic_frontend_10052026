import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { UserDashboardComponent } from './components/dashboard.component';
import { RaiseComplaintComponent } from './components/raise-complaint.component';
import { TrackStatusComponent } from './components/track-status.component';
import { ProfileComponent } from './components/profile.component';

const routes: Routes = [
    { path: 'dashboard', component: UserDashboardComponent },
    { path: 'raise', component: RaiseComplaintComponent },
    { path: 'track', component: TrackStatusComponent },
    { path: 'profile', component: ProfileComponent },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
    declarations: [
        UserDashboardComponent,
        RaiseComplaintComponent,
        TrackStatusComponent,
        ProfileComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(routes)
    ]
})
export class UserModule { }
