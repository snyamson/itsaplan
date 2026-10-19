import type { Locale } from '@/i18n/locales';
import type { MessageTree } from '@/i18n/messages';

// The English of the Pro features, merged into the catalogue the keys are typed against.
// The other languages are in ./messages/<locale>.json under the same keys.
export const cloudMessages = {
  pro: {
    workspaces: {
      title: 'New workspace',
      namePlaceholder: 'Workspace name',
      hint: 'You own the workspace. Add its teams once it is created.',
      submit: 'Create workspace',
    },
    auditLog: {
      searchPlaceholder: 'Search by person, action, place or address',
      period: 'Period',
      periods: {
        '1': 'Last 24 hours',
        '7': 'Last 7 days',
        '30': 'Last 30 days',
        '90': 'Last 90 days',
        all: 'All time',
      },
      export: 'Export CSV',
      exportFailed: 'The audit log could not be exported.',
      instance: 'Instance',
      emptyTitle: 'No events',
      emptyHint: 'Changes and sign-ins appear here as they happen.',
      emptyFiltered: 'Nothing matches this search in the period.',
      verbs: {
        POST: 'Created',
        PUT: 'Set',
        PATCH: 'Updated',
        DELETE: 'Deleted',
        other: 'Changed',
        sign_in: 'Signed in',
      },
      via: {
        web: 'Web',
        api_key: 'API key',
        mcp: 'MCP',
      },
    },
  },
};

export async function loadCloudMessages(locale: Locale): Promise<MessageTree> {
  return (await import(`./messages/${locale}.json`)).default;
}
