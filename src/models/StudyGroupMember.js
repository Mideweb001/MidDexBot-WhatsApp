const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudyGroupMember = sequelize.define('StudyGroupMember', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    study_group_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'study_groups',
        key: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      // Association-based FK; explicit reference removed to avoid case issues on Postgres
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    },
    role: {
      type: DataTypes.ENUM('creator', 'admin', 'member'),
      allowNull: false,
      defaultValue: 'member'
    },
    join_date: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'pending', 'banned'),
      allowNull: false,
      defaultValue: 'active'
    },
    contribution_score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    attendance_rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
        max: 100
      }
    },
    last_active: {
      type: DataTypes.DATE,
      allowNull: true
    },
    notifications_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    favorite: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    achievements: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: []
    }
  }, {
    tableName: 'study_group_members',
    indexes: [
      { fields: ['study_group_id'] },
      { fields: ['user_id'] },
      { fields: ['study_group_id', 'user_id'], unique: true },
      { fields: ['role'] },
      { fields: ['status'] },
      { fields: ['join_date'] },
      { fields: ['contribution_score'] },
      { fields: ['favorite'] }
    ]
  });

  // Instance methods
  StudyGroupMember.prototype.isCreator = function() {
    return this.role === 'creator';
  };

  StudyGroupMember.prototype.isAdmin = function() {
    return this.role === 'admin' || this.role === 'creator';
  };

  StudyGroupMember.prototype.canManageGroup = function() {
    return this.isAdmin() && this.status === 'active';
  };

  StudyGroupMember.prototype.updateActivity = async function() {
    this.last_active = new Date();
    return await this.save();
  };

  StudyGroupMember.prototype.addContribution = async function(points = 1) {
    this.contribution_score += points;
    return await this.save();
  };

  StudyGroupMember.prototype.updateAttendance = async function(attended, total) {
    if (total > 0) {
      this.attendance_rate = (attended / total) * 100;
      return await this.save();
    }
  };

  return StudyGroupMember;
};