import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './auth/components/login.component';
import { RegisterComponent } from './auth/components/register.component';
import { HomeComponent } from './public/components/home.component';
import { AboutComponent } from './public/components/about.component';
import { ContactComponent } from './public/components/contact.component';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
    { path: 'home', component: HomeComponent },
    { path: 'about', component: AboutComponent },
    { path: 'contact', component: ContactComponent },
    { path: 'auth/login', component: LoginComponent },
    { path: 'auth/register', component: RegisterComponent },
    {
        path: 'user',
        loadChildren: () => import('./user/user.module').then(m => m.UserModule),
        canActivate: [AuthGuard],
        data: { roles: ['ROLE_USER', 'ROLE_ADMIN', 'ROLE_SUB_ADMIN'] }
    },
    {
        path: 'admin',
        loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
        canActivate: [AuthGuard],
        data: { roles: ['ROLE_ADMIN'] }
    },
    {
        path: 'subadmin',
        loadChildren: () => import('./sub-admin/sub-admin.module').then(m => m.SubAdminModule),
        canActivate: [AuthGuard],
        data: { roles: ['ROLE_SUB_ADMIN'] }
    },
    { path: '', redirectTo: 'home', pathMatch: 'full' }
];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule { }
