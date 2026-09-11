import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { aiAssistantAuthInterceptor } from './features/ai-assistant/services/ai-assistant-auth.interceptor';
import { authInterceptor as portalAuthInterceptor } from './features/identity/interceptors/auth.interceptor';
import { authInterceptor as reportingAuthInterceptor } from './features/reporting/core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(withInterceptors([
      portalAuthInterceptor,
      aiAssistantAuthInterceptor,
      reportingAuthInterceptor,
    ])),
    provideRouter(routes)
  ]
};
