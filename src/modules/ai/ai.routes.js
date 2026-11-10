import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { authorizeProfileRole } from '../../middleware/authorizeProfileRole.js';
import { validate } from '../../middleware/validate.js';
import * as aiController from './ai.controller.js';
import {
  updateAgentSchema,
  createSourceSchema,
  updateSourceSchema,
  updateDraftSchema,
  createOrganisationSchema,
  createAuthoritySchema,
  updateSettingsSchema,
} from './ai.validation.js';

const router = Router();
const requireAdmin = [authenticate, authorizeProfileRole('admin')];

// Dashboard overview
router.get('/dashboard', ...requireAdmin, aiController.getDashboardOverview);

// Agents management
router.get('/agents', ...requireAdmin, aiController.getAgents);
router.patch('/agents/:id', ...requireAdmin, validate(updateAgentSchema), aiController.updateAgent);

// Sources management
router.get('/sources', ...requireAdmin, aiController.getSources);
router.post('/sources', ...requireAdmin, validate(createSourceSchema), aiController.createSource);
router.patch('/sources/:id', ...requireAdmin, validate(updateSourceSchema), aiController.updateSource);
router.delete('/sources/:id', ...requireAdmin, aiController.deleteSource);

// Trigger automated discovery / ingestion
router.post('/discover', ...requireAdmin, aiController.triggerDiscovery);
router.post('/discover/publish-pending', ...requireAdmin, aiController.publishPendingDiscoveries);
router.get('/discoveries', ...requireAdmin, aiController.getDiscoveries);
router.post('/discoveries/:id/approve', ...requireAdmin, aiController.approveDiscovery);

// Content studio drafts & publishing
router.get('/drafts', ...requireAdmin, aiController.getDrafts);
router.patch('/drafts/:id', ...requireAdmin, validate(updateDraftSchema), aiController.updateDraft);
router.post('/drafts/:id/paraphrase', ...requireAdmin, aiController.paraphraseDraft);
router.post('/drafts/:id/approve', ...requireAdmin, aiController.approveDraft);
router.post('/drafts/:id/reject', ...requireAdmin, aiController.rejectDraft);
router.post('/drafts/:id/publish', ...requireAdmin, aiController.publishDraft);

// Clubs & Organisations registry
router.get('/organisations', ...requireAdmin, aiController.getOrganisations);
router.post('/organisations', ...requireAdmin, validate(createOrganisationSchema), aiController.createOrganisation);
router.patch('/organisations/:id', ...requireAdmin, aiController.updateOrganisation);

// Civic & campus authorities directory
router.get('/authorities', ...requireAdmin, aiController.getAuthorities);
router.post('/authorities', ...requireAdmin, validate(createAuthoritySchema), aiController.createAuthority);

// Issues Intelligence guidance
router.get('/issues/:issueId/recommendations', ...requireAdmin, aiController.getIssueRecommendations);

// Email Intelligence OAuth
router.post('/email/connect', ...requireAdmin, aiController.connectEmail);
router.get('/email/callback', aiController.handleEmailCallback);
router.get('/email/integrations', ...requireAdmin, aiController.getEmailIntegrations);
router.post('/email/scan', ...requireAdmin, aiController.scanEmail);
router.post('/email/disconnect', ...requireAdmin, aiController.disconnectEmail);

// Telemetry & Analytics
router.get('/analytics', ...requireAdmin, aiController.getAnalytics);
router.get('/usage', ...requireAdmin, aiController.getUsageTelemetry);
router.get('/provider-status', ...requireAdmin, aiController.getProviderStatus);

// Settings & Emergency Killswitch
router.patch('/settings', ...requireAdmin, validate(updateSettingsSchema), aiController.updateSettings);
router.post('/pause', ...requireAdmin, aiController.pauseAI);
router.post('/resume', ...requireAdmin, aiController.resumeAI);

export default router;

