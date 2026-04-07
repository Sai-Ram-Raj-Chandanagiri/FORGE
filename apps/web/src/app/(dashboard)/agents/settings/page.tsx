"use client";

import { Suspense } from "react";
import { Settings, User } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { PersonalityForm } from "@/components/agents/personality-form";

interface ProfileData {
  id: string;
  agentName: string;
  avatarUrl: string | null;
  personalityPreset: string;
  tone: string | null;
  customSystemPromptSuffix: string | null;
}

function SettingsContent() {
  const utils = trpc.useUtils();

  const { data: profile, isPending: isLoading } =
    trpc.agent.getProfile.useQuery({}) as {
      data: ProfileData | null | undefined;
      isPending: boolean;
    };

  const upsertMutation = trpc.agent.upsertProfile.useMutation({
    onSuccess: () => {
      void utils.agent.getProfile.invalidate();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Settings className="h-8 w-8 text-primary" />
          Agent Settings
        </h1>
        <p className="mt-1 text-muted-foreground">
          Customize your agent&apos;s personality, name, and behavior.
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      ) : (
        <div className="max-w-2xl rounded-xl border bg-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-semibold">Agent Personality</h2>
          </div>

          <PersonalityForm
            defaultValues={
              profile
                ? {
                    agentName: profile.agentName,
                    avatarUrl: profile.avatarUrl,
                    personalityPreset: profile.personalityPreset,
                    tone: profile.tone,
                    customSystemPromptSuffix: profile.customSystemPromptSuffix,
                  }
                : undefined
            }
            onSubmit={(data) => upsertMutation.mutate(data)}
            isPending={upsertMutation.isPending}
          />

          {upsertMutation.isSuccess && (
            <p className="mt-3 text-xs text-emerald-600 dark:text-emerald-400">
              Settings saved successfully.
            </p>
          )}
          {upsertMutation.isError && (
            <p className="mt-3 text-xs text-red-600 dark:text-red-400">
              Failed to save settings. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AgentSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 animate-pulse rounded-xl border bg-muted"
            />
          ))}
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
