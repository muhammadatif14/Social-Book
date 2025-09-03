import { Routes } from '@angular/router';
import { AuthComponent } from './auth/auth';
import { Home } from './home/home';  // Make sure this exists or create it
import { AuthGuard } from './core/auth.guard';
import { Chat } from './pages/chat/chat';
import { Profile } from './pages/profile/profile';
import { LoginComponent } from './auth/login/login';
import { SignupComponent } from './auth/signup/signup';
import { AiAssistantComponent } from './ai-assistant/ai-assistant.component';
import { ProductDetail } from './pages/product-detail/product-detail';
import { Checkout } from './pages/checkout/checkout';
import { MyAssistantComponent } from './my-assistant/my-assistant.component';


export const routes: Routes = [
  { path: 'signup', 
    component: SignupComponent },
  { path: 'login', 
    component: LoginComponent },
  { path: 'auth', 
    component: AuthComponent },
  { path: 'home', 
    component: Home, canActivate: [AuthGuard] },
  { path: '', redirectTo: 'signup', pathMatch: 'full' },
  {
    path: 'chat',
    component: Chat, canActivate: [AuthGuard]
  },
  {
    path: 'profile',
    component: Profile, canActivate: [AuthGuard]
  },
  {
    path: 'ai-assistant',
    component: AiAssistantComponent, canActivate: [AuthGuard]
  },
  {
    path: 'product/:id',
    component: ProductDetail, canActivate: [AuthGuard]
  },
  {
    path: 'checkout',
    component: Checkout, canActivate: [AuthGuard]
  },
  {
    path: 'my-assistant',
    component: MyAssistantComponent, canActivate: [AuthGuard]
  }
];

