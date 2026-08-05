import { useQuery } from "@tanstack/react-query";
import { getVerifiedCoverage } from "@/lib/coverage.functions";
import { recordTypeCovered } from "@/lib/coverage.shared";
import { recordTypeForTemplate } from "@/lib/record-types";
import type { Template } from "@/lib/templates";

/**
 * Template card state comes from source_coverage, not from the template config.
 * A public-records template with no verified county/record-type pair anywhere is
 * rendered "Coming Soon — request it" instead of a runnable free template.
 */
export function useTemplateCoverage() {
  const query = useQuery({
    queryKey: ["verified-coverage"],
    queryFn: () => getVerifiedCoverage(),
    staleTime: 5 * 60_000,
  });
  const verified = query.data?.coverage ?? [];
  const isComingSoon = (template: Template) => {
    const recordType = recordTypeForTemplate(template.id);
    if (!recordType || query.isPending) return false;
    return !recordTypeCovered(verified, recordType);
  };
  return { isComingSoon, isLoading: query.isPending };
}
