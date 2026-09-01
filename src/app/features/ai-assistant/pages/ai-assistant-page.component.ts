import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { LucideAlertTriangle, LucideArrowLeft, LucideBot, LucideCheck, LucideChevronRight, LucideFileText, LucideHistory, LucideLoaderCircle, LucideMessageSquare, LucidePlus, LucideSend, LucideShieldCheck, LucideSlidersHorizontal, LucideSparkles, LucideUpload, LucideUserRound, LucideX } from '@lucide/angular';
import { AiAssistantApiService, ClaimRecommendation, Configuration, ConfigurationRequest, Feedback, FeedbackRequest, FraudAssessment, Lookup, PromptHistory, Summary, SummaryRequest } from '../services/ai-assistant-api.service';
import { AuthService } from '../../identity/services/auth.service';

type View = 'command' | 'history' | 'review' | 'feedback' | 'summaries' | 'configuration' | 'knowledge' | 'kyc' | 'lookups';
interface ConversationMessage { id: string; role: 'assistant' | 'user'; content: string; sources?: string[]; }
interface LookupGroup { label: string; items: Lookup[]; }
interface ChatSession { id: string; title: string; updatedAt: string; }
interface AssistantProfile {
  role: string;
  intro: string;
  placeholder: string;
  starterPrompts: string[];
  views: readonly View[];
}

@Component({
  selector: 'app-ai-assistant-page',
  imports: [FormsModule, LucideAlertTriangle, LucideArrowLeft, LucideBot, LucideCheck, LucideChevronRight, LucideFileText, LucideHistory, LucideLoaderCircle, LucideMessageSquare, LucidePlus, LucideSend, LucideShieldCheck, LucideSlidersHorizontal, LucideSparkles, LucideUpload, LucideUserRound, LucideX],
  templateUrl: './ai-assistant-page.component.html',
  styleUrl: './ai-assistant-page.component.scss',
})
export class AiAssistantPageComponent {
  private readonly api = inject(AiAssistantApiService);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly storageKey = 'ai-assistant-service-token';
  private readonly sessionsStorageKey = 'ai-assistant-chat-sessions';
  protected readonly activeView = signal<View>('command');
  protected readonly showConnection = signal(false);
  protected readonly showRequestOptions = signal(false);
  protected readonly connectionNote = signal('');
  // isConnected: true when the user has a portal session (no separate AI token needed)
  protected readonly isConnected = computed(() =>
    this.authService.isAuthenticated() || Boolean(localStorage.getItem(this.storageKey))
  );
  protected readonly isSending = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly promptTypes = signal<Lookup[]>([]);
  protected readonly sessionId = signal<string>(crypto.randomUUID());
  protected readonly history = signal<PromptHistory[]>([]);
  protected readonly historyLoading = signal(false);
  protected readonly chatSessions = signal<ChatSession[]>(this.getStoredSessions());
  protected readonly selectedHistorySessionId = signal<string | null>(null);
  protected readonly reviewLoading = signal(false);
  protected readonly reviewSearched = signal(false);
  protected readonly recommendations = signal<ClaimRecommendation[]>([]);
  protected readonly assessments = signal<FraudAssessment[]>([]);
  protected readonly knowledgeLoading = signal(false);
  protected readonly knowledgeResult = signal('');
  protected readonly feedbackItems = signal<Feedback[]>([]);
  protected readonly feedbackCategories = signal<Lookup[]>([]);
  protected readonly summaries = signal<Summary[]>([]);
  protected readonly summaryTypes = signal<Lookup[]>([]);
  protected readonly configurations = signal<Configuration[]>([]);
  protected readonly lookupGroups = signal<LookupGroup[]>([]);
  protected readonly operationLoading = signal(false);
  protected readonly operationMessage = signal('');
  protected readonly currentRoles = signal<string[]>(this.authService.getSession()?.roles ?? this.getRolesFromToken(localStorage.getItem(this.storageKey)));
  protected readonly roleProfile = computed(() => this.getRoleProfile(this.currentRoles()));
  protected readonly availableViews = computed(() => this.roleProfile().views);
  protected readonly messages = signal<ConversationMessage[]>([{ id: 'welcome', role: 'assistant', content: this.getRoleProfile(this.currentRoles()).intro }]);
  protected readonly viewTitle = computed(() => ({ command: 'AI Assistant', history: 'Chat history', review: 'Claim review', feedback: 'Response feedback', summaries: 'Summaries', configuration: 'Model configuration', knowledge: 'Knowledge base', kyc: 'KYC guidance', lookups: 'Reference data' })[this.activeView()]);
  protected readonly roleLabel = computed(() => this.currentRoles().length ? this.currentRoles().join(', ') : 'Role verified by service');
  protected draft = '';
  protected tokenInput = localStorage.getItem(this.storageKey) ?? '';
  protected promptTypeId = 0;
  protected referenceType = '';
  protected referenceId = '';
  protected temperature = 0.3;
  protected claimId = '';
  protected knowledgeSource = '';
  protected knowledgeDomain = 'ClaimsProcedures';
  protected knowledgeRoles = 'Administrator';
  protected knowledgeContent = '';
  protected kycDocumentName = '';
  protected kycDocumentMessage = '';
  protected feedbackPromptHistoryId = '';
  protected feedbackRating = 5;
  protected feedbackText = '';
  protected feedbackCategoryId: number | undefined;
  protected summaryReferenceType = 'Claim';
  protected summaryReferenceId = '';
  protected summaryTypeId: number | undefined;
  protected summaryText = '';
  protected summaryModelName = '';
  protected summaryVersionLabel = '';
  protected editingConfigurationId: number | null = null;
  protected configurationForm: ConfigurationRequest = this.newConfigurationForm();

  constructor() {
    // loadPromptTypes is deferred — the server uses its default when promptTypeId is 0
    this.activeView.set(this.viewFromUrl(this.router.url));
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.onRouteChanged(this.viewFromUrl(event.urlAfterRedirects));
    });
  }
  protected selectView(view: View): void { if (this.canAccessView(view)) void this.router.navigate(['/ai-assistant', view]); }
  protected goToAdminDashboard(): void { void this.router.navigate(['/dashboard']); }
  protected canAccessView(view: View): boolean { return this.availableViews().includes(view); }
  protected useStarterPrompt(prompt: string): void { this.draft = prompt; }
  protected connect(): void { const token = this.tokenInput.trim(); if (!token) return; localStorage.setItem(this.storageKey, token); this.currentRoles.set(this.getRolesFromToken(token)); this.showConnection.set(false); this.connectionNote.set(''); this.errorMessage.set(''); this.promptTypes.set([]); this.loadPromptTypes(); this.resetConversation(); }
  protected disconnect(): void { localStorage.removeItem(this.storageKey); this.tokenInput = ''; const session = this.authService.getSession(); this.currentRoles.set(session?.roles ?? []); this.showConnection.set(false); }
  protected newSession(): void { this.sessionId.set(crypto.randomUUID()); this.history.set([]); this.showRequestOptions.set(false); this.resetConversation(); }
  protected sendMessage(): void {
    const content = this.draft.trim();
    if (!content || this.isSending()) return;
    if (!this.isConnected()) { this.errorMessage.set('Sign in to the portal before using the AI assistant.'); return; }
    const currentMessages = [...this.messages(), { id: crypto.randomUUID(), role: 'user' as const, content }];
    this.messages.set(currentMessages); this.draft = ''; this.isSending.set(true); this.errorMessage.set('');
    this.api.sendChat({ sessionId: this.sessionId(), referenceType: this.referenceType || undefined, referenceId: this.referenceId ? Number(this.referenceId) : undefined, promptTypeId: this.promptTypeId, messages: currentMessages.map(({ role, content: messageContent }) => ({ role, content: messageContent })), temperature: Number(this.temperature) }).subscribe({
      next: (response) => { if (response.sessionId) this.sessionId.set(response.sessionId); this.rememberSession(content); this.messages.update((messages) => [...messages, { id: crypto.randomUUID(), role: 'assistant', content: response.responseText, sources: response.sources }]); this.isSending.set(false); },
      error: (error) => this.handleError(error, 'The AI service could not complete this request.'),
    });
  }
  protected loadHistory(sessionId = this.selectedHistorySessionId() ?? this.sessionId()): void { if (!this.isConnected()) return; this.selectedHistorySessionId.set(sessionId); this.historyLoading.set(true); this.api.getSessionHistory(sessionId).subscribe({ next: (history) => { this.history.set(history); this.historyLoading.set(false); }, error: (error) => { this.historyLoading.set(false); this.handleError(error, 'Session history is unavailable.'); } }); }
  protected selectHistorySession(sessionId: string): void { this.loadHistory(sessionId); }
  protected loadClaimReview(): void {
    const claimId = Number(this.claimId); if (!claimId || !this.isConnected()) return;
    this.reviewLoading.set(true); this.reviewSearched.set(true); this.errorMessage.set(''); let recommendationsReady = false; let assessmentsReady = false; const finish = () => { if (recommendationsReady && assessmentsReady) this.reviewLoading.set(false); };
    this.api.getClaimRecommendations(claimId).subscribe({ next: (items) => { this.recommendations.set(items); recommendationsReady = true; finish(); }, error: (error) => { recommendationsReady = true; this.handleError(error, 'Claim recommendations are unavailable.'); finish(); } });
    this.api.getFraudAssessments(claimId).subscribe({ next: (items) => { this.assessments.set(items); assessmentsReady = true; finish(); }, error: (error) => { assessmentsReady = true; this.handleError(error, 'Fraud assessments are unavailable.'); finish(); } });
  }
  protected indexKnowledge(): void { if (!this.isConnected() || this.knowledgeLoading()) return; this.knowledgeLoading.set(true); this.knowledgeResult.set(''); this.api.indexKnowledgeDocument({ source: this.knowledgeSource, domain: this.knowledgeDomain, allowedRoles: this.knowledgeRoles.split(',').map((role) => role.trim()).filter(Boolean), content: this.knowledgeContent }).subscribe({ next: (response) => { this.knowledgeResult.set(`${response.chunksIndexed} chunks indexed from ${response.source}.`); this.knowledgeLoading.set(false); }, error: (error) => { this.knowledgeLoading.set(false); this.handleError(error, 'The knowledge document could not be indexed.'); } }); }
  protected selectKycGuidanceDocument(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 100000) {
      this.kycDocumentMessage = 'Use an approved .txt or .md guidance document no larger than 100 KB.';
      input.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.kycDocumentName = file.name;
      this.knowledgeSource = `KYC guidance - ${file.name}`;
      this.knowledgeDomain = 'SupportFaqs';
      this.knowledgeContent = String(reader.result ?? '');
      this.kycDocumentMessage = 'Guidance loaded. An administrator can now index it for role-filtered retrieval.';
    };
    reader.readAsText(file);
  }
  protected loadFeedback(): void { const promptHistoryId = Number(this.feedbackPromptHistoryId); if (!promptHistoryId || !this.isConnected()) return; this.operationLoading.set(true); this.api.getFeedbackByPromptHistory(promptHistoryId).subscribe({ next: (items) => { this.feedbackItems.set(items); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Feedback could not be loaded.'); } }); }
  protected submitFeedback(): void {
    const promptHistoryId = Number(this.feedbackPromptHistoryId); if (!promptHistoryId || !this.isConnected()) return;
    const request: FeedbackRequest = { promptHistoryId, rating: Number(this.feedbackRating), feedbackText: this.feedbackText || undefined, feedbackCategoryId: this.feedbackCategoryId, submittedAt: new Date().toISOString() };
    this.operationLoading.set(true); this.api.createFeedback(request).subscribe({ next: (feedback) => { this.feedbackItems.update((items) => [feedback, ...items]); this.feedbackText = ''; this.operationMessage.set('Feedback submitted.'); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Feedback could not be submitted.'); } });
  }
  protected deleteFeedback(id: number): void { this.api.deleteFeedback(id).subscribe({ next: () => this.feedbackItems.update((items) => items.filter((item) => item.aiFeedbackId !== id)), error: (error) => this.handleError(error, 'Feedback could not be deleted.') }); }
  protected loadSummaries(): void { const referenceId = Number(this.summaryReferenceId); if (!referenceId || !this.isConnected()) return; this.operationLoading.set(true); this.api.getSummariesByReference(this.summaryReferenceType, referenceId).subscribe({ next: (items) => { this.summaries.set(items); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Summaries could not be loaded.'); } }); }
  protected createSummary(): void {
    const referenceId = Number(this.summaryReferenceId); if (!referenceId || !this.summaryTypeId || !this.summaryText || !this.summaryModelName || !this.isConnected()) return;
    const request: SummaryRequest = { referenceType: this.summaryReferenceType, referenceId, summaryTypeId: this.summaryTypeId, summaryText: this.summaryText, modelName: this.summaryModelName, generatedAt: new Date().toISOString(), versionLabel: this.summaryVersionLabel || undefined, isLatest: true };
    this.operationLoading.set(true); this.api.createSummary(request).subscribe({ next: (summary) => { this.summaries.update((items) => [summary, ...items]); this.summaryText = ''; this.operationMessage.set('Summary saved.'); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Summary could not be saved.'); } });
  }
  protected deleteSummary(id: number): void { this.api.deleteSummary(id).subscribe({ next: () => this.summaries.update((items) => items.filter((item) => item.aiSummaryId !== id)), error: (error) => this.handleError(error, 'Summary could not be deleted.') }); }
  protected loadConfigurations(): void { if (!this.isConnected()) return; this.operationLoading.set(true); this.api.getConfigurations().subscribe({ next: (items) => { this.configurations.set(items); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Configurations could not be loaded.'); } }); }
  protected editConfiguration(configuration: Configuration): void { this.editingConfigurationId = configuration.aiConfigurationId; this.configurationForm = { configName: configuration.configName, providerName: configuration.providerName, modelName: configuration.modelName, temperature: configuration.temperature, maxTokens: configuration.maxTokens, topP: configuration.topP, frequencyPenalty: configuration.frequencyPenalty, presencePenalty: configuration.presencePenalty, timeoutMs: configuration.timeoutMs, isActive: configuration.isActive, effectiveFrom: configuration.effectiveFrom, effectiveTo: configuration.effectiveTo }; }
  protected saveConfiguration(): void {
    if (!this.isConnected()) return; this.operationLoading.set(true);
    const request = this.editingConfigurationId ? this.api.updateConfiguration(this.editingConfigurationId, this.configurationForm) : this.api.createConfiguration(this.configurationForm);
    request.subscribe({ next: (configuration) => { this.configurations.update((items) => this.editingConfigurationId ? items.map((item) => item.aiConfigurationId === configuration.aiConfigurationId ? configuration : item) : [configuration, ...items]); this.cancelConfigurationEdit(); this.operationMessage.set('Model configuration saved.'); this.operationLoading.set(false); }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Configuration could not be saved.'); } });
  }
  protected cancelConfigurationEdit(): void { this.editingConfigurationId = null; this.configurationForm = this.newConfigurationForm(); }
  protected deleteConfiguration(id: number): void { this.api.deleteConfiguration(id).subscribe({ next: () => this.configurations.update((items) => items.filter((item) => item.aiConfigurationId !== id)), error: (error) => this.handleError(error, 'Configuration could not be deleted.') }); }
  protected formatDate(value: string): string { return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  private loadPromptTypes(): void {
    if (!this.isConnected()) return;
    // silently fail — prompt types only populate a dropdown; 401 = JWT config not yet matched on Render
    this.api.getPromptTypes().subscribe({
      next: (types) => { this.promptTypes.set(types.filter((type) => type.isActive)); if (!this.promptTypeId && types[0]) this.promptTypeId = types[0].id; },
      error: () => {}
    });
  }
  private onRouteChanged(view: View): void { if (!this.canAccessView(view)) { void this.router.navigate(['/ai-assistant', 'command']); return; } this.activeView.set(view); this.operationMessage.set(''); if (view === 'command' && !this.promptTypes().length) this.loadPromptTypes(); if (view === 'history') this.loadHistory(); if (view === 'feedback') this.loadFeedbackCategories(); if (view === 'summaries') this.loadSummaryTypes(); if (view === 'configuration') this.loadConfigurations(); if (view === 'lookups') this.loadLookupCatalog(); }
  private rememberSession(title: string): void {
    const session = { id: this.sessionId(), title: title.slice(0, 80), updatedAt: new Date().toISOString() };
    const sessions = [session, ...this.chatSessions().filter((item) => item.id !== session.id)];
    this.chatSessions.set(sessions);
    localStorage.setItem(this.sessionsStorageKey, JSON.stringify(sessions));
  }
  private getStoredSessions(): ChatSession[] {
    try {
      const sessions = JSON.parse(localStorage.getItem(this.sessionsStorageKey) ?? '[]') as ChatSession[];
      return sessions.filter((item) => item.id && item.title && item.updatedAt);
    } catch { return []; }
  }
  private loadFeedbackCategories(): void { if (!this.isConnected() || this.feedbackCategories().length) return; this.api.getFeedbackCategories().subscribe({ next: (items) => { this.feedbackCategories.set(items.filter((item) => item.isActive)); this.feedbackCategoryId = this.feedbackCategoryId ?? items[0]?.id; }, error: (error) => this.handleError(error, 'Feedback categories could not be loaded.') }); }
  private loadSummaryTypes(): void { if (!this.isConnected() || this.summaryTypes().length) return; this.api.getSummaryTypes().subscribe({ next: (items) => { this.summaryTypes.set(items.filter((item) => item.isActive)); this.summaryTypeId = this.summaryTypeId ?? items[0]?.id; }, error: (error) => this.handleError(error, 'Summary types could not be loaded.') }); }
  protected loadLookupCatalog(): void { if (!this.isConnected()) return; this.operationLoading.set(true); const groups: LookupGroup[] = []; const load = (label: string, request: ReturnType<AiAssistantApiService['getPromptTypes']>) => request.subscribe({ next: (items) => { groups.push({ label, items }); if (groups.length === 8) { this.lookupGroups.set(groups); this.operationLoading.set(false); } }, error: (error) => { this.operationLoading.set(false); this.handleError(error, 'Reference data could not be loaded.'); } }); load('Prompt types', this.api.getPromptTypes()); load('Safety statuses', this.api.getSafetyStatuses()); load('Recommendation types', this.api.getRecommendationTypes()); load('Review statuses', this.api.getReviewStatuses()); load('Risk levels', this.api.getRiskLevels()); load('Recommended actions', this.api.getRecommendedActions()); load('Summary types', this.api.getSummaryTypes()); load('Feedback categories', this.api.getFeedbackCategories()); }
  private newConfigurationForm(): ConfigurationRequest { return { configName: '', providerName: '', modelName: '', temperature: 0.3, maxTokens: 2048, isActive: true, effectiveFrom: new Date().toISOString().slice(0, 16) }; }
  private viewFromUrl(url: string): View { const view = url.split('?')[0].split('/').filter(Boolean).at(-1); return view && ['command', 'history', 'review', 'feedback', 'summaries', 'configuration', 'knowledge', 'kyc', 'lookups'].includes(view) ? view as View : 'command'; }
  private getRolesFromToken(token: string | null): string[] {
    if (!token) return [];
    try {
      const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      const roleValues = [payload.role, payload.roles, payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']].flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
      return [...new Set(roleValues.map(String))];
    } catch { return []; }
  }
  private resetConversation(): void {
    this.messages.set([{ id: 'welcome', role: 'assistant', content: this.roleProfile().intro }]);
  }
  private getRoleProfile(roles: string[]): AssistantProfile {
    const profiles: Record<string, AssistantProfile> = {
      Customer: { role: 'Customer', intro: 'I am your insurance help agent. I can explain KYC, your policy coverage, premium payments, and how to submit or track a claim.', placeholder: 'Ask about KYC, your policy, premiums, or how to submit a claim...', starterPrompts: ['What is KYC and why do I need it?', 'How do I submit an insurance claim?', 'What documents do I need for KYC?'], views: ['command', 'history', 'feedback'] },
      KycReviewer: { role: 'KycReviewer', intro: 'I can support your KYC review work with document-checking guidance, verification checklists, and clear next steps for incomplete submissions.', placeholder: 'Ask about KYC verification or an incomplete document...', starterPrompts: ['What checks are required before approving KYC?', 'How should I handle incomplete KYC documents?', 'What is needed for address proof verification?'], views: ['command', 'history', 'feedback'] },
      PolicyUnderwriter: { role: 'PolicyUnderwriter', intro: 'I can help with underwriting context, AI policy recommendations, coverage summaries, and risk-focused review questions.', placeholder: 'Ask about coverage, policy terms, or underwriting risk...', starterPrompts: ['What factors should I review before underwriting a policy?', 'Summarize the key coverage and exclusion checks.', 'What customer information is needed for risk assessment?'], views: ['command', 'history', 'feedback'] },
      ClaimsAdjuster: { role: 'ClaimsAdjuster', intro: 'I can provide AI claim summaries, fraud warnings, confidence scores, and conservative settlement recommendations to support your claim decisions.', placeholder: 'Ask about claim evidence and settlement...', starterPrompts: ['What documents should I verify for this claim?', 'Summarize the claim facts and next assessment steps.', 'What fraud indicators should I check before settlement?'], views: ['command', 'history', 'feedback'] },
      PaymentOperations: { role: 'PaymentOperations', intro: 'I can help explain premium collection, payment status, settlement transactions, and refund workflows.', placeholder: 'Ask about a payment, premium schedule, refund, or settlement...', starterPrompts: ['How should I investigate a failed premium payment?', 'What should a payment reconciliation include?', 'What checks are needed before processing a refund?'], views: ['command', 'history', 'feedback'] },
      SupportAgent: { role: 'SupportAgent', intro: 'I can help you prepare clear customer responses about KYC, policies, claims, premium payments, and claim status.', placeholder: 'Ask how to explain a policy, claim, KYC, or payment process to a customer...', starterPrompts: ['Explain the claim submission process for a customer.', 'How do I explain KYC requirements clearly?', 'Summarize a policy status in customer-friendly language.'], views: ['command', 'history', 'feedback'] },
      ComplianceOfficer: { role: 'ComplianceOfficer', intro: 'I can support audit preparation, KYC control review, regulatory reporting context, AI fraud warnings, and compliance exception analysis.', placeholder: 'Ask about an audit control, KYC evidence, or compliance exception...', starterPrompts: ['What evidence should be retained for a KYC audit?', 'How should I review a compliance exception?', 'What fraud signals should be considered before settlement?'], views: ['command', 'history', 'feedback'] },
      PlatformAdmin: { role: 'PlatformAdmin', intro: 'I can assist with platform-wide insurance operations, knowledge management, and service insights.', placeholder: 'Ask about platform operations, knowledge governance, or an insurance workflow...', starterPrompts: ['Explain the end-to-end insurance claim process.', 'What knowledge should be indexed for KYC reviewers?', 'How should fraud-review guidance be governed?'], views: ['command', 'history', 'feedback', 'knowledge', 'kyc', 'lookups'] }
    };
    const roleOrder = ['PlatformAdmin', 'ComplianceOfficer', 'ClaimsAdjuster', 'PolicyUnderwriter', 'KycReviewer', 'PaymentOperations', 'SupportAgent', 'Customer'];
    return profiles[roleOrder.find((role) => roles.includes(role)) ?? 'Customer'];
  }
  private handleError(error: { status?: number; error?: { detail?: string; title?: string }; message?: string }, fallback: string): void {
    this.isSending.set(false);
    if (error.status === 401) {
      // 401 means the AI service JWT config on Render doesn't yet match the Identity Service
      this.errorMessage.set('The AI service returned 401 Unauthorized. Ask your administrator to verify that Jwt__Issuer, Jwt__Audience, and Jwt__SigningKey on the AI service Render deployment match the Identity Service configuration.');
      return;
    }
    this.errorMessage.set(error.error?.detail || error.error?.title || error.message || fallback);
  }

  private handleUnauthorized(): void {
    this.errorMessage.set('The AI service returned 401 Unauthorized. Ask your administrator to verify the AI service JWT environment variables on Render.');
  }
}