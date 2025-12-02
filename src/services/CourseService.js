const { Course, UserCourse, User } = require('../models');
const { Op } = require('sequelize');
const axios = require('axios');

class CourseService {
  constructor(databaseService) {
    this.databaseService = databaseService;
    this.apiKeys = {
      youtube: process.env.YOUTUBE_API_KEY,
      coursera: process.env.COURSERA_API_KEY
    };
  }

  // === CORE COURSE OPERATIONS ===

  async createCourse(courseData) {
    try {
      const course = await Course.create(courseData);
      return course;
    } catch (error) {
      console.error('Error creating course:', error);
      throw error;
    }
  }

  async getCourseById(courseId) {
    try {
      const course = await Course.findByPk(courseId, {
        include: [
          { 
            model: UserCourse, 
            as: 'enrollments',
            include: [{ model: User, as: 'user' }]
          }
        ]
      });
      return course;
    } catch (error) {
      console.error('Error getting course by ID:', error);
      throw error;
    }
  }

  async searchCourses(options = {}) {
    try {
      const {
        query = '',
        category = null,
        skill_level = null,
        course_type = null,
        platform = null,
        is_free = true,
        limit = 20,
        offset = 0,
        sort_by = 'rating'
      } = options;

      const whereClause = {
        is_active: true
      };

      if (query) {
        whereClause[Op.or] = [
          { title: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { instructor: { [Op.like]: `%${query}%` } },
          { institution: { [Op.like]: `%${query}%` } }
        ];
      }

      if (category) whereClause.category = category;
      if (skill_level) whereClause.skill_level = skill_level;
      if (course_type) whereClause.course_type = course_type;
      if (platform) whereClause.platform = platform;
      if (is_free !== null) whereClause.is_free = is_free;

      const orderBy = this.getSortOrder(sort_by);

      const courses = await Course.findAll({
        where: whereClause,
        order: orderBy,
        limit,
        offset,
        include: [
          { 
            model: UserCourse, 
            as: 'enrollments',
            attributes: ['enrollment_status', 'progress_percentage'],
            required: false
          }
        ]
      });

      const total = await Course.count({ where: whereClause });

      return { courses, total, hasMore: (offset + limit) < total };
    } catch (error) {
      console.error('Error searching courses:', error);
      throw error;
    }
  }

  async getFeaturedCourses(limit = 10) {
    try {
      const courses = await Course.findAll({
        where: {
          is_active: true,
          is_featured: true,
          is_free: true
        },
        order: [['rating', 'DESC'], ['enrollment_count', 'DESC']],
        limit
      });
      return courses;
    } catch (error) {
      console.error('Error getting featured courses:', error);
      throw error;
    }
  }

  async getCoursesByCategory(category, limit = 20) {
    try {
      const courses = await Course.findAll({
        where: {
          is_active: true,
          category: category,
          is_free: true
        },
        order: [['rating', 'DESC'], ['enrollment_count', 'DESC']],
        limit
      });
      return courses;
    } catch (error) {
      console.error('Error getting courses by category:', error);
      throw error;
    }
  }

  // === USER COURSE MANAGEMENT ===

  async enrollUserInCourse(userId, courseId, enrollmentData = {}) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new Error('Course not found');
      }

      // Check if already enrolled
      const existingEnrollment = await UserCourse.findOne({
        where: { user_id: user.id, course_id: courseId }
      });

      if (existingEnrollment) {
        if (existingEnrollment.enrollment_status === 'dropped') {
          // Re-enroll if previously dropped
          await existingEnrollment.update({
            enrollment_status: 'enrolled',
            enrollment_date: new Date(),
            ...enrollmentData
          });
          return existingEnrollment;
        } else {
          throw new Error('Already enrolled in this course');
        }
      }

      const enrollment = await UserCourse.create({
        user_id: user.id,
        course_id: courseId,
        enrollment_status: 'enrolled',
        ...enrollmentData
      });

      // Update course enrollment count
      await course.increment('enrollment_count');

      return enrollment;
    } catch (error) {
      console.error('Error enrolling user in course:', error);
      throw error;
    }
  }

  async getUserCourses(userId, options = {}) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const {
        status = null,
        limit = 20,
        offset = 0
      } = options;

      const whereClause = { user_id: user.id };
      if (status) whereClause.enrollment_status = status;

      const enrollments = await UserCourse.findAll({
        where: whereClause,
        include: [
          { model: Course, as: 'course' }
        ],
        order: [['last_accessed', 'DESC'], ['enrollment_date', 'DESC']],
        limit,
        offset
      });

      return enrollments;
    } catch (error) {
      console.error('Error getting user courses:', error);
      throw error;
    }
  }

  async updateCourseProgress(userId, courseId, progressData) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const enrollment = await UserCourse.findOne({
        where: { user_id: user.id, course_id: courseId }
      });

      if (!enrollment) {
        throw new Error('Not enrolled in this course');
      }

      await enrollment.updateProgress(
        progressData.percentage,
        progressData.moduleCompleted
      );

      return enrollment;
    } catch (error) {
      console.error('Error updating course progress:', error);
      throw error;
    }
  }

  async getUserCourseStats(userId) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        return {
          totalEnrolled: 0,
          completed: 0,
          inProgress: 0,
          averageRating: 0
        };
      }

      const enrollments = await UserCourse.findAll({
        where: { user_id: user.id },
        include: [{ model: Course, as: 'course' }]
      });

      const stats = {
        totalEnrolled: enrollments.length,
        completed: enrollments.filter(e => e.enrollment_status === 'completed').length,
        inProgress: enrollments.filter(e => e.enrollment_status === 'in_progress').length,
        averageRating: 0
      };

      // Calculate average rating of enrolled courses
      const ratingsSum = enrollments.reduce((sum, e) => {
        return sum + (e.Course?.rating || 0);
      }, 0);
      
      stats.averageRating = stats.totalEnrolled > 0 ? ratingsSum / stats.totalEnrolled : 0;

      return stats;
    } catch (error) {
      console.error('Error getting user course stats:', error);
      return {
        totalEnrolled: 0,
        completed: 0,
        inProgress: 0,
        averageRating: 0
      };
    }
  }

  // === EXTERNAL API INTEGRATIONS ===

  async fetchYouTubeEducationalVideos(query, maxResults = 10) {
    try {
      if (!this.apiKeys.youtube) {
        console.warn('YouTube API key not configured');
        return [];
      }

      const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
        params: {
          part: 'snippet',
          q: `${query} tutorial education course`,
          type: 'video',
          videoDuration: 'medium',
          videoDefinition: 'any',
          maxResults: maxResults,
          key: this.apiKeys.youtube,
          safeSearch: 'strict',
          relevanceLanguage: 'en'
        }
      });

      const videos = response.data.items.map(item => ({
        external_id: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        instructor: item.snippet.channelTitle,
        course_type: 'tutorial',
        category: this.categorizeContent(item.snippet.title + ' ' + item.snippet.description),
        skill_level: 'beginner',
        course_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        video_url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
        thumbnail_url: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.default?.url,
        platform: 'youtube',
        is_free: true,
        language: 'en',
        tags: this.extractTags(item.snippet.title + ' ' + item.snippet.description)
      }));

      return videos;
    } catch (error) {
      console.error('Error fetching YouTube videos:', error);
      return [];
    }
  }

  async fetchKhanAcademyCourses(subject = '') {
    try {
      // Khan Academy has a public API for topics
      const response = await axios.get('https://www.khanacademy.org/api/v1/topics/topictree', {
        timeout: 10000
      });

      const courses = this.parseKhanAcademyTopics(response.data, subject);
      return courses.slice(0, 20); // Limit results
    } catch (error) {
      console.error('Error fetching Khan Academy courses:', error);
      return this.getStaticKhanAcademyCourses(subject);
    }
  }

  async fetchMITOpenCourseWare(category = '') {
    try {
      // Static data since MIT OCW doesn't have a public API
      return this.getStaticMITCourses(category);
    } catch (error) {
      console.error('Error fetching MIT OCW courses:', error);
      return [];
    }
  }

  // === RECOMMENDATION ENGINE ===

  async getRecommendedCourses(userId, limit = 10) {
    try {
      const user = await this.databaseService.getUserByTelegramId(userId);
      if (!user) {
        return await this.getFeaturedCourses(limit);
      }

      // Get user's enrolled courses to understand preferences
      const userCourses = await this.getUserCourses(userId, { limit: 50 });
      
      if (userCourses.length === 0) {
        return await this.getFeaturedCourses(limit);
      }

      // Analyze user preferences
      const preferences = this.analyzeUserPreferences(userCourses);
      
      // Find recommended courses based on preferences
      const recommendations = await Course.findAll({
        where: {
          is_active: true,
          is_free: true,
          [Op.or]: [
            { category: { [Op.in]: preferences.categories } },
            { skill_level: preferences.nextSkillLevel },
            { course_type: { [Op.in]: preferences.courseTypes } }
          ],
          id: { 
            [Op.notIn]: userCourses.map(uc => uc.course_id) 
          }
        },
        order: [['rating', 'DESC'], ['enrollment_count', 'DESC']],
        limit
      });

      return recommendations;
    } catch (error) {
      console.error('Error getting recommended courses:', error);
      return await this.getFeaturedCourses(limit);
    }
  }

  // === UTILITY METHODS ===

  getSortOrder(sortBy) {
    const sortOptions = {
      'rating': [['rating', 'DESC']],
      'popularity': [['enrollment_count', 'DESC']],
      'newest': [['created_at', 'DESC']],
      'title': [['title', 'ASC']],
      'duration': [['duration_hours', 'ASC']]
    };
    return sortOptions[sortBy] || sortOptions['rating'];
  }

  categorizeContent(text) {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('trading') || lowerText.includes('forex') || lowerText.includes('stock')) {
      return 'trading';
    }
    if (lowerText.includes('crypto') || lowerText.includes('bitcoin') || lowerText.includes('blockchain')) {
      return 'cryptocurrency';
    }
    if (lowerText.includes('math') || lowerText.includes('calculus') || lowerText.includes('algebra')) {
      return 'mathematics';
    }
    if (lowerText.includes('programming') || lowerText.includes('coding') || lowerText.includes('javascript')) {
      return 'programming';
    }
    if (lowerText.includes('business') || lowerText.includes('entrepreneur') || lowerText.includes('marketing')) {
      return 'business';
    }
    if (lowerText.includes('science') || lowerText.includes('physics') || lowerText.includes('chemistry')) {
      return 'science';
    }
    if (lowerText.includes('english') || lowerText.includes('writing') || lowerText.includes('grammar')) {
      return 'english';
    }
    
    return 'other';
  }

  extractTags(text) {
    const commonTags = [
      'beginner', 'advanced', 'tutorial', 'course', 'learn', 'guide', 
      'basics', 'fundamentals', 'complete', 'master', 'step-by-step'
    ];
    
    const lowerText = text.toLowerCase();
    return commonTags.filter(tag => lowerText.includes(tag));
  }

  analyzeUserPreferences(userCourses) {
    const categories = {};
    const skillLevels = {};
    const courseTypes = {};
    
    userCourses.forEach(uc => {
      const course = uc.course;
      categories[course.category] = (categories[course.category] || 0) + 1;
      skillLevels[course.skill_level] = (skillLevels[course.skill_level] || 0) + 1;
      courseTypes[course.course_type] = (courseTypes[course.course_type] || 0) + 1;
    });

    const topCategories = Object.keys(categories)
      .sort((a, b) => categories[b] - categories[a])
      .slice(0, 3);

    const topSkillLevel = Object.keys(skillLevels)
      .sort((a, b) => skillLevels[b] - skillLevels[a])[0];

    const nextSkillLevel = this.getNextSkillLevel(topSkillLevel);

    const topCourseTypes = Object.keys(courseTypes)
      .sort((a, b) => courseTypes[b] - courseTypes[a])
      .slice(0, 2);

    return {
      categories: topCategories,
      nextSkillLevel,
      courseTypes: topCourseTypes
    };
  }

  getNextSkillLevel(currentLevel) {
    const levelProgression = {
      'beginner': 'intermediate',
      'intermediate': 'advanced',
      'advanced': 'expert',
      'expert': 'expert'
    };
    return levelProgression[currentLevel] || 'intermediate';
  }

  // Static course data for fallbacks
  getStaticKhanAcademyCourses(subject) {
    const courses = [
      {
        title: 'Algebra Basics',
        description: 'Learn the fundamentals of algebra including variables, equations, and graphing.',
        instructor: 'Khan Academy',
        institution: 'Khan Academy',
        category: 'mathematics',
        skill_level: 'beginner',
        course_url: 'https://www.khanacademy.org/math/algebra-basics',
        platform: 'khan_academy',
        is_free: true,
        duration_hours: 20,
        rating: 4.8
      },
      {
        title: 'Introduction to Programming',
        description: 'Learn the basics of computer programming with JavaScript.',
        instructor: 'Khan Academy',
        institution: 'Khan Academy',
        category: 'programming',
        skill_level: 'beginner',
        course_url: 'https://www.khanacademy.org/computing/computer-programming',
        platform: 'khan_academy',
        is_free: true,
        duration_hours: 15,
        rating: 4.7
      },
      {
        title: 'Personal Finance',
        description: 'Learn about budgeting, saving, investing, and personal finance management.',
        instructor: 'Khan Academy',
        institution: 'Khan Academy',
        category: 'finance',
        skill_level: 'beginner',
        course_url: 'https://www.khanacademy.org/college-careers-more/personal-finance',
        platform: 'khan_academy',
        is_free: true,
        duration_hours: 12,
        rating: 4.6
      }
    ];

    if (subject) {
      const lowerSubject = subject.toLowerCase();
      return courses.filter(course => 
        course.category.includes(lowerSubject) ||
        course.title.toLowerCase().includes(lowerSubject)
      );
    }

    return courses;
  }

  getStaticMITCourses(category) {
    const courses = [
      {
        title: 'Introduction to Computer Science and Programming',
        description: 'A comprehensive introduction to computer science using Python.',
        instructor: 'MIT Faculty',
        institution: 'MIT',
        category: 'programming',
        skill_level: 'intermediate',
        course_url: 'https://ocw.mit.edu/courses/electrical-engineering-and-computer-science/6-00-introduction-to-computer-science-and-programming-fall-2008/',
        platform: 'mit_ocw',
        is_free: true,
        duration_weeks: 12,
        rating: 4.9
      },
      {
        title: 'Financial Theory',
        description: 'Principles of financial theory and their applications.',
        instructor: 'MIT Sloan',
        institution: 'MIT',
        category: 'finance',
        skill_level: 'advanced',
        course_url: 'https://ocw.mit.edu/courses/sloan-school-of-management/15-401-finance-theory-i-fall-2008/',
        platform: 'mit_ocw',
        is_free: true,
        duration_weeks: 16,
        rating: 4.8
      }
    ];

    if (category) {
      return courses.filter(course => course.category === category);
    }

    return courses;
  }

  parseKhanAcademyTopics(data, subject) {
    // This would parse the Khan Academy API response
    // For now, return static data
    return this.getStaticKhanAcademyCourses(subject);
  }

  async populateInitialCourses() {
    try {
      console.log('🔄 Populating initial course database...');
      
      const existingCount = await Course.count();
      if (existingCount > 0) {
        console.log(`📚 ${existingCount} courses already in database`);
        return;
      }

      // Add static courses from multiple platforms
      const khanCourses = this.getStaticKhanAcademyCourses();
      const mitCourses = this.getStaticMITCourses();
      
      const allCourses = [...khanCourses, ...mitCourses];
      
      for (const courseData of allCourses) {
        await Course.create(courseData);
      }

      console.log(`✅ Added ${allCourses.length} initial courses to database`);
    } catch (error) {
      console.error('Error populating initial courses:', error);
    }
  }
}

module.exports = CourseService;