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
      analysisType = 'unresolved'
    }: {
      messages: ChatMessage[]
      documentTitle?: string
      documentContent?: string
      analysisType?: 'divergence' | 'overreach' | 'unresolved' | 'consensus' | 'insights' | 'summary' | 'gaps'
    } = await request.json()

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'sk-your-openai-api-key-here') {
      const demoResponses: Record<string, string> = {
        divergence: `**Interpretive Divergence Map**\n\n• **Mechanism interpretation**: Reader A reads the D_s threshold as empirically calibrated; Reader B reads it as theoretically motivated — the authors claim both, but Table 2 only validates the former\n• **Scope disagreement**: The group disagreed whether the sample (N=12 sessions) supports the generalizability claim in the abstract\n• **Framing conflict**: "proactive" vs. "reactive-on-demand" — at least two participants interpreted the intervention timing differently\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        overreach: `**Evidence-to-Claim Gaps**\n\n• The abstract claims "timely intervention improves comprehension" — the discussion accepted this without noting it is based on self-report measures only, not objective comprehension tests\n• The group cited the 90.5% grounding pass rate as strong without questioning the validator's own error rate\n• The dismissal rate (4.8%) was interpreted as user satisfaction rather than selection bias (compliant participants only)\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        unresolved: `**Unresolved Claims from Discussion**\n\n• What happens to D_s when a reader is expert-fluent but deliberately rereads for citation purposes — should silence routing fire?\n• The group raised the tau_fire threshold (0.72) as potentially arbitrary but didn't resolve how it was derived\n• Agent 8 fact-checking was mentioned but its interaction with Agent 6's grounding validation was left unexamined\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        consensus: `**Reconstructed Shared Model**\n\n• **Contribution**: The group collectively agrees the core contribution is the D_s signal model and the three-tier routing (self → peer → group), not the UI\n• **Evidence**: The 63 interventions / 4.8% dismissal rate is considered suggestive but not conclusive without a comparison condition\n• **Open question the group accepts**: Whether the silence routing (14 suppressions) represents correct expert detection or a calibration artifact\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        // Legacy modes kept for backward compatibility
        insights: `**Key Insights from Discussion**\n\n• The group engaged with the core methodology and raised thoughtful questions about applicability\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        summary: `**Discussion Summary**\n\n• Team covered the main contribution and methodology\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
        gaps: `**Knowledge Gaps**\n\n• Statistical significance of results was not critically examined\n\n*Demo mode — add OPENAI_API_KEY for real analysis*`,
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

    if (analysisType === 'divergence') {
      systemPrompt = `You are analyzing a collaborative discussion among PhD researchers reading an academic paper. Your task: identify interpretive divergence — points where two or more readers reached different conclusions from the same text.

Rules:
- Only report genuine divergence in interpretation, not phrasing differences
- For each divergence, state what each position is and what textual evidence each position could claim
- Rate each divergence: 'surface' (about terminology), 'methodological' (about what the design actually shows), or 'fundamental' (about whether the core claim is supported)
- Do not report consensus masquerading as divergence
- PhD-level language. No hedging. Quote the discussion.`

      userPrompt = `Map the interpretive divergences in this discussion about "${documentTitle || 'a research paper'}".

Participants: ${participantNames}

Discussion:
${conversationText}

${documentContent ? `Paper text context:\n${documentContent.substring(0, 3000)}` : ''}

For each divergence found:
**Divergence [N]:** [the claim in contention]
**Position A** ([name]): [what they think it means]
**Position B** ([name]): [what they think it means]
**Type:** surface | methodological | fundamental
**What would resolve it:** [specific passage or additional evidence that would settle this]

If no genuine divergence exists, say so explicitly.`

    } else if (analysisType === 'overreach') {
      systemPrompt = `You are a critical reader analyzing a group discussion for evidence-to-claim gaps — instances where researchers accepted or endorsed a claim the paper's evidence does not fully support.

Rules:
- Only flag gaps that are genuinely present in the paper AND unaddressed in the discussion
- Be specific: quote the claim, state what evidence actually shows, and explain the inferential gap
- Rate each gap: 'minor' (small scope extension), 'moderate' (qualification needed), 'major' (conclusion not supported)
- Do not penalize researchers for discussing limitations they correctly identified`

      userPrompt = `Analyze this discussion for evidence-to-claim overreach.

Paper: "${documentTitle || 'a research paper'}"
Participants: ${participantNames}

Discussion:
${conversationText}

${documentContent ? `Paper text:\n${documentContent.substring(0, 3000)}` : ''}

For each overreach found:
**Overreach [N]:** [the accepted claim]
**What the evidence actually shows:** [what the data, N, or design actually supports]
**Gap severity:** minor | moderate | major
**Whether the group caught it:** yes | no | partially

End with a one-sentence assessment: did this group read critically, or did they accept the paper's framing without challenge?`

    } else if (analysisType === 'unresolved') {
      systemPrompt = `You are a research discussion facilitator identifying claims, questions, and tensions that arose in a group discussion but were never resolved or answered.

Rules:
- Only report genuinely unresolved items — not items that were resolved elsewhere in the thread
- Distinguish: (a) questions raised and dropped, (b) disagreements that ended without resolution, (c) claims made without evidence check
- For each, suggest the specific follow-up that would resolve it: a paper passage, a methodological check, or a peer who might know`

      userPrompt = `Identify unresolved claims and questions from this discussion about "${documentTitle || 'a research paper'}".

Participants: ${participantNames}

Discussion:
${conversationText}

For each unresolved item:
**Unresolved [N]:** [the question or claim]
**Raised by:** [who raised it]
**Why unresolved:** [dropped / contradictory responses / out of scope]
**What would resolve it:** [specific action — quote from paper, external reference, or methodological check]

Order by how much the unresolved item affects the group's understanding of the paper's core claim.`

    } else if (analysisType === 'consensus') {
      systemPrompt = `You are a research moderator reconstructing the shared mental model a group of PhD researchers built from a collaborative paper discussion.

Rules:
- Report only what the group collectively demonstrated understanding of — not what the paper says they should understand
- Distinguish: things explicitly agreed on, things implicitly accepted without challenge, and things that appeared consensual but may not be
- Flag any false consensus: agreement that masked an underlying divergence`

      userPrompt = `Reconstruct the shared understanding this group built from their discussion of "${documentTitle || 'a research paper'}".

Participants: ${participantNames}

Discussion:
${conversationText}

Report:
**Explicit consensus:** [claims all participants explicitly endorsed]
**Implicit consensus (unchallenged):** [claims nobody questioned — flag if these warrant scrutiny]
**False consensus (apparent agreement, real divergence):** [if any]
**Contribution framing agreed upon:** [how the group characterized the paper's main claim]
**Evaluation agreed upon:** [the group's collective verdict on evidence quality]

One-sentence bottom line: what mental model did this group leave with?`

    } else if (analysisType === 'insights') {
      // Legacy fallback
      systemPrompt = `You are a PhD-level research discussion analyst. Extract the most significant analytical insights from this academic paper discussion — not summaries, but genuine critical observations.`
      userPrompt = `Analyze this discussion about "${documentTitle || 'a research paper'}".\n\nParticipants: ${participantNames}\n\nDiscussion:\n${conversationText}\n\nExtract the 3 most analytically significant observations made. Quote the discussion. Rate each: empirical, theoretical, or methodological.`

    } else if (analysisType === 'summary' || analysisType === 'gaps') {
      // Legacy fallback
      systemPrompt = `You are a PhD-level research discussion analyst. Be precise, specific, and direct.`
      userPrompt = `Analyze this discussion about "${documentTitle || 'a research paper'}".\n\nParticipants: ${participantNames}\n\nDiscussion:\n${conversationText}\n\nProvide a structured critical analysis.`
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
