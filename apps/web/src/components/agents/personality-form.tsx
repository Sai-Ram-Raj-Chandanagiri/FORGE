"use client";

import { useState, useEffect } from "react";
import { Save, User } from "lucide-react";

interface PersonalityFormProps {
  defaultValues?: {
    agentName?: string;
    avatarUrl?: string | null;
    personalityPreset?: string;
    tone?: string | null;
    customSystemPromptSuffix?: string | null;
  };
  onSubmit: (data: {
    agentName?: string;
    avatarUrl?: string;
    personalityPreset?: "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL" | "CUSTOM";
    tone?: string;
    customSystemPromptSuffix?: string;
  }) => void;
  isPending?: boolean;
}

const PRESETS = [
  { value: "PROFESSIONAL", label: "Professional", desc: "Formal, precise, business-appropriate" },
  { value: "FRIENDLY", label: "Friendly", desc: "Warm, conversational, encouraging" },
  { value: "TECHNICAL", label: "Technical", desc: "Precise, metrics-focused, data-driven" },
  { value: "CUSTOM", label: "Custom", desc: "Define your own tone and style" },
] as const;

export function PersonalityForm({
  defaultValues,
  onSubmit,
  isPending,
}: PersonalityFormProps) {
  const [agentName, setAgentName] = useState(defaultValues?.agentName ?? "FORGE Assistant");
  const [avatarUrl, setAvatarUrl] = useState(defaultValues?.avatarUrl ?? "");
  const [preset, setPreset] = useState(defaultValues?.personalityPreset ?? "PROFESSIONAL");
  const [tone, setTone] = useState(defaultValues?.tone ?? "");
  const [suffix, setSuffix] = useState(defaultValues?.customSystemPromptSuffix ?? "");

  useEffect(() => {
    if (defaultValues) {
      setAgentName(defaultValues.agentName ?? "FORGE Assistant");
      setAvatarUrl(defaultValues.avatarUrl ?? "");
      setPreset(defaultValues.personalityPreset ?? "PROFESSIONAL");
      setTone(defaultValues.tone ?? "");
      setSuffix(defaultValues.customSystemPromptSuffix ?? "");
    }
  }, [defaultValues]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      agentName: agentName.trim() || undefined,
      avatarUrl: avatarUrl.trim() || undefined,
      personalityPreset: preset as "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL" | "CUSTOM",
      tone: preset === "CUSTOM" ? tone.trim() || undefined : undefined,
      customSystemPromptSuffix: suffix.trim() || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label className="block text-xs font-medium mb-1">Agent Name</label>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          maxLength={100}
          placeholder="FORGE Assistant"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          The agent will identify itself by this name.
        </p>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1">
          Avatar URL <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          value={avatarUrl}
          onChange={(e) => setAvatarUrl(e.target.value)}
          type="url"
          placeholder="https://example.com/avatar.png"
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <div>
        <label className="block text-xs font-medium mb-2">
          Personality Preset
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={`rounded-lg border p-3 text-left transition-all ${
                preset === p.value
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "hover:border-primary/30"
              }`}
            >
              <p className="text-sm font-medium">{p.label}</p>
              <p className="text-[10px] text-muted-foreground">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {preset === "CUSTOM" && (
        <div>
          <label className="block text-xs font-medium mb-1">
            Custom Tone
          </label>
          <textarea
            value={tone}
            onChange={(e) => setTone(e.target.value)}
            maxLength={5000}
            rows={4}
            placeholder="Describe the tone, personality, and communication style you want the agent to use..."
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-[10px] text-muted-foreground">
            {tone.length}/5000 characters
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1">
          Custom System Prompt Suffix{" "}
          <span className="text-muted-foreground">(optional)</span>
        </label>
        <textarea
          value={suffix}
          onChange={(e) => setSuffix(e.target.value)}
          maxLength={5000}
          rows={3}
          placeholder="Additional instructions appended to the agent's system prompt..."
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          {suffix.length}/5000 characters
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Save className="h-4 w-4" />
        {isPending ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
