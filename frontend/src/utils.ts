export function stageStatus(stagePct: number, currentPct: number): "done" | "active" | "pending" {
  if (currentPct >= stagePct + 10) return "done";
  if (currentPct >= stagePct - 10) return "active";
  return "pending";
}

export function sanitizeError(error: string): string {
  return error.startsWith("{")
    ? "Repository not found or is private. Please check the URL and try again."
    : error;
}
