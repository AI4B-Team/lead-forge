/**
 * Turns the numeric List Quality Score into a grade with emotional meaning.
 * Presentation only — the score math itself lives server-side.
 */
export type QualityGrade = { letter: string; label: string; tone: "success" | "warn" | "danger" };

export function qualityGrade(score: number): QualityGrade {
  if (score >= 90) return { letter: "A", label: "Excellent", tone: "success" };
  if (score >= 80) return { letter: "A−", label: "Very Good", tone: "success" };
  if (score >= 70) return { letter: "B", label: "Good", tone: "success" };
  if (score >= 60) return { letter: "C", label: "Fair", tone: "warn" };
  if (score >= 45) return { letter: "D", label: "Weak Source", tone: "warn" };
  return { letter: "F", label: "Poor Source", tone: "danger" };
}
