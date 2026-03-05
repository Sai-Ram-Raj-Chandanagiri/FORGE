"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc-client";
import {
  Play,
  Square,
  Clock,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Monitor,
  X,
  RefreshCw,
  Timer,
} from "lucide-react";

interface SandboxViewerProps {
  moduleId: string;
  moduleName: string;
  versionId?: string;
}

type SandboxState = "idle" | "starting" | "running" | "expired" | "failed";
type Duration = 1 | 5 | 15;

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: 1, label: "1 min" },
  { value: 5, label: "5 min" },
  { value: 15, label: "15 min" },
];

export function SandboxViewer({ moduleId, moduleName, versionId }: SandboxViewerProps) {
  const [state, setState] = useState<SandboxState>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [port, setPort] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<Duration>(5);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trpcUtils = trpc.useUtils();

  const startMutation = trpc.sandbox.startDemo.useMutation();
  const stopMutation = trpc.sandbox.stopDemo.useMutation();

  // Poll sandbox status when starting
  const { data: statusData } = trpc.sandbox.getStatus.useQuery(
    { sessionId: sessionId ?? "" },
    {
      enabled: !!sessionId && (state === "starting" || state === "running"),
      refetchInterval: state === "starting" ? 2000 : state === "running" ? 10000 : false,
    },
  );

  // Sync status from server
  useEffect(() => {
    if (!statusData) return;

    if (statusData.status === "running" && state === "starting") {
      setState("running");
      setRemainingSeconds(statusData.remainingSeconds);
    }
    if (statusData.status === "expired") {
      setState("expired");
      cleanupCountdown();
    }
    if (statusData.status === "failed") {
      setState("failed");
      setErrorMessage(
        typeof statusData.errorMessage === "string"
          ? statusData.errorMessage
          : "Sandbox container failed to start",
      );
      cleanupCountdown();
    }
  }, [statusData, state]);

  // Local countdown timer
  useEffect(() => {
    if (state === "running" && remainingSeconds > 0) {
      countdownRef.current = setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            setState("expired");
            cleanupCountdown();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => cleanupCountdown();
    }
  }, [state, remainingSeconds > 0]);

  const cleanupCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  async function handleStart() {
    setErrorMessage(null);
    setState("starting");
    try {
      const result = await startMutation.mutateAsync({
        moduleId,
        versionId,
        durationMinutes: selectedDuration,
      });
      setSessionId(result.sessionId);
      setPort(result.port);
      setRemainingSeconds(Math.floor(
        (new Date(result.expiresAt).getTime() - Date.now()) / 1000,
      ));
    } catch (err: unknown) {
      setState("failed");
      const message =
        err && typeof err === "object" && "message" in err
          ? String((err as { message: string }).message)
          : "Failed to start sandbox demo";
      setErrorMessage(message);
    }
  }

  async function handleStop() {
    if (!sessionId) return;
    try {
      await stopMutation.mutateAsync({ sessionId });
      setState("expired");
      cleanupCountdown();
    } catch {
      setState("expired");
      cleanupCountdown();
    }
  }

  function handleReset() {
    setState("idle");
    setSessionId(null);
    setPort(null);
    setRemainingSeconds(0);
    setErrorMessage(null);
    cleanupCountdown();
  }

  // ======================= RENDER =======================

  // Idle state — Duration picker + "Try Demo" button
  if (state === "idle") {
    return (
      <div className="space-y-3">
        {/* Duration selection */}
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Demo duration:</span>
          <div className="flex gap-1">
            {DURATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedDuration(opt.value)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                  selectedDuration === opt.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={startMutation.isPending}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary/5 text-sm font-medium text-primary transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
        >
          <Play className="h-4 w-4" />
          Try Demo ({selectedDuration} min)
        </button>
      </div>
    );
  }

  // Starting state — loading spinner
  if (state === "starting") {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4 text-primary" />
            Sandbox Demo
          </div>
          <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            Starting container...
          </div>
        </div>
        <div className="flex h-64 items-center justify-center bg-muted/30">
          <div className="text-center">
            <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">Spinning up sandbox...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This usually takes 5-15 seconds
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Running state — iframe with timer
  if (state === "running" && port) {
    const sandboxUrl = `http://localhost:${port}`;
    const isLowTime = remainingSeconds <= 30;

    return (
      <div className="rounded-xl border bg-card">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b px-4 py-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4 text-green-500" />
            <span>Live Demo — {moduleName}</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Timer */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-mono font-semibold ${
                isLowTime
                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                  : "bg-green-500/10 text-green-600 dark:text-green-400"
              }`}
            >
              <Clock className="h-3 w-3" />
              {formatTime(remainingSeconds)}
            </div>

            {/* Open in new tab */}
            <a
              href={sandboxUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="h-3 w-3" />
            </a>

            {/* Stop button */}
            <button
              onClick={handleStop}
              disabled={stopMutation.isPending}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-red-500 hover:bg-red-500/10"
              title="Stop demo"
            >
              {stopMutation.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Square className="h-3 w-3" />
              )}
              Stop
            </button>
          </div>
        </div>

        {/* Low time warning */}
        {isLowTime && (
          <div className="flex items-center gap-2 border-b bg-red-500/5 px-4 py-2 text-xs text-red-600 dark:text-red-400">
            <AlertTriangle className="h-3 w-3" />
            Demo expires in {formatTime(remainingSeconds)}. Purchase the module to deploy permanently.
          </div>
        )}

        {/* Iframe */}
        <div className="relative">
          <iframe
            src={sandboxUrl}
            className="h-[500px] w-full border-0"
            title={`${moduleName} sandbox demo`}
            sandbox="allow-scripts allow-forms allow-same-origin allow-popups"
          />
        </div>
      </div>
    );
  }

  // Expired state
  if (state === "expired") {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            Sandbox Demo
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-48 flex-col items-center justify-center bg-muted/30 text-center">
          <Clock className="mb-3 h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium">Demo Expired</p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            The sandbox container has been terminated. Purchase the module to deploy it permanently.
          </p>
          <button
            onClick={handleReset}
            disabled={startMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Failed state
  if (state === "failed") {
    return (
      <div className="rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Monitor className="h-4 w-4 text-red-500" />
            Sandbox Demo
          </div>
          <button
            onClick={handleReset}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex h-48 flex-col items-center justify-center bg-red-500/5 text-center">
          <AlertTriangle className="mb-3 h-8 w-8 text-red-500/50" />
          <p className="text-sm font-medium text-red-600 dark:text-red-400">Failed to Start Demo</p>
          {errorMessage && (
            <p className="mt-1 max-w-md text-xs text-muted-foreground">
              {errorMessage}
            </p>
          )}
          <button
            onClick={handleReset}
            disabled={startMutation.isPending}
            className="mt-4 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-xs font-medium hover:bg-muted"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return null;
}
