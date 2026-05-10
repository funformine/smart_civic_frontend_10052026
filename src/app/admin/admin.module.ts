import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { AdminDashboardComponent } from './components/admin-dashboard.component';

const routes: Routes = [
    { path: 'dashboard', component: AdminDashboardComponent },
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
];

@NgModule({
    declarations: [],
    imports: [
        AdminDashboardComponent,
        CommonModule,
        ReactiveFormsModule,
        FormsModule,
        RouterModule.forChild(routes)
    ]
})
export class AdminModule { }
