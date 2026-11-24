export type UserRole = 'ADMIN' | 'MEMBER' | 'SUPPORT';
export type UserStatus = 'PENDING_ACTIVATION' | 'ACTIVE' | 'SUSPENDED';

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  errorCode?: string;
  traceId?: string;
  properties?: Record<string, unknown>;
}

export interface SystemStatusResponse {
  service: string;
  apiVersion: string;
  status: string;
  timestamp: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface WebLoginResponse {
  userId: string;
  email: string;
  roles: UserRole[];
  sessionExpiresAt: string;
}

export interface CurrentUserResponse {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: UserRole[];
  sessionId?: string;
  clientId?: string;
  sessionExpiresAt?: string;
}

export interface SessionSummaryResponse {
  id: string;
  clientId?: string;
  authMethod?: string;
  createdAt: string;
  expiresAt: string;
}

export interface PkceAuthorizeRequest {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  state: string;
}

export interface PkceAuthorizeResponse {
  authorizationCode: string;
  redirectUri: string;
  state: string;
  expiresAt: string;
}

export interface ActivateAccountRequest {
  token: string;
  password: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetRequestedResponse {
  message: string;
}

export interface ConfirmPasswordResetRequest {
  token: string;
  newPassword: string;
}

export interface CreateManagedUserRequest {
  email: string;
  displayName: string;
  roles: UserRole[];
}

export interface UserSummaryResponse {
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  roles: UserRole[];
  createdAt: string;
  suspendedAt?: string | null;
}

export interface CreatedManagedUserResponse {
  user: UserSummaryResponse;
  activationToken: string;
  activationExpiresAt: string;
}

export interface UsersPageResponse {
  items: UserSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
}

export interface CreateConversationRequest {
  title: string;
  modelId?: string;
}

export interface ConversationSummaryResponse {
  id: string;
  title: string;
  modelId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationsPageResponse {
  items: ConversationSummaryResponse[];
  page: number;
  size: number;
  totalElements: number;
}

export interface SendMessageRequest {
  content: string;
}

export interface MessageResponse {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  sequenceNum: number;
  createdAt: string;
}

export interface GenerationSummaryResponse {
  id: string;
  modelId?: string | null;
  status: string;
  promptTokens?: number | null;
  completionTokens?: number | null;
  totalTokens?: number | null;
  errorCode?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface MessageExchangeResponse {
  userMessage: MessageResponse;
  assistantMessage: MessageResponse;
  generation: GenerationSummaryResponse;
  followUpSuggestions?: string[];
  guardrailFlags?: string[];
}

export interface ConversationHistoryResponse {
  conversation: ConversationSummaryResponse;
  messages: MessageResponse[];
  generations: GenerationSummaryResponse[];
}

export interface CreateProjectRequest {
  name: string;
  slug: string;
  description?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectsPageResponse {
  items: ProjectResponse[];
  page: number;
  size: number;
  totalElements: number;
}

export interface IngestKnowledgeSourceRequest {
  sourcePath: string;
  title: string;
  content: string;
}

export interface KnowledgeSourceResponse {
  id: string;
  projectId: string;
  sourcePath: string;
  title: string;
  contentHash: string;
  embeddingVersion: string;
  status: string;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeIndexJobResponse {
  id: string;
  projectId: string;
  sourceId: string;
  sourcePath: string;
  operation: string;
  status: string;
  chunksIndexed: number;
  errorCode?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

export interface IngestKnowledgeSourceResponse {
  source: KnowledgeSourceResponse;
  job: KnowledgeIndexJobResponse;
  deduplicated: boolean;
}

export interface KnowledgeSourcesResponse {
  items: KnowledgeSourceResponse[];
}

export interface KnowledgeIndexJobsResponse {
  items: KnowledgeIndexJobResponse[];
}

export interface KnowledgeSearchRequest {
  query: string;
  topK?: number;
  minScore?: number;
}

export interface KnowledgeSearchMatchResponse {
  sourceId: string;
  sourcePath: string;
  title: string;
  chunkIndex: number;
  excerpt: string;
  score: number;
  embeddingVersion: string;
}

export interface KnowledgeSearchResponse {
  projectId: string;
  embeddingVersion: string;
  latencyMs: number;
  matches: KnowledgeSearchMatchResponse[];
}

export interface CreatePairingChallengeRequest {
  deviceName: string;
  platform: string;
}

export interface PairingChallengeResponse {
  challengeId: string;
  pairingCode: string;
  deviceName: string;
  platform: string;
  expiresAt: string;
}

export interface DeviceSummaryResponse {
  id: string;
  name: string;
  platform: string;
  status: string;
  online: boolean;
  lastHeartbeatAt?: string | null;
  createdAt: string;
  revokedAt?: string | null;
}

export interface DevicesResponse {
  items: DeviceSummaryResponse[];
}

export interface CreateRemoteTaskRequest {
  deviceId: string;
  projectId: string;
  idempotencyKey?: string;
  title: string;
  instruction: string;
}

export interface RemoteTaskSummaryResponse {
  id: string;
  projectId: string;
  deviceId: string;
  title: string;
  instruction: string;
  status: string;
  leaseExpiresAt?: string | null;
  resultSummary?: string | null;
  errorCode?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
}

export interface CreateRemoteTaskResponse {
  task: RemoteTaskSummaryResponse;
  deviceOnline: boolean;
  deduplicated: boolean;
}

export interface RemoteTasksResponse {
  items: RemoteTaskSummaryResponse[];
}

export interface TaskEventResponse {
  id: string;
  eventKey: string;
  eventType: string;
  message: string;
  createdAt: string;
}

export interface ToolApprovalResponse {
  id: string;
  taskId: string;
  toolName: string;
  targetPath?: string | null;
  commandText?: string | null;
  diffPreview?: string | null;
  status: string;
  expiresAt: string;
  decidedAt?: string | null;
  createdAt: string;
}

export interface RemoteTaskDetailResponse {
  task: RemoteTaskSummaryResponse;
  events: TaskEventResponse[];
  approvals: ToolApprovalResponse[];
}

export interface ToolApprovalDecisionRequest {
  action: 'APPROVE' | 'REJECT';
}

export interface ToolApprovalDecisionResponse {
  task: RemoteTaskSummaryResponse;
  approval: ToolApprovalResponse;
}

export interface UserQuotaResponse {
  userId: string;
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  maxConcurrentGenerations: number;
  updatedAt: string;
}

export interface UpdateUserQuotaRequest {
  dailyTokenLimit: number;
  dailyRequestLimit: number;
  maxConcurrentGenerations: number;
}

export interface UsageRecordResponse {
  id: string;
  conversationId?: string | null;
  generationId?: string | null;
  modelId?: string | null;
  source: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimated: boolean;
  latencyMs: number;
  outcome: string;
  recordedAt: string;
}

export interface UsageSummaryResponse {
  windowStart: string;
  windowEnd: string;
  usedTokens: number;
  usedRequests: number;
  remainingTokens: number;
  remainingRequests: number;
  quota: UserQuotaResponse;
  recentRecords: UsageRecordResponse[];
}

export interface AdminUsageOverviewResponse {
  windowStart: string;
  windowEnd: string;
  totalTokensToday: number;
  totalRequestsToday: number;
}
