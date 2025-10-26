import { VisualTraceConfig } from "../types";
import { VisualTraceService } from "./service";

export { VisualTraceService } from "./service";
export type { VisualTraceConfig } from "../types";

export function createVisualTraceService(
  config?: VisualTraceConfig,
): VisualTraceService {
  return new VisualTraceService(config);
}
