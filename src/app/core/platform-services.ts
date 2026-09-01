import { Injectable } from '@angular/core';

export const platformServiceUrls = {
  apiGateway: 'https://insurance-api-gateway-rn0g.onrender.com',
  identity: 'https://insurance-identity-service.onrender.com',
  customers: 'https://insurance-customer-service-mxdj.onrender.com',
  policies: 'https://insurance-policy-service.onrender.com',
  notification: 'https://notificationservice-9ko7.onrender.com',
  payment: 'https://paymentservice-zfth.onrender.com',
  premium: 'https://premiumservice-bagg.onrender.com',
  reporting: 'http://10.50.15.17:8081',
  aiAssistant: 'http://10.50.15.17:8082',
  claims: 'http://10.50.15.17:8083',
} as const;

const wakeUpUrls = [
  `${platformServiceUrls.apiGateway}/health`,
  `${platformServiceUrls.identity}/swagger/index.html`,
  `${platformServiceUrls.customers}/swagger/index.html`,
  `${platformServiceUrls.policies}/swagger/index.html`,
  `${platformServiceUrls.notification}/swagger/index.html`,
  `${platformServiceUrls.payment}/swagger/index.html`,
  `${platformServiceUrls.premium}/swagger/index.html`,
  `${platformServiceUrls.reporting}/swagger`,
  `${platformServiceUrls.aiAssistant}/swagger`,
  `${platformServiceUrls.claims}/swagger`,
];

@Injectable({ providedIn: 'root' })
export class PlatformServiceWakeUpService {
  wakeUp(): void {
    for (const url of wakeUpUrls) {
      void fetch(url, { mode: 'no-cors', cache: 'no-store' }).catch(() => undefined);
    }
  }
}