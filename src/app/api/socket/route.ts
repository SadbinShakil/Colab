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

  // Handle different actions
  const action = body?.action || "none"
  
  try {
    switch (action) {
      case 'update-activity':
        // Handle activity updates
        const { documentId, userId, activity } = body
        if (documentId && userId && activity) {
          // In a real app, you'd store this in a database
          console.log(`📊 Activity update: User ${userId} is ${activity} on document ${documentId}`)
          return NextResponse.json({
            success: true,
            message: "Activity updated",
            data: { documentId, userId, activity },
            timestamp: new Date().toISOString()
          })
        } else {
          return NextResponse.json(
            { success: false, error: "Missing required fields for activity update" },
            { status: 400 }
          )
        }
      
      default:
        return NextResponse.json({
          success: true,
          received: body,
          actionHandled: action,
          timestamp: new Date().toISOString()
        })
    }
  } catch (error) {
    console.error("❌ Error processing socket request:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
} 