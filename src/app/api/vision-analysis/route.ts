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

         // Prepare the system prompt for vision analysis
     const systemPrompt = isDetailedMode 
       ? `You are a senior research scientist providing comprehensive figure analysis. Provide detailed, thorough explanations.

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'Academic Authors'}
- URL: ${documentUrl || 'N/A'}

${documentContent ? `Document Content Available: Use the paper text to provide comprehensive context and detailed analysis.` : ''}

Provide explanation that is:
- Comprehensive: Detailed analysis covering all aspects
- Technical: Include methodological and statistical details
- Contextual: Connect with broader research implications
- Accurate: Correct interpretation using visual and textual information

Provide detailed analysis of what the image shows and what it explains in the paper. Do not use markdown formatting like ** or *.`
       : `You are a research scientist explaining figures clearly. Provide brief, simple explanations.

Document Context:
- Title: ${documentTitle || 'Research Document'}
- Authors: ${documentAuthors || 'Academic Authors'}
- URL: ${documentUrl || 'N/A'}

${documentContent ? `Document Content Available: Use the paper text to provide accurate context.` : ''}

Provide explanation that is:
- Brief: Keep responses short and focused
- Clear: Simple, understandable language
- Accurate: Correct interpretation using visual and textual information

Explain what the image shows and what it explains in the paper. Do not use markdown formatting like ** or *.`

    let userPrompt = ''
    const messages: any[] = [
      { role: 'system', content: systemPrompt }
    ]

    if (imageData && imageData.startsWith('data:image')) {
      // We have actual image data - use GPT-4 Vision
             userPrompt = isDetailedMode
         ? `Provide comprehensive analysis of what this image shows and what it explains in the paper.

Figure Caption: ${caption || 'No caption provided'}

${documentContent ? `Document Context: ${documentContent.substring(0, 4000)}` : ''}

${question ? `Question: ${question}` : 'Provide detailed analysis of what this image is about and what it explains in the paper.'}

Provide comprehensive analysis covering:
1. What the image shows: Detailed description of visual elements
2. What it explains: Comprehensive explanation of what this demonstrates in the paper
3. Key findings: Detailed analysis of main revelations
4. Methodology: Technical details and experimental approach
5. Implications: Broader research implications and significance
6. Context: How this fits into the overall research

Provide thorough, detailed analysis. Do not use markdown formatting like ** or *.

Researcher: ${userName || 'Anonymous'}`
         : `Briefly explain what this image shows and what it explains in the paper.

Figure Caption: ${caption || 'No caption provided'}

${documentContent ? `Document Context: ${documentContent.substring(0, 2000)}` : ''}

${question ? `Question: ${question}` : 'Explain what this image is about and what it explains in the paper.'}

Provide a brief explanation covering:
1. What the image shows: Describe what you see
2. What it explains: What does this demonstrate in the paper
3. Key points: Main things this reveals

Keep it very brief and clear. Do not use markdown formatting like ** or *.

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
             userPrompt = isDetailedMode
         ? `Provide comprehensive analysis of what this image shows and what it explains in the paper.

Figure Caption/Description: ${caption || question}

${documentContent ? `Document Context: ${documentContent.substring(0, 4000)}` : ''}

${question && question !== caption ? `Question: ${question}` : ''}

Provide comprehensive analysis covering:
1. What the image shows: Detailed description of visual elements
2. What it explains: Comprehensive explanation of what this demonstrates in the paper
3. Key findings: Detailed analysis of main revelations
4. Methodology: Technical details and experimental approach
5. Implications: Broader research implications and significance
6. Context: How this fits into the overall research

Provide thorough, detailed analysis. Do not use markdown formatting like ** or *.

Researcher: ${userName || 'Anonymous'}`
         : `Briefly explain what this image shows and what it explains in the paper.

Figure Caption/Description: ${caption || question}

${documentContent ? `Document Context: ${documentContent.substring(0, 2000)}` : ''}

${question && question !== caption ? `Question: ${question}` : ''}

Provide a brief explanation covering:
1. What the image shows: Describe what you see
2. What it explains: What does this demonstrate in the paper
3. Key points: Main things this reveals

Keep it very brief and clear. Do not use markdown formatting like ** or *.

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
       max_tokens: isDetailedMode ? 2000 : 500,
       temperature: isDetailedMode ? 0.7 : 0.3,
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
