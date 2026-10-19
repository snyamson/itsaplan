import { extendAuth } from '@repo/auth/extensions';
import { setOwnedWorkspaceLimit } from '#shared/limits';
import { setRequestTracker } from '#shared/request-tracker';
import { signInAudit, trackAuditedRequest } from './audit';

// The extension hooks of the Pro features, installed once before the api listens
// (src/index.ts). Tests run the core defaults and install the hooks they exercise.
export function installPro(): void {
  setOwnedWorkspaceLimit(0);
  setRequestTracker(trackAuditedRequest);
  extendAuth({ plugins: [signInAudit] });
}
