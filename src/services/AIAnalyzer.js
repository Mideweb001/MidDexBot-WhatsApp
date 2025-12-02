const { OpenAI } = require('openai');

class AIAnalyzer {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    if (!this.openai) {
      console.warn('⚠️ OpenAI API key not provided - using fallback analysis');
    }
  }

  async analyzeDocument(text, metadata) {
    try {
      if (!text || text.trim().length === 0) {
        return this.createFallbackAnalysis('No text content found', metadata);
      }

      // Detect document type for specialized processing
      const docType = this.detectDocumentType(text, metadata);
      
      if (this.openai) {
        return await this.analyzeWithOpenAI(text, metadata, docType);
      } else {
        return this.createEnhancedFallbackAnalysis(text, metadata, docType);
      }
    } catch (error) {
      console.error('🔻 AI Analysis error:', error);
      return this.createEnhancedFallbackAnalysis(text, metadata);
    }
  }

  async generateCoverLetter(cvText, jobDescription = null) {
    try {
      if (this.openai) {
        const prompt = this.createCoverLetterPrompt(cvText, jobDescription);
        
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional career consultant specializing in creating compelling cover letters that highlight relevant experience and skills."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.3
        });

        return {
          success: true,
          coverLetter: completion.choices[0].message.content,
          tips: this.generateCoverLetterTips(),
          atsScore: this.calculateATSScore(cvText)
        };
      } else {
        return this.generateFallbackCoverLetter(cvText);
      }
    } catch (error) {
      console.error('🔻 Cover letter generation error:', error);
      return this.generateFallbackCoverLetter(cvText);
    }
  }

  async improveCVContent(cvText) {
    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert CV consultant. Improve the CV content by enhancing descriptions, adding action verbs, quantifying achievements, and optimizing for ATS systems."
            },
            {
              role: "user",
              content: `Please improve this CV content:\n\n${cvText.substring(0, 3000)}\n\nProvide:\n1. Improved professional summary\n2. Enhanced work experience descriptions\n3. Skills optimization\n4. ATS improvement suggestions`
            }
          ],
          max_tokens: 1500,
          temperature: 0.2
        });

        return {
          success: true,
          improvedCV: completion.choices[0].message.content,
          improvements: this.extractImprovements(cvText),
          atsScore: this.calculateATSScore(cvText)
        };
      } else {
        return this.createFallbackCVImprovement(cvText);
      }
    } catch (error) {
      console.error('🔻 CV improvement error:', error);
      return this.createFallbackCVImprovement(cvText);
    }
  }

  calculateATSScore(cvText) {
    let score = 0;
    const factors = {
      hasContactInfo: /email|phone|linkedin/i.test(cvText) ? 15 : 0,
      hasWorkExperience: /experience|work|employment/i.test(cvText) ? 20 : 0,
      hasSkills: /skills|proficient|experienced/i.test(cvText) ? 15 : 0,
      hasEducation: /education|degree|university|college/i.test(cvText) ? 10 : 0,
      hasQuantifiedAchievements: /\d+%|\$\d+|increased|improved|reduced/i.test(cvText) ? 20 : 0,
      hasActionVerbs: /(managed|led|developed|created|implemented|achieved)/i.test(cvText) ? 10 : 0,
      properLength: cvText.length > 500 && cvText.length < 5000 ? 10 : 0
    };
    
    score = Object.values(factors).reduce((sum, val) => sum + val, 0);
    return Math.min(score, 100);
  }

  async analyzeWithOpenAI(text, metadata) {
    try {
      console.log('🤖 Analyzing with OpenAI...');
      
      const prompt = this.createAnalysisPrompt(text, metadata);
      
      const completion = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a professional document analyst. Provide clear, concise analysis of documents including summaries, key points, and insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.3
      });

      const response = completion.choices[0].message.content;
      return this.parseAIResponse(response, text, metadata);
      
    } catch (error) {
      console.error('❌ OpenAI API error:', error);
      return this.createFallbackAnalysis(text, metadata);
    }
  }

  createAnalysisPrompt(text, metadata) {
    return `
Please analyze the following document and provide:
1. A concise summary (2-3 sentences)
2. 3-5 key points or insights
3. Document type/category
4. Any notable patterns or important information

Document metadata: ${JSON.stringify(metadata)}

Document content:
${text.substring(0, 3000)}${text.length > 3000 ? '...' : ''}

Please format your response as JSON with keys: summary, keyPoints (array), documentType, insights.
    `;
  }

  parseAIResponse(response, text, metadata) {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      
      return {
        summary: parsed.summary || this.generateBasicSummary(text),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : this.extractKeyPoints(text),
        documentType: parsed.documentType || this.detectDocumentType(text, metadata),
        insights: parsed.insights || 'AI-powered analysis completed',
        wordCount: metadata?.wordCount || this.countWords(text),
        analysisType: 'ai-powered',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      // Fallback if JSON parsing fails
      return {
        summary: this.generateBasicSummary(text),
        keyPoints: this.extractKeyPoints(text),
        documentType: this.detectDocumentType(text, metadata),
        insights: response.substring(0, 200) + '...',
        wordCount: metadata?.wordCount || this.countWords(text),
        analysisType: 'ai-powered',
        timestamp: new Date().toISOString()
      };
    }
  }

  createFallbackAnalysis(text, metadata) {
    return {
      summary: this.generateBasicSummary(text),
      keyPoints: this.extractKeyPoints(text),
      documentType: this.detectDocumentType(text, metadata),
      insights: 'Basic text analysis completed',
      wordCount: metadata?.wordCount || this.countWords(text),
      analysisType: 'rule-based',
      timestamp: new Date().toISOString()
    };
  }

  generateBasicSummary(text) {
    if (!text || text.trim().length === 0) {
      return 'No text content available for summary.';
    }

    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) {
      return 'Document contains text but no clear sentences found.';
    }

    // Take first few sentences or generate based on content
    const firstSentences = sentences.slice(0, 2).map(s => s.trim()).join('. ');
    const wordCount = this.countWords(text);
    
    return `${firstSentences}. Document contains ${wordCount} words across ${sentences.length} sentences.`;
  }

  extractKeyPoints(text) {
    if (!text || text.trim().length === 0) {
      return ['No text content available'];
    }

    const keyPoints = [];
    
    // Look for numbered lists
    const numberedItems = text.match(/\d+\.\s+[^\n\r]+/g);
    if (numberedItems && numberedItems.length > 0) {
      keyPoints.push(...numberedItems.slice(0, 3).map(item => item.replace(/^\d+\.\s+/, '')));
    }
    
    // Look for bullet points
    const bulletItems = text.match(/[•\-\*]\s+[^\n\r]+/g);
    if (bulletItems && bulletItems.length > 0) {
      keyPoints.push(...bulletItems.slice(0, 3).map(item => item.replace(/^[•\-\*]\s+/, '')));
    }
    
    // Extract sentences with keywords
    const sentences = text.split(/[.!?]+/);
    const importantKeywords = ['important', 'key', 'main', 'primary', 'essential', 'critical', 'summary', 'conclusion'];
    
    sentences.forEach(sentence => {
      if (keyPoints.length < 5 && importantKeywords.some(keyword => 
        sentence.toLowerCase().includes(keyword)
      )) {
        keyPoints.push(sentence.trim());
      }
    });
    
    // If no specific points found, use first few sentences
    if (keyPoints.length === 0) {
      keyPoints.push(...sentences.slice(0, 3).map(s => s.trim()).filter(s => s.length > 10));
    }
    
    return keyPoints.slice(0, 5);
  }

  detectDocumentType(text, metadata) {
    if (!text) return 'Unknown';
    
    const textLower = text.toLowerCase();
    
    // Check for common document patterns
    if (textLower.includes('resume') || textLower.includes('cv') || 
        (textLower.includes('experience') && textLower.includes('education'))) {
      return 'Resume/CV';
    }
    
    if (textLower.includes('invoice') || textLower.includes('bill') || textLower.includes('total amount')) {
      return 'Invoice/Bill';
    }
    
    if (textLower.includes('contract') || textLower.includes('agreement')) {
      return 'Contract/Agreement';
    }
    
    if (textLower.includes('report') || textLower.includes('analysis') || textLower.includes('findings')) {
      return 'Report/Analysis';
    }
    
    if (textLower.includes('proposal') || textLower.includes('project') || textLower.includes('budget')) {
      return 'Proposal/Project';
    }
    
    // Check based on file type
    if (metadata?.type === 'pdf') {
      return 'PDF Document';
    } else if (metadata?.type === 'image') {
      return 'Image with Text';
    }
    
    return 'Text Document';
  }

  async analyzeText(text) {
    return await this.analyzeDocument(text, { type: 'text', wordCount: this.countWords(text) });
  }

  countWords(text) {
    if (!text) return 0;
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  createCoverLetterPrompt(cvText, jobDescription) {
    return `
Based on this CV content, create a professional cover letter:

CV Content:
${cvText.substring(0, 2000)}

${jobDescription ? `Job Description:\n${jobDescription.substring(0, 1000)}` : ''}

Please create a compelling cover letter that:
1. Highlights relevant experience from the CV
2. Shows enthusiasm for the role
3. Demonstrates value proposition
4. Is professional yet personable
5. Is 3-4 paragraphs long

Format as a complete cover letter with proper structure.
    `;
  }

  generateCoverLetterTips() {
    return [
      "Customize for each application",
      "Include specific company research",
      "Quantify achievements when possible",
      "Show enthusiasm and cultural fit",
      "Keep it concise (3-4 paragraphs)"
    ];
  }

  generateFallbackCoverLetter(cvText) {
    const skills = this.extractKeyPoints(cvText).slice(0, 3);
    return {
      success: true,
      coverLetter: `Dear Hiring Manager,

I am writing to express my interest in the position at your company. Based on my background, I believe I would be a valuable addition to your team.

My experience includes ${skills.join(', ')}, which align well with the requirements for this role. I am passionate about contributing to your organization's success and would welcome the opportunity to discuss how my skills can benefit your team.

Thank you for considering my application. I look forward to hearing from you.

Best regards,
[Your Name]`,
      tips: this.generateCoverLetterTips(),
      atsScore: this.calculateATSScore(cvText)
    };
  }

  createFallbackCVImprovement(cvText) {
    const improvements = this.extractImprovements(cvText);
    return {
      success: true,
      improvedCV: "Enhanced CV content with action verbs and quantified achievements",
      improvements: improvements,
      atsScore: this.calculateATSScore(cvText)
    };
  }

  extractImprovements(cvText) {
    const suggestions = [];
    
    if (!/\d+%/.test(cvText)) {
      suggestions.push("Add quantified achievements (percentages, numbers)");
    }
    
    if (!/managed|led|developed|created/i.test(cvText)) {
      suggestions.push("Use more action verbs (managed, led, developed)");
    }
    
    if (cvText.length < 500) {
      suggestions.push("Expand work experience descriptions");
    }
    
    if (!/skills/i.test(cvText)) {
      suggestions.push("Add a dedicated skills section");
    }
    
    return suggestions.length > 0 ? suggestions : ["Your CV looks good overall!"];
  }

  createEnhancedFallbackAnalysis(text, metadata, docType) {
    const analysis = this.createFallbackAnalysis(text, metadata);
    
    // Add specialized analysis based on document type
    if (docType === 'Resume/CV') {
      analysis.atsScore = this.calculateATSScore(text);
      analysis.cvSuggestions = this.extractImprovements(text);
      analysis.careerLevel = this.detectCareerLevel(text);
    }
    
    return analysis;
  }

  detectCareerLevel(text) {
    const textLower = text.toLowerCase();
    if (textLower.includes('ceo') || textLower.includes('director') || textLower.includes('vp')) {
      return 'Executive';
    } else if (textLower.includes('senior') || textLower.includes('lead') || textLower.includes('manager')) {
      return 'Senior';
    } else if (textLower.includes('junior') || textLower.includes('intern') || textLower.includes('entry')) {
      return 'Entry Level';
    }
    return 'Mid Level';
  }

  async getATSScore(cvText) {
    try {
      if (this.openai) {
        const prompt = `Analyze this CV/Resume for ATS (Applicant Tracking System) compatibility and provide a detailed score:

CV Content:
${cvText}

Please provide:
1. Overall ATS Score (0-100)
2. Keyword optimization rating
3. Format compatibility
4. Section organization
5. Specific recommendations for improvement
6. Missing keywords or sections

Format the response with clear sections and actionable advice.`;

        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an ATS (Applicant Tracking System) expert who helps optimize resumes for better parsing and ranking by automated systems."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        });

        return `📊 **ATS Compatibility Analysis**\n\n${completion.choices[0].message.content}`;
      } else {
        return this.createFallbackATSScore(cvText);
      }
    } catch (error) {
      console.error('🔻 ATS Score error:', error);
      return this.createFallbackATSScore(cvText);
    }
  }

  createFallbackATSScore(cvText) {
    const words = cvText.split(/\s+/).length;
    const hasEmail = cvText.includes('@');
    const hasPhone = /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(cvText);
    const hasExperience = cvText.toLowerCase().includes('experience');
    const hasEducation = cvText.toLowerCase().includes('education');
    const hasSkills = cvText.toLowerCase().includes('skills');

    let score = 50; // Base score
    if (hasEmail) score += 10;
    if (hasPhone) score += 10;
    if (hasExperience) score += 10;
    if (hasEducation) score += 10;
    if (hasSkills) score += 10;
    if (words > 200) score += 10;
    if (words > 500) score += 10;

    return `📊 **ATS Compatibility Score: ${score}/100**

**Analysis Results:**
✅ **Strengths:**
${hasEmail ? '• Contact email found\n' : ''}${hasPhone ? '• Phone number detected\n' : ''}${hasExperience ? '• Experience section present\n' : ''}${hasEducation ? '• Education section included\n' : ''}${hasSkills ? '• Skills section identified\n' : ''}

⚠️ **Recommendations:**
${!hasEmail ? '• Add professional email address\n' : ''}${!hasPhone ? '• Include phone number\n' : ''}${!hasExperience ? '• Add work experience section\n' : ''}${!hasEducation ? '• Include education details\n' : ''}${!hasSkills ? '• Add skills section\n' : ''}${words < 200 ? '• Expand content for better keyword coverage\n' : ''}

**Tips for ATS Optimization:**
• Use standard section headings (Experience, Education, Skills)
• Include relevant keywords from job descriptions
• Use bullet points for easy parsing
• Avoid graphics, tables, or complex formatting
• Save as .docx or .pdf format`;
  }
}

module.exports = AIAnalyzer;