import type { GodSection } from '@/utils/godSections';
import coreGodSections from '../ce/godSections';
import GodAuditLogSection from './audit-log/GodAuditLogSection';

// The god mode sections of ../ce, with the page of each Pro feature in place of its
// preview.
const PRO_PAGES: Record<string, GodSection['Component']> = {
  'audit-log': GodAuditLogSection,
};

export default function godSections(core: GodSection[]): GodSection[] {
  return coreGodSections(core).map((section) =>
    PRO_PAGES[section.slug] ? { ...section, Component: PRO_PAGES[section.slug] } : section,
  );
}
