"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Package,
  Info,
  Tag,
  Settings2,
  Check,
  Loader2,
  Upload,
} from "lucide-react";
import { trpc } from "@/lib/trpc-client";

type Step = "metadata" | "docker" | "review";

const STEPS: { id: Step; label: string; icon: React.ElementType }[] = [
  { id: "metadata", label: "Module Info", icon: Info },
  { id: "docker", label: "Docker Config", icon: Settings2 },
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

export default function PublishModulePage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("metadata");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
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

  // Docker config
  const [version, setVersion] = useState("1.0.0");
  const [dockerImage, setDockerImage] = useState("");
  const [changelog, setChangelog] = useState("");

  // Categories
  const { data: categories } = trpc.store.getCategories.useQuery() as {
    data: { id: string; name: string; slug: string; children: unknown[]; _count: { modules: number } }[] | undefined;
  };
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const createModule = trpc.module.create.useMutation();
  const createVersion = trpc.module.createVersion.useMutation();

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

  function validateDocker(): boolean {
    const newErrors: Record<string, string> = {};
    if (!version.match(/^\d+\.\d+\.\d+$/))
      newErrors.version = "Version must be in semver format (e.g., 1.0.0)";
    if (!dockerImage) newErrors.dockerImage = "Docker image is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function goNext() {
    if (currentStep === "metadata" && validateMetadata()) {
      setCurrentStep("docker");
    } else if (currentStep === "docker" && validateDocker()) {
      setCurrentStep("review");
    }
  }

  function goBack() {
    if (currentStep === "docker") setCurrentStep("metadata");
    if (currentStep === "review") setCurrentStep("docker");
  }

  async function handleSubmit() {
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const module = await createModule.mutateAsync({
        name,
        shortDescription,
        description,
        type,
        pricingModel: pricingModel as "FREE" | "ONE_TIME" | "SUBSCRIPTION_MONTHLY" | "SUBSCRIPTION_YEARLY" | "USAGE_BASED",
        price: price ? parseFloat(price) : undefined,
        categoryIds: selectedCategories,
        tags: tagList,
        repositoryUrl: repositoryUrl || undefined,
        documentationUrl: documentationUrl || undefined,
        website: website || undefined,
      });

      await createVersion.mutateAsync({
        moduleId: module.id,
        version,
        dockerImage,
        changelog: changelog || undefined,
      });

      router.push("/store/my-modules");
    } catch {
      // Error displayed by tRPC
    }
  }

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/hub"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Hub
      </Link>

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

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Repository URL</label>
              <input
                value={repositoryUrl}
                onChange={(e) => setRepositoryUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
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

      {/* Step 2: Docker Config */}
      {currentStep === "docker" && (
        <div className="space-y-5 rounded-xl border bg-card p-6">
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

          <div className="grid gap-2">
            <label className="text-sm font-medium">
              Docker Image <span className="text-destructive">*</span>
            </label>
            <input
              value={dockerImage}
              onChange={(e) => setDockerImage(e.target.value)}
              placeholder="e.g., forge/crm:1.0.0 or ghcr.io/org/module:latest"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {errors.dockerImage && (
              <p className="text-xs text-destructive">{errors.dockerImage}</p>
            )}
            <p className="text-xs text-muted-foreground">
              The Docker image reference that FORGE Link will pull and deploy.
            </p>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Changelog</label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="What's new in this version..."
              rows={4}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        </div>
      )}

      {/* Step 3: Review */}
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
              <span className="text-muted-foreground">Docker Image</span>
              <span className="font-mono text-xs">{dockerImage}</span>
            </div>
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
              After submission, your module will be saved as a <strong>Draft</strong>. You
              can submit it for review from the My Modules page. Once approved by an admin,
              it will be published to the FORGE Store.
            </p>
          </div>

          {(createModule.error || createVersion.error) && (
            <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {createModule.error?.message || createVersion.error?.message}
            </div>
          )}
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
            disabled={createModule.isPending || createVersion.isPending}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50"
          >
            {createModule.isPending || createVersion.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Package className="h-4 w-4" />
            )}
            Create Module
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
