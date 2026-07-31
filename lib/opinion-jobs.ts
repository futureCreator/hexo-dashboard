import type { HexoPost } from "@/lib/hexo";

// ponytail: shared by opinion + source write jobs ("fetch" used by source mode only)
export type OpinionJobStep = "fetch" | "search" | "analyze" | "write" | "save";

export type OpinionJob = {
  status: "running" | "done" | "error";
  step: OpinionJobStep;
  post?: HexoPost;
  error?: string;
  createdAt: number;
};

// ponytail: in-memory only — fine on single PM2 process; ceiling = process restart loses jobs
const jobs = new Map<string, OpinionJob>();
const TTL_MS = 30 * 60 * 1000;

function sweep() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > TTL_MS) jobs.delete(id);
  }
}

export function createOpinionJob(initialStep: OpinionJobStep = "search"): string {
  sweep();
  const id = crypto.randomUUID();
  jobs.set(id, { status: "running", step: initialStep, createdAt: Date.now() });
  return id;
}

export function getOpinionJob(id: string): OpinionJob | undefined {
  return jobs.get(id);
}

export function updateOpinionJob(
  id: string,
  patch: Partial<Pick<OpinionJob, "status" | "step" | "post" | "error">>
): void {
  const job = jobs.get(id);
  if (!job) return;
  Object.assign(job, patch);
}
