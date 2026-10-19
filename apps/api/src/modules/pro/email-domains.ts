import { and, eq, gte, inArray } from 'drizzle-orm';
import {
  emailDomainAllowed,
  getAuthSettings,
  inviteValidSince,
  registrationEmailAllowed,
} from '@repo/auth';
import { db, team, teamInvite } from '@repo/db';
import { workspaceEmailDomain } from '@repo/db/schema/pro';

const domainOf = (email: string) => {
  const address = email.trim().toLowerCase();
  return address.slice(address.lastIndexOf('@') + 1);
};

export async function listEmailDomains(workspaceId: number): Promise<string[]> {
  const rows = await db
    .select({ domain: workspaceEmailDomain.domain })
    .from(workspaceEmailDomain)
    .where(eq(workspaceEmailDomain.workspaceId, workspaceId))
    .orderBy(workspaceEmailDomain.domain);
  return rows.map((row) => row.domain);
}

// Replaces the workspace's domains with the given ones. People already in its teams keep
// their access: the domains are asked only when someone is invited or provisioned.
export async function setEmailDomains(workspaceId: number, domains: string[]): Promise<string[]> {
  await db.transaction(async (tx) => {
    await tx.delete(workspaceEmailDomain).where(eq(workspaceEmailDomain.workspaceId, workspaceId));
    if (domains.length > 0) {
      await tx
        .insert(workspaceEmailDomain)
        .values(domains.map((domain) => ({ workspaceId, domain })));
    }
  });
  return listEmailDomains(workspaceId);
}

async function teamDomains(teamId: number): Promise<string[]> {
  const rows = await db
    .select({ domain: workspaceEmailDomain.domain })
    .from(workspaceEmailDomain)
    .innerJoin(team, eq(team.workspaceId, workspaceEmailDomain.workspaceId))
    .where(eq(team.id, teamId));
  return rows.map((row) => row.domain);
}

// A team of a workspace with domains takes an invite for an address at one of them,
// whether or not it has an account; any other team follows the core's rule.
export async function inviteEmailAllowed(
  teamId: number,
  email: string,
  hasAccount: boolean,
): Promise<boolean> {
  const domains = await teamDomains(teamId);
  if (domains.length > 0) return emailDomainAllowed(email, domains);
  return hasAccount || registrationEmailAllowed(email);
}

// A workspace's identity provider provisions addresses at its domains; the instance's,
// and that of a workspace with none, any address.
export async function scimEmailAllowed(
  workspaceId: number | null,
  email: string,
): Promise<boolean> {
  if (workspaceId == null) return true;
  return emailDomainAllowed(email, await listEmailDomains(workspaceId));
}

// An address may register at the instance's domains, or at the domains of a workspace
// with an invite for it that is still open.
export async function registrationEmailPolicy(email: string): Promise<boolean> {
  if (emailDomainAllowed(email, (await getAuthSettings()).allowedEmailDomains)) return true;
  const address = email.trim().toLowerCase();
  const since = await inviteValidSince();
  const invited = await db
    .select({ workspaceId: team.workspaceId })
    .from(teamInvite)
    .innerJoin(team, eq(team.id, teamInvite.teamId))
    .where(
      and(
        eq(teamInvite.email, address),
        eq(teamInvite.status, 'pending'),
        since ? gte(teamInvite.createdAt, since) : undefined,
      ),
    );
  if (invited.length === 0) return false;
  const [match] = await db
    .select({ domain: workspaceEmailDomain.domain })
    .from(workspaceEmailDomain)
    .where(
      and(
        inArray(
          workspaceEmailDomain.workspaceId,
          invited.map((row) => row.workspaceId),
        ),
        eq(workspaceEmailDomain.domain, domainOf(address)),
      ),
    )
    .limit(1);
  return match !== undefined;
}
