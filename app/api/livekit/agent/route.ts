export const runtime = "nodejs";

/**
 * Agent lifecycle is now handled by the standalone Python agent worker
 * (Assana-Agent-supabase/main.py) which auto-dispatches to rooms via
 * LiveKit's built-in agent dispatch. These routes are kept as lightweight
 * status endpoints.
 */

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";

  return Response.json({
    info: "Agent dispatch is handled by the Python LiveKit agent worker. No spawn needed.",
    roomId,
  });
}

export async function DELETE(request: Request) {
  const body = await request.json().catch(() => ({}));
  const roomId = typeof body?.roomId === "string" ? body.roomId.trim() : "";

  return Response.json({
    info: "Agent lifecycle is managed by the Python worker. No manual stop needed.",
    roomId,
  });
}
