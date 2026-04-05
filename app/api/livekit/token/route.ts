import { AccessToken } from "livekit-server-sdk";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const room = url.searchParams.get("room") || "default-room";
  const identity = url.searchParams.get("identity") || `user-${Date.now()}`;
  const name = url.searchParams.get("name") || "Guest";

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const livekitUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !livekitUrl) {
    return Response.json(
      { error: "Missing LIVEKIT_URL / LIVEKIT_API_KEY / LIVEKIT_API_SECRET" },
      { status: 500 }
    );
  }

  const at = new AccessToken(apiKey, apiSecret, { identity, name });
  at.addGrant({
    roomJoin: true,
    room,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return Response.json({
    token,
    url: livekitUrl,
    room,
    identity,
    name,
  });
}