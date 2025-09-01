// src/app/api/socket/route.ts
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  let body: any = {}

  // ✅ Only parse JSON if there's a non-empty body
  if (req.headers.get("content-type")?.includes("application/json")) {
    const raw = await req.text() // read as plain text first
    if (raw.trim().length > 0) {
      try {
        body = JSON.parse(raw)
      } catch (err) {
        console.error("❌ JSON parse error:", err)
        return NextResponse.json(
          { success: false, error: "Invalid JSON body" },
          { status: 400 }
        )
      }
    } else {
      console.warn("⚠️ Empty JSON body received at /api/socket")
    }
  } else {
    console.warn("⚠️ No JSON body sent to /api/socket")
  }

  // ✅ Example handling
  const action = body?.action || "none"
  return NextResponse.json({
    success: true,
    received: body,
    actionHandled: action,
    timestamp: new Date().toISOString()
  })
} 