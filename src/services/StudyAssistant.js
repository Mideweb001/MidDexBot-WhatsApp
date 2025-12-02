const { OpenAI } = require('openai');

class StudyAssistant {
  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    }) : null;
    
    // Store active study sessions
    this.studySessions = new Map(); // chatId -> session data
    this.studyTimers = new Map(); // chatId -> timer data
    
    if (!this.openai) {
      console.warn('⚠️ OpenAI API key not provided - using fallback study assistance');
    }
  }

  async instantResearch(query, chatId) {
    try {
      console.log('🔮 MidDexBot researching:', query);
      
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert research assistant. Provide comprehensive, accurate, and well-structured research on any topic. Include key facts, statistics, different perspectives, and credible sources when possible. Format your response clearly with headings and bullet points."
            },
            {
              role: "user",
              content: `Research this topic thoroughly: ${query}\n\nProvide:\n1. Overview and key concepts\n2. Important facts and statistics\n3. Different perspectives or viewpoints\n4. Current trends or developments\n5. Practical applications or implications\n6. Suggested further reading topics`
            }
          ],
          max_tokens: 1500,
          temperature: 0.3
        });

        const research = completion.choices[0].message.content;
        
        return {
          success: true,
          research: research,
          query: query,
          timestamp: new Date(),
          sources: this.extractSources(research),
          keyTopics: this.extractKeyTopics(research)
        };
      } else {
        return this.fallbackResearch(query);
      }
    } catch (error) {
      console.error('🔻 Research error:', error);
      return this.fallbackResearch(query);
    }
  }

  async createSmartNotes(content, topic, chatId) {
    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a professional note-taking assistant. Transform raw content into well-structured, organized study notes with clear headings, bullet points, key concepts, and summaries. Make the notes easy to review and study from."
            },
            {
              role: "user",
              content: `Create comprehensive study notes from this content about "${topic}":\n\n${content}\n\nStructure the notes with:\n1. Main topic overview\n2. Key concepts and definitions\n3. Important details and examples\n4. Summary points\n5. Study questions for review`
            }
          ],
          max_tokens: 1200,
          temperature: 0.2
        });

        const notes = completion.choices[0].message.content;
        
        return {
          success: true,
          notes: notes,
          topic: topic,
          wordCount: this.countWords(notes),
          sections: this.extractSections(notes),
          timestamp: new Date()
        };
      } else {
        return this.fallbackCreateNotes(content, topic);
      }
    } catch (error) {
      console.error('🔻 Smart notes error:', error);
      return this.fallbackCreateNotes(content, topic);
    }
  }

  async homeworkHelper(problem, subject, chatId) {
    try {
      if (this.openai) {
        const completion = await this.openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert tutor who helps students understand problems step-by-step. Never just give answers - always explain the reasoning, show the process, and help students learn the concepts. Break down complex problems into manageable steps."
            },
            {
              role: "user",
              content: `Help me understand this ${subject} problem:\n\n${problem}\n\nPlease:\n1. Identify what type of problem this is\n2. Explain the key concepts needed\n3. Break down the solution step-by-step\n4. Show the reasoning for each step\n5. Provide tips for similar problems\n6. Suggest practice exercises`
            }
          ],
          max_tokens: 1500,
          temperature: 0.2
        });

        const explanation = completion.choices[0].message.content;
        
        return {
          success: true,
          explanation: explanation,
          problem: problem,
          subject: subject,
          steps: this.extractSteps(explanation),
          concepts: this.extractConcepts(explanation),
          timestamp: new Date()
        };
      } else {
        return this.fallbackHomeworkHelp(problem, subject);
      }
    } catch (error) {
      console.error('🔻 Homework helper error:', error);
      return this.fallbackHomeworkHelp(problem, subject);
    }
  }

  createStudyPlan(subjects, timeframe, goals, chatId) {
    const studySession = {
      id: Date.now(),
      chatId: chatId,
      subjects: subjects,
      timeframe: timeframe,
      goals: goals,
      createdAt: new Date(),
      schedule: this.generateSchedule(subjects, timeframe),
      progress: {}
    };

    this.studySessions.set(chatId, studySession);
    
    return {
      success: true,
      studyPlan: studySession,
      schedule: studySession.schedule,
      tips: this.getStudyTips(subjects)
    };
  }

  startStudyTimer(duration, subject, chatId) {
    const timer = {
      id: Date.now(),
      chatId: chatId,
      subject: subject,
      duration: duration, // in minutes
      startTime: new Date(),
      endTime: new Date(Date.now() + (duration * 60 * 1000)),
      status: 'active'
    };

    this.studyTimers.set(chatId, timer);
    
    return {
      success: true,
      timer: timer,
      message: `🕐 Study timer started for ${subject} (${duration} minutes)`
    };
  }

  getTimerStatus(chatId) {
    const timer = this.studyTimers.get(chatId);
    if (!timer) {
      return { success: false, message: 'No active timer found' };
    }

    const now = new Date();
    const timeLeft = timer.endTime - now;
    
    if (timeLeft <= 0) {
      timer.status = 'completed';
      return {
        success: true,
        status: 'completed',
        message: `⏰ Study session for ${timer.subject} completed!`,
        timer: timer
      };
    }

    const minutesLeft = Math.ceil(timeLeft / (1000 * 60));
    return {
      success: true,
      status: 'active',
      minutesLeft: minutesLeft,
      message: `⏱️ ${minutesLeft} minutes remaining for ${timer.subject}`,
      timer: timer
    };
  }

  // Helper methods
  extractSources(text) {
    // Extract potential source references
    const sources = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.includes('source:') || line.includes('reference:') || line.includes('study:')) {
        sources.push(line.trim());
      }
    });
    return sources.slice(0, 5); // Limit to 5 sources
  }

  extractKeyTopics(text) {
    const topics = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.includes('##') || line.includes('**')) {
        const cleaned = line.replace(/[#*]/g, '').trim();
        if (cleaned.length > 0) topics.push(cleaned);
      }
    });
    return topics.slice(0, 8); // Limit to 8 key topics
  }

  extractSections(text) {
    const sections = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.match(/^\d+\./) || line.includes('##')) {
        sections.push(line.trim());
      }
    });
    return sections;
  }

  extractSteps(text) {
    const steps = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.match(/^Step \d+/) || line.match(/^\d+\./) || line.includes('Step:')) {
        steps.push(line.trim());
      }
    });
    return steps;
  }

  extractConcepts(text) {
    const concepts = [];
    const keywordPatterns = ['concept:', 'key idea:', 'important:', 'remember:'];
    const lines = text.split('\n');
    
    lines.forEach(line => {
      keywordPatterns.forEach(pattern => {
        if (line.toLowerCase().includes(pattern)) {
          concepts.push(line.trim());
        }
      });
    });
    return concepts.slice(0, 5);
  }

  generateSchedule(subjects, timeframe) {
    const schedule = [];
    const dailyHours = timeframe === 'intensive' ? 6 : timeframe === 'regular' ? 4 : 2;
    
    subjects.forEach((subject, index) => {
      const hoursPerSubject = Math.floor(dailyHours / subjects.length);
      schedule.push({
        subject: subject,
        dailyHours: hoursPerSubject,
        suggestedTimes: this.getSuggestedTimes(index, hoursPerSubject),
        topics: []
      });
    });
    
    return schedule;
  }

  getSuggestedTimes(index, hours) {
    const baseHour = 9 + (index * 2); // Start at 9 AM, space 2 hours apart
    const times = [];
    
    for (let i = 0; i < hours; i++) {
      const hour = baseHour + i;
      if (hour < 22) { // Don't go past 10 PM
        times.push(`${hour}:00 - ${hour + 1}:00`);
      }
    }
    
    return times;
  }

  getStudyTips(subjects) {
    const generalTips = [
      '🧠 Take breaks every 25-30 minutes',
      '💧 Stay hydrated while studying',
      '🎯 Set specific goals for each session',
      '📱 Minimize distractions',
      '📝 Take notes while learning'
    ];

    const subjectSpecificTips = {
      'math': ['Practice problems daily', 'Show your work step by step'],
      'science': ['Create concept maps', 'Do hands-on experiments'],
      'language': ['Practice speaking daily', 'Read extensively'],
      'history': ['Create timelines', 'Connect events to modern day'],
      'literature': ['Analyze themes and characters', 'Read aloud for better comprehension']
    };

    const tips = [...generalTips];
    subjects.forEach(subject => {
      const specificTips = subjectSpecificTips[subject.toLowerCase()];
      if (specificTips) {
        tips.push(...specificTips.map(tip => `📚 ${subject}: ${tip}`));
      }
    });

    return tips.slice(0, 8);
  }

  countWords(text) {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  // Fallback methods when OpenAI is not available
  fallbackResearch(query) {
    return {
      success: true,
      research: `Research Topic: ${query}\n\nThis topic requires comprehensive research. Consider exploring:\n• Key concepts and definitions\n• Historical background\n• Current developments\n• Different perspectives\n• Practical applications\n\nFor detailed research, please ensure OpenAI integration is properly configured.`,
      query: query,
      timestamp: new Date(),
      sources: [],
      keyTopics: [query]
    };
  }

  fallbackCreateNotes(content, topic) {
    const words = this.countWords(content);
    return {
      success: true,
      notes: `Study Notes: ${topic}\n\nContent Summary:\n${content.substring(0, 500)}${content.length > 500 ? '...' : ''}\n\nKey Points to Review:\n• Main concepts from the content\n• Important details and examples\n• Areas requiring further study`,
      topic: topic,
      wordCount: words,
      sections: ['Summary', 'Key Points'],
      timestamp: new Date()
    };
  }

  fallbackHomeworkHelp(problem, subject) {
    return {
      success: true,
      explanation: `${subject} Problem Analysis:\n\nProblem: ${problem}\n\nTo solve this problem:\n1. Identify the key concepts involved\n2. Break down the problem into smaller parts\n3. Apply relevant formulas or methods\n4. Check your work\n\nFor detailed step-by-step solutions, please ensure OpenAI integration is configured.`,
      problem: problem,
      subject: subject,
      steps: ['Analyze', 'Break down', 'Apply methods', 'Verify'],
      concepts: [subject],
      timestamp: new Date()
    };
  }
}

module.exports = StudyAssistant;