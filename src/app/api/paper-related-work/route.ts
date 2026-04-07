import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: NextRequest) {
  try {
    const { paperText, paperTitle, paperAuthors, paperVenue, paperYear } = await request.json()
    if (!paperText) return NextResponse.json({ error: 'paperText is required' }, { status: 400 })

    const prompt = `You are a senior researcher with expertise in bibliometric analysis and academic literature. Produce a DEEP related work analysis of the paper below — go far beyond "similar papers". Trace the intellectual genealogy, map the competitive landscape, assess the research gap rigorously, and give a critical peer-review-level assessment.

PAPER METADATA:
Title: ${paperTitle || 'Unknown'}
Authors: ${paperAuthors || 'Unknown'}
Venue: ${paperVenue || 'Unknown'}  Year: ${paperYear || 'Unknown'}

PAPER TEXT:
${paperText.slice(0, 14000)}

Return JSON with this exact structure. All paper titles must be real published work. Be analytically rigorous — a senior researcher should find this useful, not superficial.

{
  "positioning": {
    "problemStatement": "the exact technical problem — one precise sentence",
    "priorStateOfArt": "what was the best known solution BEFORE this paper and what its key limitations were",
    "keyInnovation": "the single most important technical or methodological novelty — be specific",
    "claims": ["the main claims this paper makes that can be evaluated empirically or theoretically"],
    "scope": "what is explicitly in scope and out of scope for this paper",
    "paradigm": "the broader research paradigm this paper operates within (e.g. 'discriminative deep learning', 'Bayesian non-parametrics')"
  },
  "intellectualLineage": {
    "directAncestors": [
      {
        "title": "real paper title",
        "authors": "author names",
        "year": "year",
        "venue": "venue",
        "contribution": "what this ancestor established",
        "howUsed": "exactly how the current paper extends, applies, or modifies it",
        "limitationOvercome": "what limitation of this ancestor the current paper addresses"
      }
    ],
    "seminalFoundations": [
      {
        "title": "real seminal paper",
        "authors": "authors",
        "year": "year",
        "why": "why this is a foundational work — what principle or technique it established that this field depends on"
      }
    ],
    "researchThread": "narrative description of how this line of research evolved from its origins to this paper (3-5 sentences)"
  },
  "competingApproaches": [
    {
      "approach": "name of competing method/paradigm",
      "representativePaper": "real paper title",
      "authors": "authors",
      "year": "year",
      "coreIdea": "what this approach fundamentally does differently",
      "technicalDifference": "specific technical contrast with the current paper",
      "whenBetter": "scenarios where this approach outperforms the current paper",
      "whenWorse": "scenarios where the current paper outperforms this approach",
      "hybridPotential": "whether combining both approaches has been or could be explored"
    }
  ],
  "researchGap": {
    "gapAddressed": "the specific gap — why it mattered that this gap existed",
    "whyGapExisted": "technical or conceptual barrier that prevented prior work from closing this gap",
    "evidenceOfGap": "how the authors demonstrate the gap exists (benchmark, theorem, user study, etc.)",
    "remainingGaps": [
      {
        "gap": "specific remaining gap",
        "difficulty": "why it is hard to close",
        "possibleApproach": "one plausible direction to address it"
      }
    ],
    "futureDirections": [
      {
        "direction": "concrete research direction",
        "prerequisite": "what would need to be true/built first",
        "potentialImpact": "why this direction matters"
      }
    ]
  },
  "criticalAssessment": {
    "strengths": [
      {
        "strength": "specific technical or methodological strength",
        "evidence": "what in the paper supports this"
      }
    ],
    "weaknesses": [
      {
        "weakness": "specific limitation",
        "severity": "Minor | Moderate | Major",
        "mitigation": "how the authors address it (if at all)"
      }
    ],
    "assumptions": ["implicit assumptions the work relies on that are not always stated"],
    "reproducibility": {
      "rating": "Easy | Moderate | Difficult | Very Difficult",
      "reasons": ["specific reasons for this rating"],
      "blockers": ["what would prevent reproduction — missing code, data, compute requirements"]
    },
    "validityThreats": ["threats to internal or external validity of the claims"],
    "impactAssessment": {
      "shortTerm": "likely impact in the next 2 years",
      "longTerm": "likely impact in 5-10 years",
      "fieldsThatWillAdopt": ["fields beyond the primary one that will use this work"],
      "citationTrajectory": "prediction of citation pattern (high early / slow burn / niche)"
    }
  },
  "citationLandscape": {
    "likelyCitedBy": [
      {
        "type": "type of future work",
        "reason": "why they would cite this"
      }
    ],
    "shouldBeReadWith": [
      {
        "title": "real paper title",
        "authors": "authors",
        "year": "year",
        "reason": "specific reason why reading both together is valuable — what each contributes that the other lacks"
      }
    ],
    "controversialClaims": ["claims that the research community may contest and why"],
    "workshopVsJournal": "assessment of whether this is incremental workshop-level or significant venue-level contribution"
  },
  "applicationDomains": [
    {
      "domain": "domain name",
      "applicability": "High | Medium | Low",
      "whyRelevant": "specific technical reason the methods transfer",
      "adaptationsNeeded": "what would need to change to apply in this domain",
      "representativePaper": "a real paper applying related ideas here"
    }
  ]
}`

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.15,
      max_tokens: 4500,
    })

    const result = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ success: true, ...result })
  } catch (error: any) {
    console.error('[paper-related-work]', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
