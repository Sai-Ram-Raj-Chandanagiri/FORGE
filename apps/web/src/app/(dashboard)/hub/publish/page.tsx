"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Info,
  Check,
  Loader2,
  Upload,
  GitBranch,
  Hammer,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileCode2,
  Globe,
} from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { trpc } from "@/lib/trpc-client";

type Step = "metadata" | "source" | "build" | "review";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "metadata", label: "Module Info", icon: Info },
  { id: "source", label: "Source Config", icon: GitBranch },
  { id: "build", label: "Build & Validate", icon: Hammer },
  { id: "review", label: "Review & Submit", icon: Check },
];

const MODULE_TYPES = [
  { value: "SINGLE_CONTAINER", label: "Single Container", desc: "A single Docker container" },
  { value: "MULTI_CONTAINER", label: "Multi Container", desc: "Multiple containers via Docker Compose" },
] as const;

const PRICING_MODELS = [
  { value: "FREE", label: "Free" },
  { value: "ONE_TIME", label: "One-Time Purchase" },
  { value: "SUBSCRIPTION_MONTHLY", label: "Monthly Subscription" },
  { value: "SUBSCRIPTION_YEARLY", label: "Yearly Subscription" },
  { value: "USAGE_BASED", label: "Usage-Based" },
] as const;

type SourceMode = "repo" | "image";

export default function PublishModulePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("metadata");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state — Step 1: Metadata
  const [name, setName] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"SINGLE_CONTAINER" | "MULTI_CONTAINER">("SINGLE_CONTAINER");
  const [pricingModel, setPricingModel] = useState<string>("FREE");
  const [price, setPrice] = useState("");
  const [tags, setTags] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [website, setWebsite] = useState("");

  // Form state — Step 2: Source Configuration
  const [sourceMode, setSourceMode] = useState<SourceMode>("repo");
  const [sourceRepoUrl, setSourceRepoUrl] = useState("");
  const [sourceBranch, setSourceBranch] = useState("main");
  const [exposedPort, setExposedPort] = useState("3000");
  const [healthCheckPath, setHealthCheckPath] = useState("/");
  const [requiredEnvVars, setRequiredEnvVars] = useState("");
  const [dockerImage, setDockerImage] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");

  // Auto-detection state
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [detectedFramework, setDetectedFramework] = useState<string | null>(null);
  const [hasDockerfile, setHasDockerfile] = useState(false);
  const [dockerfileContent, setDockerfileContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  // Build state — Step 3
  const [createdVersionId, setCreatedVersionId] = useState<string | null>(null);
  const [buildStatus, setBuildStatus] = useState<string | null>(null);
  const [buildLogs, setBuildLogs] = useState("");

  // Categories
  const { data: categories } = trpc.store.getCategories.useQuery() as {
    data: { id: string; name: string; slug: string; children: unknown[]; _count: { modules: number } }[] | undefined;
  };
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  // Mutations
  const createModule = trpc.module.create.useMutation();
  const createVersion = trpc.module.createVersion.useMutation();
  const detectProject = trpc.module.detectProject.useMutation();
  const buildFromRepo = trpc.module.buildFromRepo.useMutation();
  const buildWithCustomDockerfile = trpc.module.buildWithCustomDockerfile.useMutation();

  // Build status polling
  const buildStatusQuery = trpc.module.getBuildStatus.useQuery(
    { versionId: createdVersionId! },
    {
      enabled: !!createdVersionId && (buildStatus === "building" || buildStatus === "pending"),
      refetchInterval: 3000,
    },
  ) as { data: { buildStatus: string | null; buildLogs: string | null; builtImageTag: string | null } | undefined };

  useEffect(() => {
    if (buildStatusQuery.data) {
      const status = buildStatusQuery.data.buildStatus;
      if (status) setBuildStatus(status);
      if (buildStatusQuery.data.buildLogs) setBuildLogs(buildStatusQuery.data.buildLogs);
    }
  }, [buildStatusQuery.data]);

  function toggleCategory(categoryId: string) {
    setSelectedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((c) => c !== categoryId) : [...prev, categoryId],
    );
  }

  function validateMetadata(): boolean {
    const newErrors: Record<string, string> = {};
    if (name.length < 2) newErrors.name = "Name must be at least 2 characters";
    if (shortDescription.length < 10)
      newErrors.shortDescription = "Short description must be at least 10 characters";
    if (description.length < 50)
      newErrors.description = "Description must be at least 50 characters";
    if (selectedCategories.length === 0)
      newErrors.categories = "Select at least one category";
    if (pricingModel !== "FREE" && (!price || parseFloat(price) <= 0))
      newErrors.price = "Price is required for paid modules";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validateSource(): boolean {
    const newErrors: Record<string, string> = {};
    if (!version.match(/^\d+\.\d+\.\d+$/))
      newErrors.version = "Version must be in semver format (e.g., 1.0.0)";

    if (sourceMode === "repo") {
      if (!sourceRepoUrl) newErrors.sourceRepoUrl = "Repository URL is required";
      if (!exposedPort || parseInt(exposedPort) < 1 || parseInt(exposedPort) > 65535)
        newErrors.exposedPort = "Port must be between 1 and 65535";
      if (!healthCheckPath.startsWith("/"))
        newErrors.healthCheckPath = "Health check path must start with /";
    } else {
      if (!dockerImage) newErrors.dockerImage = "Docker image is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleDetectProject = useCallback(async () => {
    if (!sourceRepoUrl) return;

    setDetectionError(null);
    setDetectedType(null);
    setDetectedFramework(null);

    try {
      const result = await detectProject.mutateAsync({
        repoUrl: sourceRepoUrl,
        branch: sourceBranch || "main",
      });

      if ("error" in result && result.error) {
        setDetectionError(result.error as string);
        return;
      }

      setDetectedType(result.type);
      setDetectedFramework(("framework" in result ? result.framework : null) || null);
      setHasDockerfile(result.hasDockerfile);

      if (result.hasDockerfile && result.existingDockerfile) {
        setDockerfileContent(result.existingDockerfile);
      } else if (result.generatedDockerfile) {
        setDockerfileContent(result.generatedDockerfile);
      }

      // Auto-set port from detection
      const detectedPort = "port" in result ? result.port : undefined;
      if (detectedPort) {
        setExposedPort(detectedPort.toString());
      }
    } catch {
      setDetectionError("Failed to detect project. Check the URL and try again.");
    }
  }, [sourceRepoUrl, sourceBranch, detectProject]);

  function goNext() {
    if (currentStep === "metadata" && validateMetadata()) {
      setCurrentStep("source");
    } else if (currentStep === "source" && validateSource()) {
      setCurrentStep("build");
    } else if (currentStep === "build") {
      if (sourceMode === "image" || buildStatus === "success") {
        setCurrentStep("review");
      }
    }
  }

  function goBack() {
    if (currentStep === "source") setCurrentStep("metadata");
    if (currentStep === "build") setCurrentStep("source");
    if (currentStep === "review") setCurrentStep("build");
  }

  async function handleCreateAndBuild() {
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      // Parse KEY=VALUE pairs (one per line) into a JSON object
      const envVarMap: Record<string, string> = {};
      requiredEnvVars
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .forEach((line) => {
          const eqIdx = line.indexOf("=");
          if (eqIdx > 0) {
            const key = line.slice(0, eqIdx).trim();
            const value = line.slice(eqIdx + 1).trim();
            envVarMap[key] = value;
          }
        });

      // 1. Create the module
      const module = await createModule.mutateAsync({
        name,
        shortDescription,
        description,
        type,
        pricingModel: pricingModel as "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED",
        price: price ? parseFloat(price) : undefined,
        categoryIds: selectedCategories,
        tags: tagList,
        repositoryUrl: repositoryUrl || sourceRepoUrl || undefined,
        documentationUrl: documentationUrl || undefined,
        website: website || undefined,
      });

      // 2. Create the version with build pipeline data
      const slugForImage = name.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-");
      const versionRecord = await createVersion.mutateAsync({
        moduleId: module.id,
        version,
        dockerImage: sourceMode === "repo" ? `forge-modules/${slugForImage}:${version}` : dockerImage,
        changelog: changelog || undefined,
        sourceRepoUrl: sourceMode === "repo" ? sourceRepoUrl : undefined,
        sourceBranch: sourceMode === "repo" ? sourceBranch : undefined,
        exposedPort: parseInt(exposedPort) || 80,
        healthCheckPath: healthCheckPath || "/",
        requiredEnvVars: Object.keys(envVarMap).length > 0 ? envVarMap : undefined,
      });

      setCreatedVersionId(versionRecord.id);

      if (sourceMode === "repo") {
        // 3. Trigger build
        setBuildStatus("building");
        if (isEditing && dockerfileContent) {
          await buildWithCustomDockerfile.mutateAsync({
            versionId: versionRecord.id,
            customDockerfile: dockerfileContent,
          });
        } else {
          await buildFromRepo.mutateAsync({
            versionId: versionRecord.id,
          });
        }
      } else {
        // Direct image mode — skip build
        setBuildStatus("success");
      }
    } catch {
      setBuildStatus("failed");
    }
  }

  async function handleSubmit() {
    router.push("/hub/submissions");
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <BackButton fallback="/hub" label="Back" />

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Upload className="h-7 w-7 text-primary" />
          Publish a Module
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and publish a new module to the FORGE Store.
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
                i < currentStepIndex
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : i === currentStepIndex
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              <step.icon className="h-3.5 w-3.5" />
              {step.label}
            </div>
          </div>
        ))}
      </div>

      {/* Step 1: Metadata */}
      {currentStep === "metadata" && (
        <div className="space-y-5 rounded-xl border bg-card p-6">
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Module Name <span className="text-destructive">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CRM Contact Manager"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Short Description <span className="text-destructive">*</span>
            </label>
            <input
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="Brief summary (10-200 characters)"
              maxLength={200}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <div className="flex justify-between">
              {errors.shortDescription && (
                <p className="text-xs text-destructive">{errors.shortDescription}</p>
              )}
              <p className="ml-auto text-xs text-muted-foreground">{shortDescription.length}/200</p>
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Full Description <span className="text-destructive">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of your module (supports Markdown)..."
              rows={6}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description}</p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Module Type</label>
            <div className="grid gap-2 sm:grid-cols-2">
              {MODULE_TYPES.map((mt) => (
                <button
                  key={mt.value}
                  type="button"
                  onClick={() => setType(mt.value)}
                  className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                    type === mt.value
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted"
                  }`}
                >
                  <p className="font-medium">{mt.label}</p>
                  <p className="text-xs text-muted-foreground">{mt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Pricing Model</label>
              <select
                value={pricingModel}
                onChange={(e) => setPricingModel(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {PRICING_MODELS.map((pm) => (
                  <option key={pm.value} value={pm.value}>
                    {pm.label}
                  </option>
                ))}
              </select>
            </div>

            {pricingModel !== "FREE" && (
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Price (USD) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Categories <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategories.includes(cat.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "hover:bg-muted"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
            {errors.categories && (
              <p className="text-xs text-destructive">{errors.categories}</p>
            )}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Tags (comma-separated)</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., crm, contacts, management"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Documentation URL</label>
              <input
                value={documentationUrl}
                onChange={(e) => setDocumentationUrl(e.target.value)}
                placeholder="https://docs.example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Website</label>
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Source Configuration */}
      {currentStep === "source" && (
        <div className="space-y-5 rounded-xl border bg-card p-6">
          {/* Source Mode Toggle */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">How do you want to provide your module?</label>
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSourceMode("repo")}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  sourceMode === "repo" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4" />
                  <p className="font-medium">GitHub Repository</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  FORGE clones and builds your image from source
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSourceMode("image")}
                className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                  sourceMode === "image" ? "border-primary bg-primary/5" : "hover:bg-muted"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  <p className="font-medium">Docker Image</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Provide a pre-built image from Docker Hub / GHCR
                </p>
              </button>
            </div>
          </div>

          {/* Version */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Version <span className="text-destructive">*</span>
            </label>
            <input
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.version && <p className="text-xs text-destructive">{errors.version}</p>}
          </div>

          {sourceMode === "repo" ? (
            <>
              {/* Repo URL + Branch */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="col-span-2 grid gap-2">
                  <label className="text-sm font-medium">
                    Repository URL <span className="text-destructive">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      value={sourceRepoUrl}
                      onChange={(e) => setSourceRepoUrl(e.target.value)}
                      placeholder="https://github.com/user/my-module"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={handleDetectProject}
                      disabled={!sourceRepoUrl || detectProject.isPending}
                      className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
                    >
                      {detectProject.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Globe className="h-3.5 w-3.5" />
                      )}
                      Detect
                    </button>
                  </div>
                  {errors.sourceRepoUrl && (
                    <p className="text-xs text-destructive">{errors.sourceRepoUrl}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Branch</label>
                  <input
                    value={sourceBranch}
                    onChange={(e) => setSourceBranch(e.target.value)}
                    placeholder="main"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>

              {/* Detection Result */}
              {detectionError && (
                <div className="flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{detectionError}</span>
                </div>
              )}

              {detectedType && detectedType !== "unknown" && (
                <div className="flex items-start gap-2 rounded-lg bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <span className="font-medium">
                      Detected: {detectedType}
                      {detectedFramework ? ` (${detectedFramework})` : ""}
                    </span>
                    {hasDockerfile && <span className="ml-2 text-xs opacity-75">Dockerfile found</span>}
                    {!hasDockerfile && <span className="ml-2 text-xs opacity-75">Dockerfile auto-generated</span>}
                  </div>
                </div>
              )}

              {detectedType === "unknown" && !detectionError && (
                <div className="flex items-start gap-2 rounded-lg bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    Could not auto-detect project type. Write a Dockerfile below or add one to your repository.
                  </span>
                </div>
              )}

              {/* Dockerfile Editor */}
              {dockerfileContent && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium">
                      <FileCode2 className="h-4 w-4" />
                      {hasDockerfile ? "Dockerfile (from repo)" : "Generated Dockerfile"}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsEditing(!isEditing)}
                      className="text-xs text-primary hover:underline"
                    >
                      {isEditing ? "Lock" : "Edit"}
                    </button>
                  </div>
                  <textarea
                    value={dockerfileContent}
                    onChange={(e) => setDockerfileContent(e.target.value)}
                    readOnly={!isEditing}
                    rows={12}
                    className={`w-full rounded-md border bg-zinc-950 px-3 py-2 font-mono text-xs text-green-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      !isEditing ? "cursor-default opacity-80" : ""
                    }`}
                  />
                </div>
              )}

              {/* Port + Health Path */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">
                    Exposed Port <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    value={exposedPort}
                    onChange={(e) => setExposedPort(e.target.value)}
                    placeholder="3000"
                    min="1"
                    max="65535"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.exposedPort && <p className="text-xs text-destructive">{errors.exposedPort}</p>}
                  <p className="text-xs text-muted-foreground">The port your app listens on inside the container</p>
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Health Check Path</label>
                  <input
                    value={healthCheckPath}
                    onChange={(e) => setHealthCheckPath(e.target.value)}
                    placeholder="/"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  {errors.healthCheckPath && <p className="text-xs text-destructive">{errors.healthCheckPath}</p>}
                  <p className="text-xs text-muted-foreground">HTTP path used to verify the container is healthy</p>
                </div>
              </div>

              {/* Required Env Vars */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">Environment Variables (KEY=VALUE, one per line)</label>
                <textarea
                  value={requiredEnvVars}
                  onChange={(e) => setRequiredEnvVars(e.target.value)}
                  placeholder={"DATABASE_URL=postgresql://postgres:password@localhost:5432/mydb\nSESSION_SECRET=change-me\nNODE_ENV=production"}
                  rows={4}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  These values are injected into sandbox demos and deployments. Use KEY=VALUE format, one per line.
                  For database URLs, use <code className="text-xs">localhost</code> — FORGE auto-maps it for containers.
                </p>
              </div>
            </>
          ) : (
            <>
              {/* Direct Docker Image */}
              <div className="grid gap-2">
                <label className="text-sm font-medium">
                  Docker Image <span className="text-destructive">*</span>
                </label>
                <input
                  value={dockerImage}
                  onChange={(e) => setDockerImage(e.target.value)}
                  placeholder="e.g., myorg/crm:1.0.0 or ghcr.io/org/module:latest"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                {errors.dockerImage && (
                  <p className="text-xs text-destructive">{errors.dockerImage}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The Docker image that FORGE Link will pull and deploy.
                </p>
              </div>

              {/* Port + Health Path for image mode */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Exposed Port</label>
                  <input
                    type="number"
                    value={exposedPort}
                    onChange={(e) => setExposedPort(e.target.value)}
                    placeholder="80"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">Health Check Path</label>
                  <input
                    value={healthCheckPath}
                    onChange={(e) => setHealthCheckPath(e.target.value)}
                    placeholder="/"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            </>
          )}

          {/* Changelog */}
          <div className="grid gap-2">
            <label className="text-sm font-medium">Changelog</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What's new in this version..."
              rows={3}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Step 3: Build & Validate */}
      {currentStep === "build" && (
        <div className="space-y-5 rounded-xl border bg-card p-6">
          {!buildStatus && (
            <div className="text-center">
              <Hammer className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-3 text-lg font-semibold">
                {sourceMode === "repo" ? "Build Your Module" : "Create Module Version"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {sourceMode === "repo"
                  ? "FORGE will clone your repository, build the Docker image, and validate it."
                  : "Your module version will be created with the provided Docker image."}
              </p>
              <button
                type="button"
                onClick={handleCreateAndBuild}
                disabled={createModule.isPending || createVersion.isPending || buildFromRepo.isPending}
                className="mt-4 inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
              >
                {(createModule.isPending || createVersion.isPending || buildFromRepo.isPending) ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Hammer className="h-4 w-4" />
                )}
                {sourceMode === "repo" ? "Start Build" : "Create Version"}
              </button>

              {(createModule.error || createVersion.error) && (
                <div className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {createModule.error?.message || createVersion.error?.message}
                </div>
              )}
            </div>
          )}

          {buildStatus === "building" && (
            <div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <h2 className="text-lg font-semibold">Building...</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                FORGE is cloning your repository and building the Docker image. This may take a few minutes.
              </p>
            </div>
          )}

          {buildStatus === "success" && (
            <div className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  {sourceMode === "repo" ? "Build Successful" : "Version Created"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {sourceMode === "repo"
                    ? "Your Docker image was built and validated successfully."
                    : "Your module version has been created."}
                </p>
              </div>
            </div>
          )}

          {buildStatus === "failed" && (
            <div>
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
                <div>
                  <h2 className="text-lg font-semibold text-destructive">Build Failed</h2>
                  <p className="text-sm text-muted-foreground">
                    The build encountered errors. Check the logs below for details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBuildStatus(null);
                  setBuildLogs("");
                }}
                className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-xs font-medium hover:bg-muted"
              >
                <RefreshCw className="h-3 w-3" />
                Go Back to Fix
              </button>
            </div>
          )}

          {/* Build Logs */}
          {buildLogs && (
            <div className="grid gap-2">
              <label className="text-sm font-medium">Build Logs</label>
              <pre className="max-h-80 overflow-auto rounded-md bg-zinc-950 p-3 font-mono text-xs text-green-400">
                {buildLogs}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {currentStep === "review" && (
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Review Your Module</h2>

          <div className="grid gap-3 text-sm">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{name}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Type</span>
              <span>{type === "SINGLE_CONTAINER" ? "Single Container" : "Multi Container"}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Pricing</span>
              <span>
                {pricingModel === "FREE"
                  ? "Free"
                  : `$${price} (${pricingModel.replace(/_/g, " ").toLowerCase()})`}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Version</span>
              <span className="font-mono">{version}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Source</span>
              <span className="max-w-[300px] truncate font-mono text-xs">
                {sourceMode === "repo" ? sourceRepoUrl : dockerImage}
              </span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Port</span>
              <span className="font-mono">{exposedPort}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Health Check</span>
              <span className="font-mono">{healthCheckPath}</span>
            </div>
            {sourceMode === "repo" && buildStatus === "success" && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Build</span>
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Passed
                </span>
              </div>
            )}
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Categories</span>
              <span>
                {selectedCategories.length > 0
                  ? categories
                      ?.filter((c) => selectedCategories.includes(c.id))
                      .map((c) => c.name)
                      .join(", ")
                  : "None"}
              </span>
            </div>
            {tags && (
              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Tags</span>
                <span>{tags}</span>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
            <p>
              Your module has been created{sourceMode === "repo" ? " and the image built successfully" : ""}.
              It is saved as a <strong>Draft</strong>. Submit it for review from the
              My Modules page. Once approved by an admin, it will be published to the FORGE Store.
            </p>
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          disabled={currentStep === "metadata"}
          className="inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium shadow-sm transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {currentStep === "review" ? (
          <button
            type="button"
            onClick={handleSubmit}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            <Package className="h-4 w-4" />
            Go to Submissions
          </button>
        ) : currentStep === "build" ? (
          <button
            type="button"
            onClick={goNext}
            disabled={sourceMode === "repo" && buildStatus !== "success"}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={goNext}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
