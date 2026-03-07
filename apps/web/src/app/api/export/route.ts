/**
 * Export API — Streams a ZIP file of the composed platform project.
 * GET /api/export — Downloads the project as a ZIP file.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProjectExportService } from "@/server/services/project-export.service";
import JSZip from "jszip";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exportService = new ProjectExportService(prisma);
    const project = await exportService.exportProject(session.user.id);

    // Create ZIP
    const zip = new JSZip();
    for (const file of project.files) {
      zip.file(file.path, file.content);
    }

    const buffer = await zip.generateAsync({ type: "arraybuffer" });

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${project.name}.zip"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
