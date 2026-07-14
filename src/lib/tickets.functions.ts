import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type { Diagnostico } from "./ai.server";

const AnalyzeInput = z.object({
  descripcion: z.string().trim().min(1).max(4000),
});

// Session-gated: only authenticated técnicos may call the AI gateway.
export const analyzeTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AnalyzeInput.parse(data))
  .handler(async ({ data }) => {
    const { requireTecnico } = await import("./session.server");
    await requireTecnico();
    const { runAiDiagnostico } = await import("./ai.server");
    return runAiDiagnostico(data.descripcion);
  });
