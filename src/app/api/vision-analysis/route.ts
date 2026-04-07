import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
         const { question, imageData, caption, documentTitle, documentAuthors, documentUrl, userId, userName, documentContent, isDetailedMode } = await request.json()

         console.log('🔍 Vision API Debug:', {
       hasImageData: !!imageData,
       imageDataType: typeof imageData,
       imageDataStart: imageData ? imageData.substring(0, 50) + '...' : 'null',
       caption: caption,
       question: question,
       hasDocumentContent: !!documentContent,
       documentContentLength: documentContent ? documentContent.length : 0,
       isDetailedMode: isDetailedMode
     })

    if (!question && !caption) {
      return NextResponse.json({ error: 'Missing question or caption' }, { status: 400 })
    }

    // PhD-level system prompt — consistent with ai-tutor and ai-help standards
    const systemPrompt = isDetailedMode
      ? `You are an embedded reading assistant for PhD-level academic paper analysis in CoRead.

Paper: "${documentTitle || 'Research Paper'}" by ${documentAuthors || 'the authors'}

Your ONLY source of truth is (1) what you can see in the image and (2) the document context provided. Do not introduce external knowledge not grounded in the paper.

Hard rules:
- Every interpretive claim must be traceable to either the visual content or the document text. Never fabricate data values, axis labels, or statistical results you cannot directly see or read.
- If a value or trend is ambiguous in the image, say so explicitly — do not guess.
- Do not soften critique. A PhD researcher wants the honest reading, not a diplomatic hedge.
- Quote the caption or relevant text verbatim when making claims about what the authors assert.
- No filler. No "great question." Start directly with the analysis.

Provide analysis in exactly this structure:
WHAT IT SHOWS: [What is visually depicted — axes, variables, conditions, data structure]
WHAT THE AUTHORS CLAIM: [What conclusion they draw from this — quote the caption/text]
CRITICAL READ: [Identify the strongest limitation, confound, or ambiguity in what is shown — is the scale cherry-picked? Is the baseline appropriate? Are error bars shown?]
CROSS-REFERENCE: [Where else in the paper does this result connect — which table/section validates or contradicts it?]`
      : `You are an embedded reading assistant for PhD-level academic paper analysis in CoRead.

Paper: "${documentTitle || 'Research Paper'}" by ${documentAuthors || 'the authors'}

Your ONLY source of truth is what you can see in the image and the document context provided.

Hard rules:
- Ground every claim in the visual content or document text. No fabrication.
- If values are ambiguous, say so. Do not guess.
- Be concise and precise. No filler.

Cover: what it shows, what the authors claim from it, and one specific limitation or ambiguity.`

    let userPrompt = ''
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    const captionBlock = caption ? `Caption/reference from paper: "${caption}"` : ''
    const contextBlock = documentContent ? `\nDocument context (use to verify claims and cross-references):\n${documentContent.substring(0, isDetailedMode ? 5000 : 2500)}` : ''
    const questionBlock = question ? `\nSpecific question from researcher: ${question}` : ''

    if (imageData && imageData.startsWith('data:image')) {
      // Actual image — use GPT-4o vision
      userPrompt = `${captionBlock}${contextBlock}${questionBlock}

Analyse this figure strictly per the system prompt structure. Quote the caption when asserting what the authors claim.`

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      })
    } else {
      // Text-only fallback — caption/description based
      userPrompt = `${captionBlock}${contextBlock}${questionBlock}

No image data available — analyse based on the caption and document context only. Be explicit that visual details are inferred from text, not directly observed.`

      messages.push({ role: 'user', content: userPrompt })
    }

    // Always use gpt-4o — consistent with rest of the system
    const model = 'gpt-4o'

    console.log(`🤖 Using ${model} for vision analysis`)

    const completion = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: isDetailedMode ? 900 : 400,
      temperature: 0.2,  // grounding — never creative, always traceable
    })

    const answer = completion.choices[0]?.message?.content || 'No analysis generated'

    console.log('✅ Vision analysis completed successfully')

    return NextResponse.json({
      success: true,
      response: {
        answer: answer,
        model: model,
        hasImageData: !!(imageData && imageData.startsWith('data:image')),
        analysisType: imageData && imageData.startsWith('data:image') ? 'vision-ai' : 'caption-based'
      }
    })

  } catch (error: any) {
    console.error('❌ Vision analysis error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to analyze image',
        success: false 
      }, 
      { status: 500 }
    )
  }
}
