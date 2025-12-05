const { HomeworkSession, User } = require('../models');
const { Op } = require('sequelize');

class HomeworkAssistant {
  constructor() {
    this.subjects = [
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
      'Engineering', 'Medicine', 'Business', 'Economics', 'Psychology',
      'History', 'Literature', 'Philosophy', 'Art', 'Languages',
      'Law', 'Political Science', 'Sociology', 'Anthropology', 'Geography',
      'Environmental Science', 'Data Science', 'Machine Learning', 'Statistics',
      'Music', 'Drama', 'Physical Education', 'Health Sciences'
    ];

    this.questionTypes = {
      'multiple_choice': 'Multiple Choice',
      'short_answer': 'Short Answer',
      'essay': 'Essay',
      'problem_solving': 'Problem Solving',
      'calculation': 'Mathematical Calculation',
      'analysis': 'Analysis & Interpretation',
      'other': 'Other'
    };

    this.difficultyLevels = {
      'beginner': 'Beginner (Grade 1-6)',
      'intermediate': 'Intermediate (Grade 7-12)',
      'advanced': 'Advanced (University)',
      'expert': 'Expert (Graduate/Research)'
    };
  }

  // Submit a new homework question
  async submitHomework(userId, questionData) {
    try {
      const startTime = Date.now();

      // Detect subject and difficulty if not provided
      const detectedSubject = questionData.subject || this.detectSubject(questionData.question);
      const detectedDifficulty = questionData.difficulty_level || this.detectDifficulty(questionData.question);
      const detectedType = questionData.question_type || this.detectQuestionType(questionData.question);

      const homework = await HomeworkSession.create({
        user_id: userId,
        question: questionData.question,
        subject: detectedSubject,
        topic: questionData.topic || this.extractTopic(questionData.question),
        difficulty_level: detectedDifficulty,
        question_type: detectedType,
        tags: questionData.tags || [],
        attachments: questionData.attachments || [],
        metadata: {
          submission_time: new Date(),
          user_agent: 'telegram_bot',
          question_length: questionData.question.length
        }
      });

      // Process the homework asynchronously
      this.processHomework(homework.id);

      return homework;
    } catch (error) {
      console.error('Error submitting homework:', error);
      throw new Error('Failed to submit homework question');
    }
  }

  // Process homework with AI analysis
  async processHomework(homeworkId) {
    try {
      const homework = await HomeworkSession.findByPk(homeworkId);
      if (!homework) throw new Error('Homework not found');

      // Update status to processing
      homework.status = 'processing';
      await homework.save();

      const startTime = Date.now();

      // Generate AI response
      const response = await this.generateAIResponse(homework);
      
      const processingTime = Math.round((Date.now() - startTime) / 1000);

      // Update homework with response
      homework.ai_response = response.answer;
      homework.step_by_step_solution = response.steps;
      homework.additional_resources = response.resources;
      homework.confidence_score = response.confidence;
      homework.processing_time_seconds = processingTime;
      homework.status = 'completed';
      homework.completion_percentage = 100;

      await homework.save();

      return homework;
    } catch (error) {
      console.error('Error processing homework:', error);
      
      // Update status to failed
      const homework = await HomeworkSession.findByPk(homeworkId);
      if (homework) {
        homework.status = 'failed';
        homework.ai_response = 'Sorry, I encountered an error while processing your question. Please try again or rephrase your question.';
        await homework.save();
      }
      
      throw error;
    }
  }

  // Generate AI response using available AI service
  async generateAIResponse(homework) {
    try {
      // Try to use OpenAI if available
      const AIAnalyzer = require('./AIAnalyzer');
      const aiAnalyzer = new AIAnalyzer();

      if (aiAnalyzer && aiAnalyzer.openai) {
        const prompt = this.buildHomeworkPrompt(homework);
        
        const completion = await aiAnalyzer.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: `You are an expert homework assistant. Provide clear, educational explanations with step-by-step solutions. Always encourage learning and understanding rather than just giving answers.`
            },
            {
              role: "user",
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        });

        const response = completion.choices[0].message.content;
        return this.parseAIResponse(response, homework);
      } else {
        // Fallback to built-in analysis
        return this.generateFallbackResponse(homework);
      }
    } catch (error) {
      console.error('Error generating AI response:', error);
      return this.generateFallbackResponse(homework);
    }
  }

  // Build comprehensive prompt for homework
  buildHomeworkPrompt(homework) {
    return `
Subject: ${homework.subject}
Topic: ${homework.topic || 'Not specified'}
Difficulty Level: ${homework.difficulty_level}
Question Type: ${homework.question_type}

Student Question: "${homework.question}"

Please provide:
1. A clear, educational answer
2. Step-by-step solution (if applicable)
3. Key concepts explained
4. Additional learning resources or tips
5. Confidence level (0-1) in your response

Format your response as:
ANSWER: [Main answer]
STEPS: [Step 1] | [Step 2] | [Step 3] | etc.
CONCEPTS: [Key concept 1] | [Key concept 2] | etc.
RESOURCES: [Resource 1] | [Resource 2] | etc.
CONFIDENCE: [0.0-1.0]
    `;
  }

  // Parse AI response into structured format
  parseAIResponse(response, homework) {
    const sections = {
      answer: '',
      steps: [],
      concepts: [],
      resources: [],
      confidence: 0.8
    };

    try {
      const lines = response.split('\n');
      let currentSection = '';

      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.startsWith('ANSWER:')) {
          currentSection = 'answer';
          sections.answer = trimmed.replace('ANSWER:', '').trim();
        } else if (trimmed.startsWith('STEPS:')) {
          currentSection = 'steps';
          const stepsText = trimmed.replace('STEPS:', '').trim();
          sections.steps = stepsText.split('|').map(s => s.trim()).filter(s => s);
        } else if (trimmed.startsWith('CONCEPTS:')) {
          currentSection = 'concepts';
          const conceptsText = trimmed.replace('CONCEPTS:', '').trim();
          sections.concepts = conceptsText.split('|').map(s => s.trim()).filter(s => s);
        } else if (trimmed.startsWith('RESOURCES:')) {
          currentSection = 'resources';
          const resourcesText = trimmed.replace('RESOURCES:', '').trim();
          sections.resources = resourcesText.split('|').map(s => s.trim()).filter(s => s);
        } else if (trimmed.startsWith('CONFIDENCE:')) {
          const confidenceText = trimmed.replace('CONFIDENCE:', '').trim();
          sections.confidence = parseFloat(confidenceText) || 0.8;
        } else if (trimmed && currentSection === 'answer') {
          sections.answer += '\n' + trimmed;
        }
      }

      // If parsing failed, use the entire response as answer
      if (!sections.answer && response) {
        sections.answer = response;
      }

    } catch (error) {
      console.error('Error parsing AI response:', error);
      sections.answer = response || 'Unable to process the response. Please try again.';
    }

    return sections;
  }

  // Generate fallback response when AI is not available
  generateFallbackResponse(homework) {
    const subject = homework.subject.toLowerCase();
    const question = homework.question.toLowerCase();

    let answer = '';
    let steps = [];
    let resources = [];

    // Subject-specific fallback responses
    if (subject.includes('math')) {
      answer = 'This appears to be a mathematics problem. ';
      if (question.includes('solve') || question.includes('equation')) {
        answer += 'To solve equations, identify the variable, isolate it step by step, and verify your answer.';
        steps = [
          'Identify the unknown variable',
          'Move terms to isolate the variable',
          'Perform arithmetic operations',
          'Check your answer by substitution'
        ];
      } else {
        answer += 'Break down the problem into smaller parts and apply relevant mathematical concepts.';
      }
      resources = ['Khan Academy Mathematics', 'Wolfram Alpha', 'Mathematics textbook'];
    } else if (subject.includes('science') || subject.includes('physics') || subject.includes('chemistry')) {
      answer = 'This is a science question. Identify the key concepts, relevant formulas, and apply scientific principles systematically.';
      steps = [
        'Identify what is given and what needs to be found',
        'Recall relevant scientific principles',
        'Apply appropriate formulas or methods',
        'Calculate and verify the result'
      ];
      resources = ['Science textbook', 'Online science resources', 'Educational videos'];
    } else {
      answer = 'I\'ve received your question and will help you understand the concepts involved. ';
      answer += 'Consider breaking down complex problems into smaller, manageable parts.';
      steps = [
        'Read the question carefully',
        'Identify key information',
        'Apply relevant knowledge',
        'Formulate your response'
      ];
      resources = ['Textbooks', 'Online educational platforms', 'Study groups'];
    }

    return {
      answer,
      steps,
      resources,
      confidence: 0.6
    };
  }

  // Detect subject from question content
  detectSubject(question) {
    const subjectKeywords = {
      'Mathematics': ['equation', 'solve', 'calculate', 'algebra', 'geometry', 'calculus', 'statistics', 'probability', 'trigonometry'],
      'Physics': ['force', 'energy', 'velocity', 'acceleration', 'wave', 'light', 'quantum', 'mechanics', 'thermodynamics'],
      'Chemistry': ['atom', 'molecule', 'reaction', 'compound', 'element', 'bond', 'ph', 'acid', 'base', 'organic'],
      'Biology': ['cell', 'dna', 'gene', 'evolution', 'organism', 'ecosystem', 'photosynthesis', 'protein', 'metabolism'],
      'History': ['war', 'revolution', 'ancient', 'civilization', 'century', 'empire', 'treaty', 'historical'],
      'Literature': ['novel', 'poem', 'author', 'character', 'theme', 'metaphor', 'symbolism', 'literary'],
      'Computer Science': ['algorithm', 'programming', 'code', 'data structure', 'software', 'computer', 'database']
    };

    const questionLower = question.toLowerCase();
    
    for (const [subject, keywords] of Object.entries(subjectKeywords)) {
      for (const keyword of keywords) {
        if (questionLower.includes(keyword)) {
          return subject;
        }
      }
    }

    return 'General Studies';
  }

  // Detect difficulty level from question content
  detectDifficulty(question) {
    const advancedKeywords = ['differential', 'integral', 'quantum', 'molecular', 'advanced', 'complex', 'theoretical'];
    const intermediateKeywords = ['analyze', 'compare', 'explain', 'describe', 'calculate'];
    const beginnerKeywords = ['what is', 'define', 'list', 'name', 'basic'];

    const questionLower = question.toLowerCase();

    if (advancedKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'advanced';
    } else if (intermediateKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'intermediate';
    } else if (beginnerKeywords.some(keyword => questionLower.includes(keyword))) {
      return 'beginner';
    }

    return 'intermediate';
  }

  // Detect question type from content
  detectQuestionType(question) {
    const questionLower = question.toLowerCase();

    if (questionLower.includes('calculate') || questionLower.includes('solve') || /\d+/.test(question)) {
      return 'calculation';
    } else if (questionLower.includes('analyze') || questionLower.includes('interpret')) {
      return 'analysis';
    } else if (questionLower.includes('essay') || questionLower.includes('discuss') || questionLower.includes('explain in detail')) {
      return 'essay';
    } else if (questionLower.includes('short') && questionLower.includes('answer')) {
      return 'short_answer';
    } else if (questionLower.includes('choose') || questionLower.includes('select')) {
      return 'multiple_choice';
    } else if (questionLower.includes('problem') || questionLower.includes('find solution')) {
      return 'problem_solving';
    }

    return 'other';
  }

  // Extract topic from question
  extractTopic(question) {
    const words = question.split(' ');
    const importantWords = words.filter(word => 
      word.length > 4 && 
      !['what', 'where', 'when', 'why', 'how', 'does', 'this', 'that', 'with', 'from', 'they', 'have', 'been'].includes(word.toLowerCase())
    );
    
    return importantWords.slice(0, 3).join(' ') || 'General Topic';
  }

  // Get user's homework history
  async getUserHomework(userId, filters = {}) {
    try {
      const whereClause = { user_id: userId };

      if (filters.subject) {
        whereClause.subject = filters.subject;
      }

      if (filters.status) {
        whereClause.status = filters.status;
      }

      if (filters.difficulty) {
        whereClause.difficulty_level = filters.difficulty;
      }

      const homework = await HomeworkSession.findAll({
        where: whereClause,
        order: [['created_at', 'DESC']],
        limit: filters.limit || 20
      });

      return homework;
    } catch (error) {
      console.error('Error getting user homework:', error);
      throw new Error('Failed to retrieve homework history');
    }
  }

  // Get homework statistics
  async getHomeworkStats(userId) {
    try {
      const stats = await HomeworkSession.findAll({
        where: { user_id: userId },
        attributes: [
          'subject',
          'difficulty_level',
          'status',
          'feedback_rating'
        ]
      });

      const analysis = {
        total: stats.length,
        completed: stats.filter(h => h.status === 'completed').length,
        pending: stats.filter(h => h.status === 'pending').length,
        bySubject: {},
        byDifficulty: {},
        averageRating: 0
      };

      // Group by subject
      stats.forEach(hw => {
        analysis.bySubject[hw.subject] = (analysis.bySubject[hw.subject] || 0) + 1;
        analysis.byDifficulty[hw.difficulty_level] = (analysis.byDifficulty[hw.difficulty_level] || 0) + 1;
      });

      // Calculate average rating
      const ratingsSum = stats.reduce((sum, hw) => sum + (hw.feedback_rating || 0), 0);
      const ratingsCount = stats.filter(hw => hw.feedback_rating).length;
      analysis.averageRating = ratingsCount > 0 ? (ratingsSum / ratingsCount).toFixed(1) : 0;

      return analysis;
    } catch (error) {
      console.error('Error getting homework stats:', error);
      return { total: 0, completed: 0, pending: 0, bySubject: {}, byDifficulty: {}, averageRating: 0 };
    }
  }

  // Format homework for Telegram display
  formatHomeworkForTelegram(homework, detailed = false) {
    const subjectEmoji = homework.getSubjectEmoji();
    const difficultyEmoji = homework.getDifficultyEmoji();
    const statusEmoji = {
      'pending': '⏳',
      'processing': '🔄',
      'completed': '✅',
      'failed': '❌',
      'needs_clarification': '❓'
    };

    let message = `${subjectEmoji} *${this.escapeMarkdown(homework.subject)}*\n`;
    message += `${difficultyEmoji} ${homework.difficulty_level} • ${statusEmoji[homework.status]} ${homework.status}\n\n`;

    if (homework.topic) {
      message += `📋 *Topic:* ${this.escapeMarkdown(homework.topic)}\n`;
    }

    message += `❓ *Question:*\n${this.escapeMarkdown(homework.question.substring(0, 200))}${homework.question.length > 200 ? '...' : ''}\n\n`;

    if (detailed && homework.ai_response) {
      message += `💡 *Answer:*\n${this.escapeMarkdown(homework.ai_response.substring(0, 500))}${homework.ai_response.length > 500 ? '...' : ''}\n\n`;
      
      if (homework.step_by_step_solution && homework.step_by_step_solution.length > 0) {
        message += `📋 *Steps:*\n`;
        homework.step_by_step_solution.slice(0, 3).forEach((step, index) => {
          message += `${index + 1}\\. ${this.escapeMarkdown(step)}\n`;
        });
        message += '\n';
      }
    }

    if (homework.confidence_score) {
      const confidence = Math.round(homework.confidence_score * 100);
      message += `🎯 *Confidence:* ${confidence}%\n`;
    }

    if (homework.processing_time_seconds) {
      message += `⏱️ *Processing Time:* ${homework.processing_time_seconds}s\n`;
    }

    return message;
  }

  // Get available subjects
  getAvailableSubjects() {
    return this.subjects;
  }

  // Get question types
  getQuestionTypes() {
    return this.questionTypes;
  }

  // Get difficulty levels
  getDifficultyLevels() {
    return this.difficultyLevels;
  }

  // Get recent homework sessions
  async getRecentHomework(userId, limit = 5) {
    try {
      const sessions = await HomeworkSession.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
        limit: limit,
        attributes: ['id', 'question', 'subject', 'status', 'created_at']
      });

      return sessions.map(session => ({
        id: session.id,
        question: session.question,
        subject: session.subject,
        status: session.status,
        createdAt: session.created_at
      }));
    } catch (error) {
      console.error('Error getting recent homework:', error);
      return [];
    }
  }

  // Helper method to escape markdown
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }
}

module.exports = HomeworkAssistant;