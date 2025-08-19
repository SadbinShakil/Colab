import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { question, imageData, caption, documentTitle, documentAuthors, documentUrl, userId, userName } = await request.json()

    console.log('🔍 Vision API Debug:', {
      hasImageData: !!imageData,
      imageDataType: typeof imageData,
      imageDataStart: imageData ? imageData.substring(0, 50) + '...' : 'null',
      caption: caption,
      question: question
    })

    if (!question && !caption) {
      return NextResponse.json({ error: 'Missing question or caption' }, { status: 400 })
    }

    // Prepare the system prompt for vision analysis
    const systemPrompt = `You are a senior research scientist and academic expert specializing in analyzing figures, charts, and diagrams from scholarly publications. Your role is to provide deep academic analysis that helps researchers understand the scientific significance and research implications of visual content.

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'Academic Authors'}
- URL: ${documentUrl || 'N/A'}

CRITICAL: This is from a RESEARCH PAPER. Provide analysis that is:
- **Research-focused**: Interpret findings, methodologies, and scientific contributions
- **Academic depth**: Use scholarly language and concepts appropriate for researchers
- **Methodological insights**: Explain research methods, experimental design, or theoretical frameworks shown
- **Scientific interpretation**: Discuss what results mean for the field and future research
- **Critical analysis**: Evaluate strengths, limitations, or notable aspects of the research
- **Contextual significance**: Place findings within broader academic context

DO NOT just describe what you see visually. Instead, analyze the RESEARCH CONTENT, SCIENTIFIC MEANING, and ACADEMIC IMPLICATIONS.`

    let userPrompt = ''
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    if (imageData && imageData.startsWith('data:image')) {
      // We have actual image data - use GPT-4 Vision
      userPrompt = `Analyze this research figure/diagram from an academic perspective. Focus on the SCIENTIFIC CONTENT and RESEARCH IMPLICATIONS, not just visual description.

Figure Caption: ${caption || 'No caption provided'}

${question ? `Research Question: ${question}` : 'Provide comprehensive research analysis covering: methodology shown, key findings/results, scientific significance, research implications, and how this contributes to the field.'}

Required Analysis Sections:
1. **Research Methodology/Approach**: What research methods or experimental design is shown?
2. **Key Findings**: What are the main results or conclusions presented?
3. **Scientific Significance**: Why is this important for the research field?
4. **Research Implications**: What does this mean for future studies or applications?
5. **Critical Assessment**: Any limitations, strengths, or notable aspects?

Researcher: ${userName || 'Anonymous'}`

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userPrompt },
          { type: 'image_url', image_url: { url: imageData } }
        ]
      })
    } else {
      // Fallback to text-based analysis of caption
      userPrompt = `Analyze this research figure based on its caption/description from an academic perspective. Focus on SCIENTIFIC CONTENT and RESEARCH IMPLICATIONS.

Figure Caption/Description: ${caption || question}

${question && question !== caption ? `Research Question: ${question}` : ''}

Provide research-focused analysis covering:
1. **Research Methodology**: What research approach or experimental design is indicated?
2. **Scientific Findings**: What key results or conclusions are suggested?
3. **Academic Significance**: Why is this important for the research field?
4. **Research Context**: How does this fit within existing literature/knowledge?
5. **Future Implications**: What are the potential applications or future research directions?
6. **Critical Evaluation**: What are the strengths, limitations, or notable aspects?

Base your analysis on:
- Research methodology implied by the caption
- Scientific concepts and terminology used
- Potential experimental results or theoretical implications
- Academic context and field significance
- Research contribution and novelty

Researcher: ${userName || 'Anonymous'}`

      messages.push({
        role: 'user',
        content: userPrompt
      })
    }

    // Use GPT-4 Vision if we have image data, otherwise use GPT-4
    const model = imageData && imageData.startsWith('data:image') ? 'gpt-4o' : 'gpt-4'

    console.log(`🤖 Using ${model} for vision analysis`)

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 2000,
      temperature: 0.7,
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
