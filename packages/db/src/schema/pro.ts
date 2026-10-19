// Tables of the Pro features. They are kept out of ./index.ts and migrated from
// ../../drizzle-pro (drizzle.pro.config.ts), which the migrate step applies after the
// core's as the build's own migrations, so the core's migration history stays upstream's.
import {
  bigserial,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';
import { workspace } from './app';
import { user } from './auth';

// One write somebody made through the api, or one sign-in. The workspace is the one the
// request acted in, null for the instance's own settings, for a sign-in, and once the
// workspace is deleted, when its events stay in the instance's log. Who and where are
// copied in, so an event still reads after the account, team or project is deleted.
export const auditEvent = pgTable(
  'audit_event',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    workspaceId: integer('workspace_id').references(() => workspace.id, { onDelete: 'set null' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    actorName: text('actor_name').notNull(),
    actorEmail: text('actor_email').notNull(),
    // 'sign_in', or the request: its method and its route as declared, `/issues/:issueId`.
    action: text('action').notNull(),
    method: text('method'),
    route: text('route'),
    // The project, team or workspace the request acted in, as it was named then.
    target: text('target'),
    // How the request arrived: 'web', 'api_key' or 'mcp'.
    via: text('via').notNull(),
    ip: text('ip'),
  },
  (t) => [
    index('audit_event_workspace_created_idx').on(t.workspaceId, t.createdAt),
    index('audit_event_created_idx').on(t.createdAt),
    index('audit_event_actor_idx').on(t.actorId),
  ],
);

// The email domains a workspace admits. With any listed, an address at none of them is
// not invited into its teams nor provisioned by its SCIM, and one it invited may sign up
// at them; with none, the instance's rules apply.
export const workspaceEmailDomain = pgTable(
  'workspace_email_domain',
  {
    workspaceId: integer('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    domain: text('domain').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.workspaceId, t.domain] }),
    index('workspace_email_domain_domain_idx').on(t.domain),
  ],
);
