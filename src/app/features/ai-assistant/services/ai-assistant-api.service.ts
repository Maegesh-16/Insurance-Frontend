import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export interface Lookup {
  id: number;
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
}

export interface ChatRequest {
  sessionId: string;
  referenceType?: string;
  referenceId?: number;
  promptTypeId: number;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  promptHistoryId: number;
  sessionId?: string;
  modelName: string;
  providerName: string;
  responseText: string;
  sources: string[];
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  safetyStatusId: number;
  errorMessage?: string;
  requestedAt: string;
  respondedAt?: string;
}

export interface PromptHistory {
  promptHistoryId: number;
  sessionId?: string;
  referenceType?: string;
  referenceId?: number;
  promptText: string;
  responseText?: string;
  modelName: string;
  providerName: string;
  responseTimeMs?: number;
  requestedAt: string;
}

export interface ClaimRecommendation {
  claimRecommendationId: number;
  recommendationText: string;
  confidenceScore: number;
  reasoningSummary?: string;
  reviewStatusId: number;
  finalDecision?: string;
}

export interface FraudAssessment {
  fraudAssessmentId: number;
  claimId: number;
  promptHistoryId?: number;
  riskScore: number;
  assessmentSummary: string;
  riskLevelId: number;
  recommendedActionId: number;
  modelName: string;
  reviewOutcome?: string;
  reviewRemarks?: string;
}

export interface KnowledgeDocumentRequest {
  source: string;
  domain: string;
  allowedRoles: string[];
  content: string;
}

export interface FeedbackRequest {
  promptHistoryId?: number;
  referenceType?: string;
  referenceId?: number;
  rating: number;
  feedbackText?: string;
  feedbackCategoryId?: number;
  submittedAt: string;
}

export interface Feedback {
  aiFeedbackId: number;
  promptHistoryId?: number;
  referenceType?: string;
  referenceId?: number;
  userId: number;
  rating: number;
  feedbackText?: string;
  feedbackCategoryId?: number;
  submittedAt: string;
}

export interface SummaryRequest {
  referenceType: string;
  referenceId: number;
  summaryTypeId: number;
  summaryText: string;
  modelName: string;
  generatedAt: string;
  generatedByUserId?: number;
  versionLabel?: string;
  isLatest: boolean;
}

export interface Summary {
  aiSummaryId: number;
  referenceType: string;
  referenceId: number;
  summaryTypeId: number;
  summaryText: string;
  modelName: string;
  generatedAt: string;
  generatedByUserId?: number;
  versionLabel?: string;
  isLatest: boolean;
}

export interface ConfigurationRequest {
  configName: string;
  providerName: string;
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  timeoutMs?: number;
  isActive: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
}

export interface Configuration extends ConfigurationRequest {
  aiConfigurationId: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ClaimRecommendationRequest {
  claimId: number;
  promptHistoryId?: number;
  recommendationTypeId: number;
  recommendationText: string;
  confidenceScore: number;
  reasoningSummary?: string;
  modelName: string;
  generatedAt: string;
  reviewedByUserId?: number;
  reviewStatusId: number;
  finalDecision?: string;
  finalDecisionAt?: string;
}

export interface FraudAssessmentRequest {
  claimId: number;
  promptHistoryId?: number;
  riskScore: number;
  riskLevelId: number;
  assessmentSummary: string;
  indicatorsJson?: object;
  recommendedActionId: number;
  modelName: string;
  generatedAt: string;
  reviewedByUserId?: number;
  reviewOutcome?: string;
  reviewRemarks?: string;
}

export interface PromptHistoryRequest {
  sessionId?: string;
  referenceType?: string;
  referenceId?: number;
  promptTypeId: number;
  promptText: string;
  responseText?: string;
  modelName: string;
  providerName: string;
  temperature?: number;
  maxTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  responseTimeMs?: number;
  safetyStatusId: number;
  errorMessage?: string;
  requestedAt: string;
}

@Injectable({ providedIn: 'root' })
export class AiAssistantApiService {
  private readonly http = inject(HttpClient);
  private readonly api = '/ai-assistant-api/api';

  getPromptTypes() { return this.getLookups('prompt-types'); }
  getSafetyStatuses() { return this.getLookups('safety-statuses'); }
  getRecommendationTypes() { return this.getLookups('recommendation-types'); }
  getReviewStatuses() { return this.getLookups('review-statuses'); }
  getRiskLevels() { return this.getLookups('risk-levels'); }
  getRecommendedActions() { return this.getLookups('recommended-actions'); }
  getSummaryTypes() { return this.getLookups('summary-types'); }
  getFeedbackCategories() { return this.getLookups('feedback-categories'); }

  sendChat(request: ChatRequest) { return this.http.post<ChatResponse>(`${this.api}/ai-chat/send`, request); }

  getPromptHistory(id: number) { return this.http.get<PromptHistory>(`${this.api}/prompt-history/${id}`); }
  getSessionHistory(sessionId: string) { return this.http.get<PromptHistory[]>(`${this.api}/prompt-history/session/${encodeURIComponent(sessionId)}`); }
  getPromptHistoryByReference(referenceType: string, referenceId: number) { return this.http.get<PromptHistory[]>(`${this.api}/prompt-history/reference`, { params: this.referenceParams(referenceType, referenceId) }); }
  getRecentPromptHistory(userId: number, take = 20) { return this.http.get<PromptHistory[]>(`${this.api}/prompt-history/user/${userId}`, { params: new HttpParams().set('take', take) }); }
  createPromptHistory(request: PromptHistoryRequest) { return this.http.post<PromptHistory>(`${this.api}/prompt-history`, request); }
  deletePromptHistory(id: number) { return this.http.delete<void>(`${this.api}/prompt-history/${id}`); }

  getFeedback(id: number) { return this.http.get<Feedback>(`${this.api}/ai-feedback/${id}`); }
  getFeedbackByPromptHistory(promptHistoryId: number) { return this.http.get<Feedback[]>(`${this.api}/ai-feedback/prompt-history/${promptHistoryId}`); }
  getFeedbackByReference(referenceType: string, referenceId: number) { return this.http.get<Feedback[]>(`${this.api}/ai-feedback/reference`, { params: this.referenceParams(referenceType, referenceId) }); }
  createFeedback(request: FeedbackRequest) { return this.http.post<Feedback>(`${this.api}/ai-feedback`, request); }
  deleteFeedback(id: number) { return this.http.delete<void>(`${this.api}/ai-feedback/${id}`); }

  getSummary(id: number) { return this.http.get<Summary>(`${this.api}/ai-summaries/${id}`); }
  getSummariesByReference(referenceType: string, referenceId: number) { return this.http.get<Summary[]>(`${this.api}/ai-summaries/reference`, { params: this.referenceParams(referenceType, referenceId) }); }
  getLatestSummary(referenceType: string, referenceId: number, summaryTypeId: number) { return this.http.get<Summary>(`${this.api}/ai-summaries/latest`, { params: this.referenceParams(referenceType, referenceId).set('summaryTypeId', summaryTypeId) }); }
  createSummary(request: SummaryRequest) { return this.http.post<Summary>(`${this.api}/ai-summaries`, request); }
  deleteSummary(id: number) { return this.http.delete<void>(`${this.api}/ai-summaries/${id}`); }

  getConfigurations() { return this.http.get<Configuration[]>(`${this.api}/ai-configurations`); }
  getConfiguration(id: number) { return this.http.get<Configuration>(`${this.api}/ai-configurations/${id}`); }
  getActiveConfiguration(providerName?: string, modelName?: string) {
    let params = new HttpParams();
    if (providerName) params = params.set('providerName', providerName);
    if (modelName) params = params.set('modelName', modelName);
    return this.http.get<Configuration>(`${this.api}/ai-configurations/active`, { params });
  }
  createConfiguration(request: ConfigurationRequest) { return this.http.post<Configuration>(`${this.api}/ai-configurations`, request); }
  updateConfiguration(id: number, request: ConfigurationRequest) { return this.http.put<Configuration>(`${this.api}/ai-configurations/${id}`, request); }
  deleteConfiguration(id: number) { return this.http.delete<void>(`${this.api}/ai-configurations/${id}`); }

  getClaimRecommendation(id: number) { return this.http.get<ClaimRecommendation>(`${this.api}/claim-recommendations/${id}`); }
  getClaimRecommendations(claimId: number) { return this.http.get<ClaimRecommendation[]>(`${this.api}/claim-recommendations/claim/${claimId}`); }
  getClaimRecommendationsByPromptHistory(promptHistoryId: number) { return this.http.get<ClaimRecommendation[]>(`${this.api}/claim-recommendations/prompt-history/${promptHistoryId}`); }
  createClaimRecommendation(request: ClaimRecommendationRequest) { return this.http.post<ClaimRecommendation>(`${this.api}/claim-recommendations`, request); }
  deleteClaimRecommendation(id: number) { return this.http.delete<void>(`${this.api}/claim-recommendations/${id}`); }

  getFraudAssessment(id: number) { return this.http.get<FraudAssessment>(`${this.api}/fraud-assessments/${id}`); }
  getFraudAssessments(claimId: number) { return this.http.get<FraudAssessment[]>(`${this.api}/fraud-assessments/claim/${claimId}`); }
  getFraudAssessmentsByPromptHistory(promptHistoryId: number) { return this.http.get<FraudAssessment[]>(`${this.api}/fraud-assessments/prompt-history/${promptHistoryId}`); }
  createFraudAssessment(request: FraudAssessmentRequest) { return this.http.post<FraudAssessment>(`${this.api}/fraud-assessments`, request); }
  deleteFraudAssessment(id: number) { return this.http.delete<void>(`${this.api}/fraud-assessments/${id}`); }

  indexKnowledgeDocument(request: KnowledgeDocumentRequest) { return this.http.post<{ source: string; domain: string; chunksIndexed: number }>(`${this.api}/knowledge/documents`, request); }

  private getLookups(name: string) { return this.http.get<Lookup[]>(`${this.api}/ai-lookups/${name}`); }
  private referenceParams(referenceType: string, referenceId: number) { return new HttpParams().set('referenceType', referenceType).set('referenceId', referenceId); }
}