import { db, isDemo, demoForcedByEnv } from "@/lib/db";
import { plaidConfigured, plaidEnvName, llmEnabled, syncHour } from "@/lib/env";
import { PageTitle } from "@/components/page";
import { SetupFlow } from "@/components/setup-flow";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  const banks = isDemo() ? [] : (db().prepare("select id,institution from items").all() as { id: string; institution: string }[]);
  const h = syncHour();
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Setup" description="Three short steps and you're looking at your own money. If you'd rather look around first, turn on demo mode." />
      <SetupFlow
        state={{
          demo: isDemo(),
          demoForcedByEnv: demoForcedByEnv(),
          configured: plaidConfigured(),
          plaidEnv: plaidEnvName(),
          banks,
          llm: llmEnabled(),
          syncHourLabel: `${h % 12 === 0 ? 12 : h % 12}:00 ${h < 12 ? "AM" : "PM"}`,
        }}
      />
    </div>
  );
}
