import { setRegistrationEmailPolicy, setWorkspaceScim } from '@repo/auth';
import { extendAuth } from '@repo/auth/extensions';
import { setOwnedWorkspaceLimit } from '#shared/limits';
import { setRequestTracker } from '#shared/request-tracker';
import { setInviteEmailPolicy } from '#modules/invites/email-policy';
import { setScimEmailPolicy } from '#modules/scim/email-policy';
import { signInAudit, trackAuditedRequest } from './audit';
import { inviteEmailAllowed, registrationEmailPolicy, scimEmailAllowed } from './email-domains';

// The extension hooks of the Pro features, installed once before the api listens
// (src/index.ts). Tests run the core defaults and install the hooks they exercise.
export function installPro(): void {
  setOwnedWorkspaceLimit(0);
  setRequestTracker(trackAuditedRequest);
  extendAuth({ plugins: [signInAudit] });
  setWorkspaceScim();
  setInviteEmailPolicy(inviteEmailAllowed);
  setScimEmailPolicy(scimEmailAllowed);
  setRegistrationEmailPolicy(registrationEmailPolicy);
}
