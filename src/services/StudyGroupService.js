const { StudyGroup, StudyGroupMember, User } = require('../models');
const { Op } = require('sequelize');

class StudyGroupService {
  constructor() {
    this.subjects = [
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
      'Engineering', 'Medicine', 'Business', 'Economics', 'Psychology',
      'History', 'Literature', 'Philosophy', 'Art', 'Languages',
      'Law', 'Political Science', 'Sociology', 'Anthropology', 'Geography',
      'Environmental Science', 'Data Science', 'Machine Learning', 'Statistics'
    ];

    this.commonInterests = [
      'Programming', 'Research', 'Projects', 'Competitions', 'Certifications',
      'Exam Prep', 'Homework Help', 'Tutoring', 'Discussion Groups',
      'Study Sessions', 'Career Development', 'Networking', 'Presentations'
    ];
  }

  // Create a new study group
  async createStudyGroup(creatorId, groupData) {
    try {
      const studyGroup = await StudyGroup.create({
        creator_id: creatorId,
        name: groupData.name,
        description: groupData.description || '',
        subject: groupData.subject,
        interests: groupData.interests || [],
        location: groupData.location || null,
        location_type: groupData.location_type || 'online',
        max_members: groupData.max_members || 10,
        study_level: groupData.study_level || 'mixed',
        meeting_schedule: groupData.meeting_schedule || {},
        timezone: groupData.timezone || 'UTC',
        language: groupData.language || 'en',
        is_public: groupData.is_public !== false,
        tags: groupData.tags || [],
        rules: groupData.rules || '',
        study_goals: groupData.study_goals || ''
      });

      // Add creator as admin member
      await StudyGroupMember.create({
        study_group_id: studyGroup.id,
        user_id: creatorId,
        role: 'creator',
        status: 'active'
      });

      return studyGroup;
    } catch (error) {
      console.error('Error creating study group:', error);
      throw new Error('Failed to create study group');
    }
  }

  // Join a study group
  async joinStudyGroup(userId, groupId, joinCode = null) {
    try {
      const studyGroup = await StudyGroup.findByPk(groupId);
      if (!studyGroup) {
        throw new Error('Study group not found');
      }

      if (!studyGroup.is_active) {
        throw new Error('Study group is not active');
      }

      if (studyGroup.isFull()) {
        throw new Error('Study group is full');
      }

      // Check if user is already a member
      const existingMember = await StudyGroupMember.findOne({
        where: { study_group_id: groupId, user_id: userId }
      });

      if (existingMember) {
        if (existingMember.status === 'active') {
          throw new Error('You are already a member of this group');
        } else if (existingMember.status === 'banned') {
          throw new Error('You have been banned from this group');
        } else {
          // Reactivate membership
          existingMember.status = 'active';
          existingMember.join_date = new Date();
          await existingMember.save();
          await studyGroup.addMember();
          return existingMember;
        }
      }

      // Verify join code for private groups
      if (!studyGroup.is_public && joinCode !== studyGroup.join_code) {
        throw new Error('Invalid join code');
      }

      // Create membership
      const membership = await StudyGroupMember.create({
        study_group_id: groupId,
        user_id: userId,
        role: 'member',
        status: 'active'
      });

      await studyGroup.addMember();
      return membership;
    } catch (error) {
      console.error('Error joining study group:', error);
      throw error;
    }
  }

  // Leave a study group
  async leaveStudyGroup(userId, groupId) {
    try {
      const membership = await StudyGroupMember.findOne({
        where: { study_group_id: groupId, user_id: userId },
        include: [{ model: StudyGroup, as: 'studyGroup' }]
      });

      if (!membership) {
        throw new Error('You are not a member of this group');
      }

      if (membership.role === 'creator') {
        // Transfer ownership or delete group if no other admins
        const adminCount = await StudyGroupMember.count({
          where: { 
            study_group_id: groupId, 
            role: 'admin',
            status: 'active',
            user_id: { [Op.ne]: userId }
          }
        });

        if (adminCount === 0) {
          // No other admins, promote oldest member or delete group
          const oldestMember = await StudyGroupMember.findOne({
            where: { 
              study_group_id: groupId,
              user_id: { [Op.ne]: userId },
              status: 'active'
            },
            order: [['join_date', 'ASC']]
          });

          if (oldestMember) {
            oldestMember.role = 'creator';
            await oldestMember.save();
          } else {
            // No other members, delete group
            await StudyGroup.destroy({ where: { id: groupId } });
            return { groupDeleted: true };
          }
        }
      }

      await membership.destroy();
      await membership.studyGroup.removeMember();
      
      return { success: true };
    } catch (error) {
      console.error('Error leaving study group:', error);
      throw error;
    }
  }

  // Find matching study groups for a user
  async findMatchingGroups(userId, preferences = {}, limit = 10) {
    try {
      const whereClause = {
        is_active: true,
        is_public: true,
        current_members: { [Op.lt]: StudyGroup.sequelize.col('max_members') }
      };

      // Filter by subject
      if (preferences.subject) {
        whereClause.subject = preferences.subject;
      }

      // Filter by location type
      if (preferences.location_type) {
        whereClause.location_type = preferences.location_type;
      }

      // Filter by study level
      if (preferences.study_level) {
        whereClause[Op.or] = [
          { study_level: preferences.study_level },
          { study_level: 'mixed' }
        ];
      }

      const groups = await StudyGroup.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'username']
          },
          {
            model: StudyGroupMember,
            as: 'members',
            where: { user_id: { [Op.ne]: userId } },
            required: false
          }
        ],
        limit: limit * 2 // Get more to filter out groups user is already in
      });

      // Filter out groups user is already a member of
      const userMemberships = await StudyGroupMember.findAll({
        where: { user_id: userId, status: 'active' },
        attributes: ['study_group_id']
      });
      
      const memberGroupIds = userMemberships.map(m => m.study_group_id);
      const availableGroups = groups.filter(g => !memberGroupIds.includes(g.id));

      // Calculate matching scores and sort
      const scoredGroups = availableGroups.map(group => ({
        ...group.toJSON(),
        matchingScore: group.getMatchingScore(preferences)
      }));

      return scoredGroups
        .sort((a, b) => b.matchingScore - a.matchingScore)
        .slice(0, limit);
    } catch (error) {
      console.error('Error finding matching groups:', error);
      throw new Error('Failed to find matching groups');
    }
  }

  // Get user's study groups
  async getUserStudyGroups(userId) {
    try {
      const memberships = await StudyGroupMember.findAll({
        where: { user_id: userId, status: 'active' },
        include: [
          {
            model: StudyGroup,
            as: 'studyGroup',
            include: [
              {
                model: User,
                as: 'creator',
                attributes: ['id', 'first_name', 'username']
              }
            ]
          }
        ],
        order: [['join_date', 'DESC']]
      });

      return memberships.map(membership => ({
        ...membership.studyGroup.toJSON(),
        membershipInfo: {
          role: membership.role,
          join_date: membership.join_date,
          contribution_score: membership.contribution_score,
          attendance_rate: membership.attendance_rate,
          favorite: membership.favorite
        }
      }));
    } catch (error) {
      console.error('Error getting user study groups:', error);
      throw new Error('Failed to get user study groups');
    }
  }

  // Get study group details with members
  async getStudyGroupDetails(groupId, userId = null) {
    try {
      const studyGroup = await StudyGroup.findByPk(groupId, {
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'username']
          },
          {
            model: StudyGroupMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'first_name', 'username']
              }
            ],
            where: { status: 'active' }
          }
        ]
      });

      if (!studyGroup) {
        throw new Error('Study group not found');
      }

      const result = studyGroup.toJSON();

      // Add user-specific info if userId provided
      if (userId) {
        const userMembership = result.members.find(m => m.user_id === userId);
        result.userMembership = userMembership || null;
        result.canJoin = studyGroup.canUserJoin(userId);
      }

      return result;
    } catch (error) {
      console.error('Error getting study group details:', error);
      throw error;
    }
  }

  // Search study groups
  async searchStudyGroups(query, filters = {}) {
    try {
      const whereClause = {
        is_active: true,
        is_public: true,
        [Op.or]: [
          { name: { [Op.like]: `%${query}%` } },
          { description: { [Op.like]: `%${query}%` } },
          { subject: { [Op.like]: `%${query}%` } }
        ]
      };

      if (filters.subject) {
        whereClause.subject = filters.subject;
      }

      if (filters.location_type) {
        whereClause.location_type = filters.location_type;
      }

      if (filters.study_level) {
        whereClause[Op.and] = whereClause[Op.and] || [];
        whereClause[Op.and].push({
          [Op.or]: [
            { study_level: filters.study_level },
            { study_level: 'mixed' }
          ]
        });
      }

      const groups = await StudyGroup.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'first_name', 'username']
          }
        ],
        order: [['created_at', 'DESC']],
        limit: 20
      });

      return groups;
    } catch (error) {
      console.error('Error searching study groups:', error);
      throw new Error('Failed to search study groups');
    }
  }

  // Generate group suggestions based on user activity
  async generateGroupSuggestions(userId) {
    try {
      // Get user's current groups to understand preferences
      const userGroups = await this.getUserStudyGroups(userId);
      
      if (userGroups.length === 0) {
        // New user, show popular groups
        return await StudyGroup.findAll({
          where: { 
            is_active: true, 
            is_public: true,
            current_members: { [Op.gte]: 3 }
          },
          include: [
            {
              model: User,
              as: 'creator',
              attributes: ['id', 'first_name', 'username']
            }
          ],
          order: [['current_members', 'DESC']],
          limit: 5
        });
      }

      // Extract user preferences from existing groups
      const subjects = [...new Set(userGroups.map(g => g.subject))];
      const interests = userGroups.reduce((acc, g) => [...acc, ...(g.interests || [])], []);
      const locations = [...new Set(userGroups.map(g => g.location).filter(Boolean))];

      // Find similar groups
      const suggestions = await this.findMatchingGroups(userId, {
        subjects,
        interests,
        location: locations[0] // Use first location as preference
      }, 5);

      return suggestions;
    } catch (error) {
      console.error('Error generating group suggestions:', error);
      return [];
    }
  }

  // Format study group for Telegram display
  formatStudyGroupForTelegram(group, detailed = false) {
    const statusEmoji = {
      online: '💻',
      'in-person': '🏢',
      hybrid: '🔄'
    };

    const levelEmoji = {
      beginner: '🟢',
      intermediate: '🟡',
      advanced: '🔴',
      mixed: '🎯'
    };

    let message = `${statusEmoji[group.location_type] || '📚'} *${this.escapeMarkdown(group.name)}*\n`;
    message += `📖 Subject: ${this.escapeMarkdown(group.subject)}\n`;
    message += `${levelEmoji[group.study_level]} Level: ${group.study_level}\n`;
    message += `👥 Members: ${group.current_members}/${group.max_members}\n`;

    if (group.location && group.location_type !== 'online') {
      message += `📍 Location: ${this.escapeMarkdown(group.location)}\n`;
    }

    if (detailed) {
      if (group.description) {
        message += `\n📝 *Description:*\n${this.escapeMarkdown(group.description)}\n`;
      }

      if (group.interests && group.interests.length > 0) {
        message += `\n🎯 *Interests:* ${group.interests.map(i => this.escapeMarkdown(i)).join(', ')}\n`;
      }

      if (group.study_goals) {
        message += `\n🎯 *Goals:* ${this.escapeMarkdown(group.study_goals)}\n`;
      }

      if (group.next_meeting) {
        const meetingDate = new Date(group.next_meeting);
        message += `\n📅 *Next Meeting:* ${meetingDate.toLocaleDateString()}\n`;
      }

      if (group.matchingScore !== undefined) {
        message += `\n✨ *Match Score:* ${group.matchingScore}%\n`;
      }
    }

    return message;
  }

  // Get available subjects
  getAvailableSubjects() {
    return this.subjects;
  }

  // Get common interests
  getCommonInterests() {
    return this.commonInterests;
  }

  // Helper method to escape markdown
  escapeMarkdown(text) {
    if (!text) return '';
    return text.replace(/[_*[\]()~`>#+=|{}.!-]/g, '\\$&');
  }
}

module.exports = new StudyGroupService();