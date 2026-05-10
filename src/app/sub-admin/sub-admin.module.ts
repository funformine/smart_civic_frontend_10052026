import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { SubAdminDashboardComponent } from './components/subadmin-dashboard.component';

const routes: Routes = [
    { path: 'dashboard', component: SubAdminDashboardComponent },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
    declarations: [
        SubAdminDashboardComponent
    ],
    imports: [
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(routes)
    ]
})
export class SubAdminModule { }
