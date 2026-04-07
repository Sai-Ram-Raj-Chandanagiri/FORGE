import { TRPCError } from "@trpc/server";
import { type PrismaClient, Prisma } from "@forge/db";
import { logger } from "@/lib/logger";

export interface UpsertProfileInput {
  agentName?: string;
  avatarUrl?: string;
  personalityPreset?: "PROFESSIONAL" | "FRIENDLY" | "TECHNICAL" | "CUSTOM";
  tone?: string;
  customSystemPromptSuffix?: string;
  communicationTemplates?: Record<string, unknown>;
  organizationId?: string;
}

export interface ProfileResult {
  id: string;
  userId: string;
  organizationId: string | null;
  agentName: string;
  avatarUrl: string | null;
  personalityPreset: string;
  tone: string | null;
  customSystemPromptSuffix: string | null;
  communicationTemplates: unknown;
  createdAt: string;
  updatedAt: string;
}

const log = logger.forService("AgentProfileService");

const PERSONALITY_PROMPTS: Record<string, string> = {
  PROFESSIONAL:
    "Communicate in a formal, professional tone. Use precise and clear language. Maintain a respectful and business-appropriate demeanor.",
  FRIENDLY:
    "Communicate in a warm, friendly, and approachable tone. Be encouraging and supportive. Use conversational language while remaining helpful.",
  TECHNICAL:
    "Communicate with technical precision. Include specific details, metrics, and data where relevant. Prefer accuracy over simplicity.",
};

function sanitizeText(value: string | undefined, maxLength: number): string | undefined {
  if (value === undefined) return undefined;
  return value.replace(/[\x00-\x1F\x7F]/g, "").slice(0, maxLength);
}

function toProfileResult(profile: {
  id: string;
  userId: string;
  organizationId: string | null;
  agentName: string;
  avatarUrl: string | null;
  personalityPreset: string;
  tone: string | null;
  customSystemPromptSuffix: string | null;
  communicationTemplates: unknown;
  createdAt: Date;
  updatedAt: Date;
}): ProfileResult {
  return {
    id: profile.id,
    userId: profile.userId,
    organizationId: profile.organizationId,
    agentName: profile.agentName,
    avatarUrl: profile.avatarUrl,
    personalityPreset: profile.personalityPreset,
    tone: profile.tone,
    customSystemPromptSuffix: profile.customSystemPromptSuffix,
    communicationTemplates: profile.communicationTemplates,
    createdAt: profile.createdAt.toISOString(),
    updatedAt: profile.updatedAt.toISOString(),
  };
}

export class AgentProfileService {
  constructor(private prisma: PrismaClient) {}

  async getProfile(
    userId: string,
    organizationId?: string,
  ): Promise<ProfileResult | null> {
    if (organizationId) {
      const orgProfile = await this.prisma.agentProfile.findUnique({
        where: { userId_organizationId: { userId, organizationId } },
      });
      if (orgProfile) return toProfileResult(orgProfile);
    }

    const userProfile = await this.prisma.agentProfile.findFirst({
      where: { userId, organizationId: null },
    });
    if (!userProfile) return null;

    return toProfileResult(userProfile);
  }

  async upsertProfile(
    userId: string,
    data: UpsertProfileInput,
  ): Promise<ProfileResult> {
    const organizationId = data.organizationId ?? null;

    const agentName = data.agentName?.trim().slice(0, 100);
    const tone = sanitizeText(data.tone, 5000);
    const customSystemPromptSuffix = sanitizeText(
      data.customSystemPromptSuffix,
      5000,
    );
    const communicationTemplates = data.communicationTemplates
      ? (data.communicationTemplates as Prisma.InputJsonValue)
      : undefined;

    const updateData = {
      ...(agentName !== undefined && { agentName }),
      ...(data.avatarUrl !== undefined && { avatarUrl: data.avatarUrl }),
      ...(data.personalityPreset !== undefined && {
        personalityPreset: data.personalityPreset,
      }),
      ...(tone !== undefined && { tone }),
      ...(customSystemPromptSuffix !== undefined && {
        customSystemPromptSuffix,
      }),
      ...(communicationTemplates !== undefined && {
        communicationTemplates,
      }),
    };

    // Wrap lookup + create/update in a single transaction to prevent concurrent-write races
    const profile = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.agentProfile.findFirst({
        where: { userId, organizationId },
      });

      return existing
        ? tx.agentProfile.update({
            where: { id: existing.id },
            data: updateData,
          })
        : tx.agentProfile.create({
            data: {
              userId,
              organizationId,
              ...updateData,
            },
          });
    });

    log.info("Upserted agent profile", { userId, organizationId });
    return toProfileResult(profile);
  }

  async getSystemPromptSuffix(userId: string): Promise<string> {
    const profile = await this.prisma.agentProfile.findFirst({
      where: { userId, organizationId: null },
    });

    if (!profile) return "";

    const preset = profile.personalityPreset;
    let suffix: string;

    if (preset === "CUSTOM") {
      suffix = profile.tone ?? "";
    } else {
      suffix = (PERSONALITY_PROMPTS[preset] || PERSONALITY_PROMPTS["PROFESSIONAL"])!;
    }

    suffix += `\n\nYour name is ${profile.agentName}. Always identify yourself as ${profile.agentName} when asked.`;

    if (profile.customSystemPromptSuffix) {
      suffix += `\n\n${profile.customSystemPromptSuffix}`;
    }

    return suffix.slice(0, 2000);
  }

  async deleteProfile(userId: string, profileId: string): Promise<void> {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Agent profile not found",
      });
    }

    if (profile.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You do not own this agent profile",
      });
    }

    await this.prisma.agentProfile.delete({ where: { id: profileId } });
    log.info("Deleted agent profile", { userId, profileId });
  }
}
