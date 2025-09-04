import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { stuckHelpId, description, section, documentTitle, page } = body

    if (!description) {
      return NextResponse.json(
        { error: 'Description is required' },
        { status: 400 }
      )
    }

    // Create a comprehensive prompt for the AI
    const prompt = `You are an AI research assistant helping a researcher who is stuck while reading an academic paper. 

Context:
- Document: ${documentTitle}
- Section: ${section}
- Page: ${page}
- Problem: ${description}

The researcher is struggling with understanding this part of the paper. Please provide a helpful, clear explanation that:

1. Acknowledges their confusion and validates that it's a common challenge
2. Breaks down the complex concept into simpler parts
3. Provides concrete examples or analogies if helpful
4. Suggests related concepts or background knowledge they might need
5. Offers practical next steps for deeper understanding

Keep your response:
- Encouraging and supportive
- Academically rigorous but accessible
- Around 200-300 words
- Focused on helping them move forward

Response:`

    // For now, we'll use a mock AI response since we don't have an AI service configured
    // In a real implementation, you would call your AI service here
    const mockResponse = `I understand your confusion with this section - it's actually one of the more challenging concepts in this paper, and many researchers struggle with it initially.

Let me break this down step by step:

**What's happening here:** The authors are introducing a novel approach that combines several existing techniques in a way that hasn't been done before. The key insight is that they're applying [concept] to [domain] by using [method].

**Why it's confusing:** The mathematical notation and the way they present the results can be overwhelming. The core idea is simpler than it appears.

**Think of it like this:** Imagine [simple analogy related to the concept]. The paper is essentially saying that instead of [old approach], we can [new approach] because [reasoning].

**What you need to understand first:** Before diving deeper, make sure you're comfortable with:
- [Prerequisite concept 1]
- [Prerequisite concept 2]
- [Prerequisite concept 3]

**Next steps:**
1. Try implementing a simple version of this concept yourself
2. Look at the supplementary materials - they often have clearer explanations
3. Check if there are any tutorial papers or blog posts that explain this technique
4. Consider reaching out to the authors or posting in relevant academic forums

Remember, it's completely normal to get stuck on complex papers. Even experienced researchers spend significant time understanding novel approaches. Take your time, and don't hesitate to ask for clarification!`

    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000))

    return NextResponse.json({
      response: mockResponse,
      confidence: 0.85,
      sources: [
        'Paper supplementary materials',
        'Related tutorial papers',
        'Academic discussion forums'
      ]
    })

  } catch (error) {
    console.error('Error generating AI response:', error)
    return NextResponse.json(
      { error: 'Failed to generate AI response' },
      { status: 500 }
    )
  }
}
