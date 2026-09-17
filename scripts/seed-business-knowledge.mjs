import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(scriptDirectory, '..', '..');
const apiUrl = (process.env.AI_ASSISTANT_API_URL ?? 'https://insurance-ai-assistant-service.onrender.com/api')
  .replace(/\/$/, '');
const token = process.env.AI_ASSISTANT_TOKEN;
const dryRun = process.argv.includes('--dry-run');

const allRoles = [
  'Customer',
  'KycReviewer',
  'PolicyUnderwriter',
  'ClaimsAdjuster',
  'PaymentOperations',
  'SupportAgent',
  'ComplianceOfficer',
  'PlatformAdmin',
];

const domainRules = [
  [/identity|user management|role & permission/i, 'SupportFaqs', ['PlatformAdmin', 'ComplianceOfficer']],
  [/customer|profile|address|nominee|kyc/i, 'SupportFaqs', ['Customer', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/policy|coverage|underwrit/i, 'PoliciesAndCoverage', ['Customer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/claim|settlement|fraud/i, 'ClaimsProcedures', ['Customer', 'ClaimsAdjuster', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/premium|payment|transaction|refund|receipt/i, 'PremiumsAndPayments', ['Customer', 'PaymentOperations', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/notification/i, 'SupportFaqs', ['Customer', 'KycReviewer', 'PolicyUnderwriter', 'ClaimsAdjuster', 'PaymentOperations', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/report/i, 'SupportFaqs', ['PolicyUnderwriter', 'ClaimsAdjuster', 'PaymentOperations', 'SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/audit|compliance/i, 'FraudReviewGuidance', ['ComplianceOfficer', 'PlatformAdmin']],
  [/ai assistant|ai configuration|knowledge/i, 'SupportFaqs', ['PlatformAdmin', 'ComplianceOfficer']],
  [/technology stack|non-functional|future enhancement|business objective|purpose|stakeholder/i, 'SupportFaqs', ['ComplianceOfficer', 'PlatformAdmin']],
  [/end-to-end|responsibility flow/i, 'SupportFaqs', allRoles],
];

const roleSectionRules = [
  [/(?:^|>\s*)2\. Customer(?:\s*>|$)/i, 'SupportFaqs', ['Customer']],
  [/(?:^|>\s*)3\. KycReviewer(?:\s*>|$)/i, 'SupportFaqs', ['KycReviewer', 'ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)4\. PolicyUnderwriter(?:\s*>|$)/i, 'PoliciesAndCoverage', ['PolicyUnderwriter', 'ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)5\. ClaimsAdjuster(?:\s*>|$)/i, 'ClaimsProcedures', ['ClaimsAdjuster', 'ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)6\. PaymentOperations(?:\s*>|$)/i, 'PremiumsAndPayments', ['PaymentOperations', 'ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)7\. SupportAgent(?:\s*>|$)/i, 'SupportFaqs', ['SupportAgent', 'ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)8\. ComplianceOfficer(?:\s*>|$)/i, 'FraudReviewGuidance', ['ComplianceOfficer', 'PlatformAdmin']],
  [/(?:^|>\s*)9\. PlatformAdmin(?:\s*>|$)/i, 'SupportFaqs', ['PlatformAdmin']],
  [/role-based access matrix|recommended authorization architecture/i, 'FraudReviewGuidance', ['ComplianceOfficer', 'PlatformAdmin']],
  [/end-to-end responsibility flow/i, 'SupportFaqs', allRoles],
];

if (!token && !dryRun) {
  throw new Error('AI_ASSISTANT_TOKEN is required. Use a PlatformAdmin JWT from the signed-in portal session.');
}

function splitSections(markdown) {
  const matches = [...markdown.matchAll(/^(#{1,3})\s+(.+?)\s*$/gm)];
  const parents = new Map();
  return matches.map((match, index) => {
    const nextMatch = matches[index + 1];
    const level = match[1].length;
    parents.set(level, match[2].trim());
    for (const parentLevel of [...parents.keys()]) {
      if (parentLevel > level) parents.delete(parentLevel);
    }
    return {
      heading: [...parents.entries()]
        .filter(([parentLevel]) => parentLevel <= level)
        .sort(([leftLevel], [rightLevel]) => leftLevel - rightLevel)
        .map(([, heading]) => heading)
        .join(' > '),
      content: markdown.slice(match.index, nextMatch?.index ?? markdown.length).trim(),
    };
  }).filter((section) => section.content.length > 80);
}

function classifySection(heading, rules, fallback) {
  const leafHeading = heading.split(' > ').at(-1) ?? heading;
  for (const candidate of [leafHeading, heading]) {
    const matchingRule = rules.find(([pattern]) => pattern.test(candidate));
    if (matchingRule) {
      return { domain: matchingRule[1], allowedRoles: matchingRule[2] };
    }
  }
  return fallback;
}

async function indexSection(source, section, rules, fallback) {
  const classification = classifySection(section.heading, rules, fallback);
  if (dryRun) {
    console.log(`DRY RUN | ${classification.domain} | ${classification.allowedRoles.join(', ')} | ${section.heading}`);
    return 0;
  }

  const response = await fetch(`${apiUrl}/knowledge/documents`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      source: `${source} :: ${section.heading}`,
      domain: classification.domain,
      allowedRoles: classification.allowedRoles,
      content: section.content,
    }),
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`Failed to index "${section.heading}" (${response.status}): ${body}`);
  }

  const result = JSON.parse(body);
  if (!Number.isInteger(result.chunksIndexed) || result.chunksIndexed < 1) {
    throw new Error(`No chunks were indexed for "${section.heading}": ${body}`);
  }

  console.log(`${result.chunksIndexed} chunks | ${classification.domain} | ${section.heading}`);
  return result.chunksIndexed;
}

const documents = [
  {
    path: resolve(workspaceRoot, 'Insurance_Policy_Management_Platform_BRD.md'),
    source: 'Insurance Policy Management Platform BRD',
    rules: domainRules,
    fallback: { domain: 'SupportFaqs', allowedRoles: ['ComplianceOfficer', 'PlatformAdmin'] },
  },
  {
    path: resolve(workspaceRoot, 'Insurance_Roles_and_Functionalities.md'),
    source: 'Insurance Roles and Functionalities',
    rules: roleSectionRules,
    fallback: { domain: 'SupportFaqs', allowedRoles: ['ComplianceOfficer', 'PlatformAdmin'] },
  },
];

let indexedChunks = 0;
let indexedSections = 0;
for (const document of documents) {
  const markdown = await readFile(document.path, 'utf8');
  for (const section of splitSections(markdown)) {
    indexedChunks += await indexSection(document.source, section, document.rules, document.fallback);
    indexedSections += 1;
  }
}

console.log(dryRun
  ? `Validated ${indexedSections} business-knowledge sections for pgvector indexing.`
  : `Indexed ${indexedChunks} pgvector chunks from ${indexedSections} business-knowledge sections.`);