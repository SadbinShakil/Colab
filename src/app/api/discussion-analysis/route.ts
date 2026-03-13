import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface ChatMessage {
  userId: string
  userName: string
  content: string
  timestamp: number
}

export async function POST(request: NextRequest) {
  try {
    const {
      messages,
      documentTitle,
      documentContent,
      analysisType = 'insights'
    }: {
      messages: ChatMessage[]
      documentTitle?: string
      documentContent?: string
      analysisType?: 'insights' | 'summary' | 'gaps' | 'consensus'
    } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      const demoResponses: Record<string, string> = {
        insights: `**Key Insights from Discussion**\n\n• The group engaged with the core methodology and raised thoughtful questions about applicability\n• Several participants connected the paper's approach to prior work in the field\n• The experimental design section generated the most discussion\n\n**Open Questions**\n• How does this scale to larger datasets?\n• What are the reproducibility implications?\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        summary: `**Discussion Summary**\n\n• Team covered the abstract, methodology, and results sections\n• General agreement on the paper's main contribution\n• Some uncertainty around the evaluation metrics used\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        gaps: `**Knowledge Gaps Identified**\n\n• The statistical significance of results was not discussed\n• Background on related work (cited papers) wasn't explored\n• Limitations section deserves more attention\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        consensus: `**Team Consensus**\n\n• Main contribution: A novel approach that advances the state of the art\n• Methodology: Sound experimental design with clear baselines\n• Limitations: Acknowledged by the authors; scope is reasonable\n• Overall: Worth reading in full; relevant to the team's research\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`
      }
      return NextResponse.json({
        success: true,
        analysis: demoResponses[analysisType] || demoResponses.insights,
        analysisType,
        participantCount: new Set(messages.map(m => m.userId)).size,
        messageCount: messages.length,
        timestamp: new Date().toISOString()
      })
    }

    const conversationText = messages
      .map(m => `[${m.userName}]: ${m.content}`)
      .join('\n')

    const participantNames = [...new Set(messages.map(m => m.userName))].join(', ')

    let systemPrompt = ''
    let userPrompt = ''

    if (analysisType === 'insights') {
      systemPrompt = `You are an expert research discussion analyst. Analyze collaborative conversations between researchers reading academic papers and extract actionable insights.

Focus on:
- Key concepts or terms the group collectively understands or is confused about
- Important questions raised that deserve deeper exploration
- Connections made between the paper and other work
- Misconceptions that may need correction
- Moments of genuine insight or understanding

Be specific and direct. Reference actual things people said.`

      userPrompt = `Analyze this collaborative discussion about "${documentTitle || 'a research paper'}".

Participants: ${participantNames}

Discussion:
${conversationText}

${documentContent ? `Paper Context:\n${documentContent.substring(0, 2000)}` : ''}

Extract:
1. Key insights or "aha moments" from the discussion
2. Open questions the group raised
3. Concepts the group understood well
4. Areas of confusion or disagreement
5. Most valuable contributions from each participant

Keep it concise and actionable.`

    } else if (analysisType === 'summary') {
      systemPrompt = `You are a research discussion summarizer. Create clear, structured summaries of academic paper discussions.`

      userPrompt = `Summarize this collaborative reading discussion about "${documentTitle || 'a research paper'}".

Discussion:
${conversationText}

Provide:
- 3-5 bullet points of the main discussion themes
- Key conclusions or agreements reached
- Any unresolved questions`

    } else if (analysisType === 'gaps') {
      systemPrompt = `You are an academic discussion analyst specializing in identifying knowledge gaps and misunderstandings in research paper discussions.`

      userPrompt = `Review this discussion about "${documentTitle || 'a research paper'}" and identify:

Discussion:
${conversationText}

${documentContent ? `Paper Content:\n${documentContent.substring(0, 2000)}` : ''}

1. Misunderstandings or incorrect interpretations
2. Important paper concepts not discussed yet
3. Questions that were raised but not answered
4. Areas where the group seems uncertain

Be specific. Quote the discussion when relevant.`

    } else if (analysisType === 'consensus') {
      systemPrompt = `You are a research moderator. Synthesize what a group of researchers collectively agreed upon after discussing a paper.`

      userPrompt = `Based on this discussion about "${documentTitle || 'a research paper'}", synthesize:

Discussion:
${conversationText}

1. What the group collectively agrees the paper's main contribution is
2. Shared understanding of the methodology
3. Common view on the paper's limitations
4. Group's overall assessment`
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1000,
      temperature: 0.4,
    })

    const analysis = completion.choices[0]?.message?.content || 'No analysis generated'

    return NextResponse.json({
      success: true,
      analysis,
      analysisType,
      participantCount: new Set(messages.map(m => m.userId)).size,
      messageCount: messages.length,
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('[DISCUSSION ANALYSIS] Error:', error)
    return NextResponse.json(
      { error: 'Discussion analysis failed', details: String(error) },
      { status: 500 }
    )
  }
}
