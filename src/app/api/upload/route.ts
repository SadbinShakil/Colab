import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, readFile } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'
import { storeDocument, DocumentMetadata } from '@/lib/documentStorage'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 })
    }

    // Validate file size (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size too large (max 50MB)' }, { status: 400 })
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const filepath = join(uploadsDir, filename)

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filepath, buffer)

    // Get metadata from form
    const metadata: any = {
      id: timestamp.toString(),
      filename: filename,
      originalName: file.name,
      size: file.size,
      title: formData.get('title') as string || file.name,
      authors: formData.get('authors') as string || '',
      journal: formData.get('journal') as string || '',
      year: formData.get('year') as string || '',
      abstract: formData.get('abstract') as string || '',
      tags: JSON.parse(formData.get('tags') as string || '[]'),
      visibility: formData.get('visibility') as string || 'private',
      collaborators: JSON.parse(formData.get('collaborators') as string || '[]'),
      uploadDate: new Date().toISOString(),
      url: `/uploads/${filename}`,
      enhancedMetadata: null // Will be populated during extraction
    }

    // Store document metadata for retrieval (will be updated after text extraction)
    await storeDocument(metadata.id, metadata)

    // Extract PDF text content for AI analysis
    try {
      console.log('🔄 Starting PDF text extraction...')
      console.log('📁 File path for extraction:', filepath)
      
      // Use require (not dynamic import) to avoid pdf-parse test file ENOENT bug
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pdfParse = require('pdf-parse')

      // Read the PDF file and extract text
      const pdfBuffer = await readFile(filepath)
      const pdfData = await pdfParse(pdfBuffer, { version: 'default' })
      const extractedText = pdfData.text
      
      console.log(`✅ PDF text extracted: ${extractedText.length} characters`)
      
      // Extract basic metadata from filename
      const extractedTitle = filename.replace(/\.pdf$/i, '').replace(/^\d+-/, '')
      const extractedAuthors = 'Unknown' // We'll get this from AI analysis later
      const extractedYear = new Date().getFullYear().toString()
      
      // Try to extract abstract from the text (look for common patterns)
      let extractedAbstract = 'Abstract not found in document'
      if (extractedText) {
        // Try multiple patterns to find abstract
        const abstractPatterns = [
          // Pattern 1: "Abstract" followed by content
          /abstract\s*:?\s*([\s\S]{50,1000}?)(?:\n\s*\n|\n\s*introduction|\n\s*1\.|\n\s*keywords|\n\s*key\s*words)/i,
          // Pattern 2: "Summary" followed by content
          /summary\s*:?\s*([\s\S]{50,1000}?)(?:\n\s*\n|\n\s*introduction|\n\s*1\.|\n\s*keywords|\n\s*key\s*words)/i,
          // Pattern 3: Just look for "Abstract" and take next 200-800 characters
          /abstract\s*:?\s*([\s\S]{200,800})/i,
          // Pattern 4: Look for content that starts with common abstract phrases
          /(?:this\s+paper|this\s+study|this\s+work|we\s+present|we\s+propose|we\s+investigate)[\s\S]{100,800}/i
        ]
        
        for (const pattern of abstractPatterns) {
          const match = extractedText.match(pattern)
          if (match && match[1]) {
            let abstractText = match[1].trim()
            // Clean up the abstract text
            abstractText = abstractText.replace(/\s+/g, ' ').replace(/\n+/g, ' ')
            if (abstractText.length > 50) {
              extractedAbstract = abstractText.substring(0, 800) + (abstractText.length > 800 ? '...' : '')
              console.log('✅ Abstract extracted using pattern:', pattern.toString())
              break
            }
          }
        }
        
        // If no abstract found, try to get the first paragraph that looks like an abstract
        if (extractedAbstract === 'Abstract not found in document') {
          const firstParagraph = extractedText.split('\n\n')[0] || extractedText.split('\n')[0]
          if (firstParagraph && firstParagraph.length > 100 && firstParagraph.length < 1000) {
            extractedAbstract = firstParagraph.trim().substring(0, 500) + '...'
            console.log('✅ Using first paragraph as abstract')
          }
        }
      }
      
      // Update metadata with extracted information
      metadata.title = extractedTitle || metadata.title
      metadata.authors = extractedAuthors || metadata.authors
      metadata.year = extractedYear || metadata.year
      metadata.abstract = extractedAbstract || metadata.abstract
      
      // Store the full text for AI analysis
      metadata.fullText = extractedText
      metadata.summary = {
        fullText: extractedText,
        abstract: extractedAbstract,
        title: extractedTitle,
        authors: extractedAuthors,
        year: extractedYear,
        extractedAt: new Date().toISOString()
      }
      
      // Add enhanced metadata status
      metadata.enhancedMetadata = {
        status: 'completed',
        extractedTitle: extractedTitle,
        extractedAuthors: extractedAuthors,
        extractedYear: extractedYear,
        extractedAbstract: extractedAbstract,
        textLength: extractedText.length,
        note: 'PDF text successfully extracted for AI analysis'
      }
      
      console.log('✅ PDF metadata extraction completed successfully')
      
      // Store the updated metadata with extracted text
      await storeDocument(metadata.id, metadata)
    } catch (extractError) {
      console.error('❌ PDF metadata extraction error:', extractError)
      
      // Fallback: extract basic info from filename
      const extractedTitle = filename.replace(/\.pdf$/i, '').replace(/^\d+-/, '')
      const extractedAuthors = 'Unknown'
      const extractedYear = new Date().getFullYear().toString()
      const extractedAbstract = 'PDF uploaded successfully. Text extraction failed.'
      
      metadata.title = extractedTitle || metadata.title
      metadata.authors = extractedAuthors || metadata.authors
      metadata.year = extractedYear || metadata.year
      metadata.abstract = extractedAbstract || metadata.abstract
      
      metadata.enhancedMetadata = {
        status: 'error',
        error: extractError instanceof Error ? extractError.message : 'Unknown error',
        note: 'PDF text extraction failed. AI analysis may be limited.'
      }
      
      // Store the fallback metadata
      await storeDocument(metadata.id, metadata)
    }

    // In a real app, you'd save this to a database
    // For now, we'll just return the metadata
    
    return NextResponse.json({
      success: true,
      document: metadata
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 

// Also export the function to get documents by ID
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const id = url.searchParams.get('id')
    
    if (!id) {
      return NextResponse.json(
        { error: 'Document ID required' },
        { status: 400 }
      )
    }
    
    console.log('Looking for document with ID:', id)
    
    // Import the shared storage
    const { getDocument, getAllDocuments } = await import('@/lib/documentStorage')
    const document = await getDocument(id)
    
    if (document) {
      console.log('✅ Document found in storage:', {
        id: document.id,
        title: document.title,
        hasFullText: !!document.fullText,
        fullTextLength: document.fullText?.length || 0,
        hasSummary: !!document.summary,
        hasSummaryFullText: !!document.summary?.fullText,
        summaryFullTextLength: document.summary?.fullText?.length || 0,
        abstract: document.abstract?.substring(0, 100) + '...' || 'No abstract'
      })
      
      // If document exists but has no extracted text, try to re-extract it
      if (!document.fullText && !document.summary?.fullText) {
        console.log('⚠️ Document has no extracted text, attempting to re-extract...')
        
        try {
          const fs = require('fs')
          const path = require('path')
          const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
          const files = fs.readdirSync(uploadsDir)
          const matchingFile = files.find((file: string) => file.startsWith(id + '-'))
          
          if (matchingFile) {
            console.log('Found PDF file for re-extraction:', matchingFile)
            const filePath = path.join(uploadsDir, matchingFile)
            
            // Re-extract text from PDF
            const pdfParse = (await import('pdf-parse')).default
            const pdfBuffer = fs.readFileSync(filePath)
            const pdfData = await pdfParse(pdfBuffer)
            const extractedText = pdfData.text
            
            console.log(`✅ Re-extracted text: ${extractedText.length} characters`)
            
            // Update document with extracted text
            document.fullText = extractedText
            document.summary = {
              fullText: extractedText,
              abstract: document.abstract || 'Abstract extracted from document',
              title: document.title,
              authors: document.authors,
              year: document.year,
              extractedAt: new Date().toISOString()
            }
            
            // Save updated document
            const { storeDocument } = await import('@/lib/documentStorage')
            await storeDocument(document.id, document)
            
            console.log('✅ Document updated with extracted text')
          } else if (id === 'attention-is-all-you-need') {
            // Special case for the demo "Attention is All You Need" paper
            console.log('📄 Adding demo content for Attention is All You Need paper')
            const demoContent = `Attention Is All You Need

Abstract: The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder. The best performing models also connect the encoder and decoder through an attention mechanism. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms, dispensing with recurrence and convolutions entirely.

1. Introduction
Recurrent neural networks, long short-term memory and gated recurrent neural networks in particular, have been firmly established as state of the art approaches in sequence modeling and transduction problems such as language modeling and machine translation. Numerous efforts have since continued to push the boundaries of recurrent language models and encoder-decoder architectures.

Recurrent models typically factor computation along the symbol positions of the input and output sequences. Aligning the positions to steps in computation time, they generate a sequence of hidden states h_t, as a function of the previous hidden state h_{t-1} and the input for position t. This inherently sequential nature precludes parallelization within training examples, which becomes critical at longer sequence lengths, as memory constraints limit batching across examples.

Recent work has achieved significant improvements in computational efficiency through factorization tricks and conditional computation, while also improving model performance in case of the latter. The fundamental constraint of sequential computation, however, remains.

Attention mechanisms have become an integral part of compelling sequence modeling and transduction models in various tasks, allowing modeling of dependencies without regard to their distance in the input or output sequences. In all but a few cases, however, such attention mechanisms are used in conjunction with a recurrent network.

In this work we propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output. The Transformer allows for significantly more parallelization and can reach a new state of the art in translation quality after being trained for as little as twelve hours on eight P100 GPUs.

2. Background
The goal of reducing sequential computation also forms the foundation of the Extended Neural GPU, ByteNet and ConvS2S, all of which use convolutional neural networks as basic building block, computing hidden representations in parallel for all input and output positions. In these models, the number of operations required to relate signals from two arbitrary input or output positions grows in the distance between positions, linearly for ConvS2S and logarithmically for ByteNet. This makes it more difficult to learn dependencies between distant positions.

In the Transformer this is reduced to a constant number of operations, albeit at the cost of reduced effective resolution due to averaging attention-weighted positions, an effect we counteract with Multi-Head Attention.

Self-attention, sometimes called intra-attention is an attention mechanism relating different positions of a single sequence in order to compute a representation of the sequence. Self-attention has been used successfully in a variety of tasks including reading comprehension, abstractive summarization, textual entailment and learning task-independent sentence representations.

End-to-end memory networks are based on a recurrent attention mechanism instead of sequence-aligned recurrence and have been shown to perform well on simple-language question answering and language modeling tasks.

To the best of our knowledge, however, the Transformer is the first transduction model relying entirely on self-attention to compute representations of its input and output without using sequence-aligned RNNs or convolution.

3. Model Architecture
Most competitive neural sequence transduction models have an encoder-decoder structure. Here, the encoder maps an input sequence of symbol representations (x_1, ..., x_n) to a sequence of continuous representations z = (z_1, ..., z_n). Given z, the decoder then generates an output sequence (y_1, ..., y_m) of symbols one element at a time. At each step the model is auto-regressive, consuming the previously generated symbols as additional input when generating the next.

The Transformer follows this overall architecture using stacked self-attention and point-wise, fully connected layers for both the encoder and decoder.

3.1 Encoder and Decoder Stacks
Encoder: The encoder is composed of a stack of N = 6 identical layers. Each layer has two sub-layers. The first is a multi-head self-attention mechanism, and the second is a simple, position-wise fully connected feed-forward network. We employ a residual connection around each of the two sub-layers, followed by layer normalization. That is, the output of each sub-layer is LayerNorm(x + Sublayer(x)), where Sublayer(x) is the function implemented by the sub-layer itself. To facilitate these residual connections, all sub-layers in the model, as well as the embedding layers, produce outputs of dimension d_model = 512.

Decoder: The decoder is also composed of a stack of N = 6 identical layers. In addition to the two sub-layers in each encoder layer, the decoder inserts a third sub-layer, which performs multi-head attention over the output of the encoder stack. Similar to the encoder, we employ residual connections around each of the sub-layers, followed by layer normalization. We also modify the self-attention sub-layer in the decoder stack to prevent positions from attending to subsequent positions. This masking, combined with fact that the output embeddings are offset by one position, ensures that the predictions for position i can depend only on the known outputs at positions less than i.

3.2 Attention
An attention function can be described as mapping a query and a set of key-value pairs to an output, where the query, keys, values, and output are all vectors. The output is computed as a weighted sum of the values, where the weight assigned to each value is computed by a compatibility function of the query with the corresponding key.

3.2.1 Scaled Dot-Product Attention
We call our particular attention "Scaled Dot-Product Attention". The input consists of queries and keys of dimension d_k, and values of dimension d_v. We compute the dot products of the query with all keys, divide each by √d_k, and apply a softmax function to obtain the weights on the values.

In practice, we compute the attention function on a set of queries simultaneously, packed together into a matrix Q. The keys and values are also packed together into matrices K and V. We compute the matrix of outputs as:

Attention(Q, K, V) = softmax(QK^T / √d_k)V

3.2.2 Multi-Head Attention
Instead of performing a single attention function with d_model-dimensional keys, values and queries, we found it beneficial to linearly project the queries, keys and values h times with different, learned linear projections to d_k, d_k and d_v dimensions, respectively. On each of these projected versions of queries, keys and values we then perform the attention function in parallel, yielding d_v-dimensional output values. These are concatenated and once again projected, resulting in the final values.

MultiHead(Q, K, V) = Concat(head_1, ..., head_h)W^O
where head_i = Attention(QW_i^Q, KW_i^K, VW_i^V)

Where the projections are parameter matrices W_i^Q ∈ R^{d_model × d_k}, W_i^K ∈ R^{d_model × d_k}, W_i^V ∈ R^{d_model × d_v} and W^O ∈ R^{hd_v × d_model}.

In this work we employ h = 8 parallel attention layers, or heads. For each of these we use d_k = d_v = d_model/h = 64. Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality.

3.2.3 Applications of Attention in our Model
The Transformer uses multi-head attention in three different ways:
- In "encoder-decoder attention" layers, the queries come from the previous decoder layer, and the memory keys and values come from the output of the encoder. This allows every position in the decoder to attend over all positions in the input sequence.
- The encoder contains self-attention layers. In a self-attention layer all of the keys, values and queries come from the same place, in this case, the output of the previous layer in the encoder. Each position in the encoder can attend to all positions in the previous layer of the encoder.
- Similarly, self-attention layers in the decoder allow each position in the decoder to attend to all positions in the decoder up to and including that position. We need to prevent leftward information flow in the decoder to preserve the auto-regressive property. We implement this inside of scaled dot-product attention by masking out (setting to -∞) all values in the input of the softmax which correspond to illegal connections.

3.3 Position-wise Feed-Forward Networks
In addition to attention sub-layers, each of the layers in our encoder and decoder contains a fully connected feed-forward network, which is applied to each position separately and identically. This consists of two linear transformations with a ReLU activation in between.

FFN(x) = max(0, xW_1 + b_1)W_2 + b_2

While the linear transformations are the same across different positions, they use different parameters from layer to layer. Another way of describing this is as two convolutions with kernel size 1. The dimensionality of input and output is d_model = 512, and the inner-layer has dimensionality d_ff = 2048.

3.4 Embeddings and Softmax
Similarly to other sequence transduction models, we use learned embeddings to convert the input tokens and output tokens to vectors of dimension d_model. We also use the usual learned linear transformation and softmax function to convert the decoder output to predicted next-token probabilities. In our model, we share the same weight matrix between the two embedding layers and the pre-softmax linear transformation. In the embedding layers, we multiply those weights by √d_model.

3.5 Positional Encoding
Since our model contains no recurrence and no convolution, in order for the model to make use of the order of the sequence, we must inject some information about the relative or absolute position of the tokens in the sequence. To this end, we add "positional encodings" to the input embeddings at the bottoms of the encoder and decoder stacks. The positional encodings have the same dimension d_model as the embeddings, so that the two can be summed. There are many choices of positional encodings, learned and fixed.

In this work, we use sine and cosine functions of different frequencies:

PE_{(pos, 2i)} = sin(pos / 10000^{2i/d_model})
PE_{(pos, 2i+1)} = cos(pos / 10000^{2i/d_model})

where pos is the position and i is the dimension. That is, each dimension of the positional encoding corresponds to a sinusoid. The wavelengths form a geometric progression from 2π to 10000 · 2π. We chose this function because we hypothesized it would allow the model to easily learn to attend by relative positions, since for any fixed offset k, PE_{pos+k} can be represented as a linear function of PE_{pos}.

4. Why Self-Attention
In this section we compare various aspects of self-attention layers to the recurrent and convolutional layers commonly used for mapping one variable-length sequence of symbol representations (x_1, ..., x_n) to another sequence of equal length (z_1, ..., z_n), with x_i, z_i ∈ R^d, such as a hidden layer in a typical sequence transduction encoder or decoder. Motivating our use of self-attention, we consider three desiderata.

One is the total computational complexity per layer. Another is the amount of computation that can be parallelized, as measured by the minimum number of sequential operations required. The third is the path length between long-range dependencies in the network. Many sequence transduction tasks contain long-range dependencies, so the ability to learn such dependencies is a key success factor for many of our models.

As noted in Table 1, a self-attention layer connects all positions with a constant number of sequentially executed operations, whereas a recurrent layer requires O(n) sequential operations. In terms of computational complexity, self-attention layers are faster than recurrent layers when the sequence length n is smaller than the representation dimensionality d, which is most often the case with sentence representations used by state-of-the-art models in machine translations, as represented by word-piece and sentence-piece representations. To improve computational performance for tasks involving very long sequences, self-attention could be restricted to considering only a neighborhood of size r in the input sequence centered around the respective output position. This would increase the maximum path length to O(n/r). We plan to investigate this approach further in future work.

A single convolutional layer with kernel width k < n does not connect all pairs of input and output positions. Doing so requires a stack of O(n/k) convolutional layers in the case of contiguous kernels, or O(log_k(n)) in the case of dilated convolutions, increasing the length of the longest paths between any two positions in the network. Convolutional layers are generally more expensive than recurrent layers, by a factor of k. Separable convolutions, however, decrease the complexity considerably. Even with k = n, the complexity of a separable convolution is equal to the combination of a self-attention layer and a point-wise feed-forward layer, the approach we take in our model.

As side benefit, self-attention could yield more interpretable models. We inspect attention distributions extracted by our models and present and discuss examples in the appendix. Not only do individual attention heads clearly learn to perform different tasks, many appear to exhibit behavior related to the syntactic and semantic structure of the sentences.

5. Training
This section describes the training regime for our models.

5.1 Training Data and Batching
We trained on the standard WMT 2014 English-German dataset consisting of about 4.5 million sentence pairs. Sentences were encoded using byte-pair encoding, which has a shared source-target vocabulary of about 37000 tokens. For English-French, we used the much larger WMT 2014 English-French dataset consisting of 36M sentences and split tokens into a 32000 word-piece vocabulary.

Sentence pairs were batched together by approximate sequence length. Each training batch contained a set of sentence pairs containing approximately 25000 source tokens and 25000 target tokens.

5.2 Hardware and Schedule
We trained our models on one machine with 8 NVIDIA P100 GPUs. For our base models using the hyperparameters described throughout the paper, each training step took about 0.4 seconds. We trained the base models for a total of 100,000 steps or 12 hours. For our big models, step time was 1.0 seconds. The big models were trained for 300,000 steps (3.5 days).

5.3 Optimizer
We used the Adam optimizer with β_1 = 0.9, β_2 = 0.98 and ε = 10^{-9}. We varied the learning rate over the course of training, according to the formula:

lrate = d_model^{-0.5} · min(step_num^{-0.5}, step_num · warmup_steps^{-1.5})

This corresponds to increasing the learning rate linearly for the first warmup_steps training steps, and decreasing it thereafter proportionally to the inverse square root of the step number. We used warmup_steps = 4000.

5.4 Regularization
We employ three types of regularization during training:

Residual Dropout We apply dropout to the output of each sub-layer, before it is added to the sub-layer input and normalized. In addition, we apply dropout to the sums of the embeddings and the positional encodings in both the encoder and decoder stacks. For the base model, we use a rate of P_drop = 0.1.

Label Smoothing During training, we employed label smoothing of value ε_ls = 0.1. This hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.

6. Results
6.1 Machine Translation
On the WMT 2014 English-to-German translation task, the big transformer model (Transformer (big) in Table 2) outperforms the best previously reported models (including ensembles) by more than 2 BLEU, establishing a new state-of-the-art BLEU score of 28.4. The configuration of this model is listed in the bottom line of Table 3. Training took 3.5 days on 8 P100 GPUs. Even our base model surpasses all previously published models and ensembles, at a fraction of the training cost of any of the competitive models.

On the WMT 2014 English-to-French translation task, our big model achieves a BLEU score of 41.0, outperforming all of the previously published single models, at less than 1/4 the training cost of the previous state-of-the-art model. The Transformer (big) model trained for English-to-French used dropout rate P_drop = 0.1, instead of 0.3.

For the base models, we used a single model from the last 5 checkpoints, which were written every 10 minutes during training. For the big models, we averaged the last 20 checkpoints. We used beam search with a beam size of 4 and length penalty α = 0.6. These hyperparameters were chosen after experimentation on the development set. We set the maximum output length during inference to input length + 50, but terminate early when possible.

6.2 Model Variations
To evaluate the importance of different components of the Transformer, we varied our base model in different ways, measuring the change in performance on English-to-German translation on the development set, newstest2013. We used beam search as described in the previous section, but no checkpoint averaging. We present the results in Table 3.

In Table 3 rows (A), we vary the number of attention heads and the attention key and value dimensions, keeping the amount of computation constant, as described in Section 3.2.2. While single-head attention is 0.9 BLEU worse than the best setting, quality also drops off with too many heads, suggesting that it is difficult to gain useful information from the additional attention heads at this point.

In Table 3 rows (B), we observe that reducing the attention key size d_k hurts model quality. This suggests that determining compatibility is not easy and that a more sophisticated compatibility function than the dot product may be beneficial. We further observe in rows (C) and (D) that, as expected, bigger models are better, and dropout is very helpful. In rows (E), we replace our sinusoidal positional encoding with learned positional embeddings, and observe nearly identical results to our base model.

6.3 English Constituency Parsing
To evaluate if the Transformer can generalize to other tasks we performed experiments on English constituency parsing. This task presents particular challenges because the output is strongly constrained by the structural rules of the grammar and the model needs to make many local decisions that are sensitive to the syntactic structure of the sentence.

We trained a 4-layer transformer with d_model = 1024 on the Wall Street Journal (WSJ) portion of the Penn Treebank, about 40K training sentences. We also trained it in a semi-supervised setting, using the larger high-confidence and BerkleyParser corpora with about 17M sentences. We used a vocabulary of 16K tokens for the WSJ only setting and a vocabulary of 32K tokens for the semi-supervised setting.

We performed only a few experiments to select the dropout, attention and residual (learning rate = 0.0003), and beam size on the Section 22 development set, all other parameters were identical to those used on English-to-German translation. During inference, we increased the maximum output length to input length + 300. We used a beam size of 21 and α = 0.3 for both WSJ only and the semi-supervised setting.

Our results in Table 4 show that despite the lack of task-specific tuning our model performs surprisingly well, yielding better results than all previously reported models with the exception of the Recurrent Neural Network Grammar.

In contrast to RNN sequence-to-sequence models, the Transformer outperforms the BerkeleyParser even when training only on the WSJ training set of 40K sentences.

7. Conclusion
In this work, we presented the Transformer, the first sequence transduction model based entirely on attention, replacing the recurrent layers most commonly used in encoder-decoder architectures with multi-headed self-attention.

For translation tasks, the Transformer can be trained significantly faster than architectures based on recurrent or convolutional layers. On both WMT 2014 English-to-German and WMT 2014 English-to-French translation tasks, we achieve a new state of the art. In the former task our best model outperforms all previously reported ensembles.

We are excited about the future of attention-based models and plan to apply them to other tasks. We plan to extend the Transformer to problems involving input and output modalities other than text and to investigate local, restricted attention mechanisms to efficiently handle large inputs and outputs such as images, audio and video. Making generation less sequential remains another research priority.

The code we used to train and evaluate our models is open-sourced, so others can reproduce our experiments. We also provide Tensor2Tensor, a library of data processing tools and training loops for sequence-to-sequence models, which we hope will facilitate future research.

The Transformer architecture has become the foundation for many state-of-the-art models in natural language processing, including BERT, GPT, T5, and many others. The attention mechanism introduced in this paper has revolutionized the field and enabled the development of large language models that can understand and generate human-like text.

The key innovations of this paper include:
1. The multi-head attention mechanism that allows the model to focus on different parts of the input sequence
2. The elimination of recurrence and convolution in favor of pure attention
3. The positional encoding scheme that allows the model to understand sequence order
4. The encoder-decoder architecture that enables effective sequence-to-sequence learning
5. The scalability and parallelization advantages that make training large models feasible

This work has had a profound impact on the field of machine learning and artificial intelligence, influencing virtually all subsequent research in natural language processing and beyond.`

            document.fullText = demoContent
            document.summary = {
              fullText: demoContent,
              abstract: document.abstract,
              title: document.title,
              authors: document.authors,
              year: document.year,
              extractedAt: new Date().toISOString()
            }
            
            // Save updated document
            const { storeDocument } = await import('@/lib/documentStorage')
            await storeDocument(document.id, document)
            
            console.log('✅ Demo document updated with full content')
          }
        } catch (reExtractError) {
          console.error('❌ Failed to re-extract text:', reExtractError)
        }
      }
    }
    
    if (!document) {
      const allDocs = await getAllDocuments()
      console.log('Document not found in storage, available documents:', allDocs.map(d => d.id))
      console.log('Available document IDs:', allDocs.map(d => ({ id: d.id, title: d.title, hasFullText: !!d.fullText })))
      
      // Try to construct a fallback document based on existing files
      // Look for files in uploads directory that start with this ID
      const fs = require('fs')
      const path = require('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
      
      try {
        const files = fs.readdirSync(uploadsDir)
        const matchingFile = files.find((file: string) => file.startsWith(id + '-'))
        
        if (matchingFile) {
          console.log('Found matching file:', matchingFile)
          const fallbackDocument = {
            id: id,
            filename: matchingFile,
            originalName: matchingFile.replace(/^\d+-/, ''), // Remove timestamp prefix
            size: 0,
            title: matchingFile.replace(/^\d+-/, '').replace(/\.[^.]+$/, ''), // Remove timestamp and extension
            authors: 'Unknown Authors',
            journal: 'Unknown Journal',
            year: '2024',
            abstract: 'No abstract available - document needs to be re-uploaded for text extraction',
            tags: [],
            visibility: 'private',
            collaborators: [],
            uploadDate: new Date().toISOString(),
            url: `/uploads/${matchingFile}`,
            fullText: null, // No extracted text available
            summary: null
          }
          
          console.log('Returning fallback document:', fallbackDocument)
          return NextResponse.json({
            success: true,
            document: fallbackDocument
          })
        }
      } catch (fsError) {
        console.error('Error reading uploads directory:', fsError)
      }
      
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      )
    }
    
    console.log('Returning stored document:', document)
    return NextResponse.json({
      success: true,
      document
    })
    
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}