import { Routes } from '@angular/router';

import { AiAssistantPageComponent } from '../pages/ai-assistant-page.component';

const views = ['command', 'history', 'review', 'feedback', 'summaries', 'configuration', 'knowledge', 'kyc', 'lookups'];

export const AI_ASSISTANT_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'command' },
  ...views.map((path) => ({ path, component: AiAssistantPageComponent })),
];