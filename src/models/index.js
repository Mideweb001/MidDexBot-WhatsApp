const { Sequelize } = require('sequelize');
const path = require('path');

// Initialize database (PostgreSQL in production, SQLite in development)
let sequelize;
if (process.env.DATABASE_URL) {
  // Production: Use PostgreSQL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    dialectOptions: {
      ssl: process.env.NODE_ENV === 'production' ? {
        require: true,
        rejectUnauthorized: false
      } : false
    },
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
} else {
  // Development: Use SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(process.cwd(), 'database.sqlite'),
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    define: {
      timestamps: true,
      underscored: true,
      freezeTableName: true
    }
  });
}

// Import models
const User = require('./User')(sequelize);
const Document = require('./Document')(sequelize);
const Conversation = require('./Conversation')(sequelize);
const ProcessedImage = require('./ProcessedImage')(sequelize);
const StudySession = require('./StudySession')(sequelize);
const CryptoAlert = require('./CryptoAlert')(sequelize);
const UserCryptoWatchlist = require('./UserCryptoWatchlist')(sequelize);
const CryptoInventory = require('./CryptoInventory')(sequelize);
const StudyGroup = require('./StudyGroup')(sequelize);
const StudyGroupMember = require('./StudyGroupMember')(sequelize);
const HomeworkSession = require('./HomeworkSession')(sequelize);
const Event = require('./Event')(sequelize);
const Course = require('./Course')(sequelize);
const UserCourse = require('./UserCourse')(sequelize);

// Food ordering models
const Restaurant = require('./Restaurant')(sequelize);
const MenuItem = require('./MenuItem')(sequelize);
const FoodOrder = require('./FoodOrder')(sequelize);
const OrderItem = require('./OrderItem')(sequelize);

// Business marketplace models
const Business = require('./Business')(sequelize);
const Order = require('./Order')(sequelize);

// Hotel booking models
const Hotel = require('./Hotel')(sequelize);
const HotelBooking = require('./HotelBooking')(sequelize);
const HotelReview = require('./HotelReview')(sequelize);

// Define associations (constraints: false to prevent automatic FK references)
User.hasMany(Document, { foreignKey: 'user_id', as: 'documents', constraints: false });
Document.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(Conversation, { foreignKey: 'user_id', as: 'conversations', constraints: false });
Conversation.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(ProcessedImage, { foreignKey: 'user_id', as: 'processedImages', constraints: false });
ProcessedImage.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(StudySession, { foreignKey: 'user_id', as: 'studySessions', constraints: false });
StudySession.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(CryptoAlert, { foreignKey: 'user_id', as: 'cryptoAlerts', constraints: false });
CryptoAlert.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(UserCryptoWatchlist, { foreignKey: 'user_id', as: 'cryptoWatchlist', constraints: false });
UserCryptoWatchlist.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

User.hasMany(CryptoInventory, { foreignKey: 'user_id', as: 'cryptoInventory', constraints: false });
CryptoInventory.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

// Study Group associations
User.hasMany(StudyGroup, { foreignKey: 'creator_id', as: 'createdStudyGroups', constraints: false });
StudyGroup.belongsTo(User, { foreignKey: 'creator_id', as: 'creator', constraints: false });

StudyGroup.hasMany(StudyGroupMember, { foreignKey: 'study_group_id', as: 'members', constraints: false });
StudyGroupMember.belongsTo(StudyGroup, { foreignKey: 'study_group_id', as: 'studyGroup', constraints: false });

User.hasMany(StudyGroupMember, { foreignKey: 'user_id', as: 'studyGroupMemberships', constraints: false });
StudyGroupMember.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

// Many-to-many through StudyGroupMember
User.belongsToMany(StudyGroup, { 
  through: StudyGroupMember, 
  foreignKey: 'user_id',
  otherKey: 'study_group_id',
  as: 'joinedStudyGroups',
  constraints: false
});
StudyGroup.belongsToMany(User, { 
  through: StudyGroupMember, 
  foreignKey: 'study_group_id',
  otherKey: 'user_id',
  as: 'groupMembers',
  constraints: false
});

// Homework associations
User.hasMany(HomeworkSession, { foreignKey: 'user_id', as: 'homeworkSessions', constraints: false });
HomeworkSession.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

StudyGroup.hasMany(HomeworkSession, { foreignKey: 'study_group_id', as: 'sharedHomework', constraints: false });
HomeworkSession.belongsTo(StudyGroup, { foreignKey: 'study_group_id', as: 'studyGroup', constraints: false });

// Event associations
User.hasMany(Event, { foreignKey: 'user_id', as: 'events', constraints: false });
Event.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

StudyGroup.hasMany(Event, { foreignKey: 'study_group_id', as: 'groupEvents', constraints: false });
Event.belongsTo(StudyGroup, { foreignKey: 'study_group_id', as: 'studyGroup', constraints: false });

// Self-referencing for recurring events
Event.hasMany(Event, { foreignKey: 'parent_event_id', as: 'childEvents', constraints: false });
Event.belongsTo(Event, { foreignKey: 'parent_event_id', as: 'parentEvent', constraints: false });

// Course associations
Course.hasMany(UserCourse, { foreignKey: 'course_id', as: 'enrollments', constraints: false });
UserCourse.belongsTo(Course, { foreignKey: 'course_id', as: 'course', constraints: false });

User.hasMany(UserCourse, { foreignKey: 'user_id', as: 'courseEnrollments', constraints: false });
UserCourse.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

// Many-to-many through UserCourse
User.belongsToMany(Course, { 
  through: UserCourse, 
  foreignKey: 'user_id',
  otherKey: 'course_id',
  as: 'enrolledCourses',
  constraints: false
});
Course.belongsToMany(User, { 
  through: UserCourse, 
  foreignKey: 'course_id',
  otherKey: 'user_id',
  as: 'enrolledUsers',
  constraints: false
});

// Restaurant associations
User.hasMany(Restaurant, { foreignKey: 'owner_id', as: 'ownedRestaurants', constraints: false });
Restaurant.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', constraints: false });

Restaurant.hasMany(MenuItem, { foreignKey: 'restaurant_id', as: 'menuItems', constraints: false });
MenuItem.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant', constraints: false });

// Food Order associations
User.hasMany(FoodOrder, { foreignKey: 'customer_id', as: 'foodOrders', constraints: false });
FoodOrder.belongsTo(User, { foreignKey: 'customer_id', as: 'customer', constraints: false });

Restaurant.hasMany(FoodOrder, { foreignKey: 'restaurant_id', as: 'orders', constraints: false });
FoodOrder.belongsTo(Restaurant, { foreignKey: 'restaurant_id', as: 'restaurant', constraints: false });

FoodOrder.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items', constraints: false });
OrderItem.belongsTo(FoodOrder, { foreignKey: 'order_id', as: 'order', constraints: false });

MenuItem.hasMany(OrderItem, { foreignKey: 'menu_item_id', as: 'orderItems', constraints: false });
OrderItem.belongsTo(MenuItem, { foreignKey: 'menu_item_id', as: 'menuItem', constraints: false });

// Business marketplace associations
User.hasMany(Business, { foreignKey: 'owner_id', as: 'businesses', constraints: false });
Business.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', constraints: false });

User.hasMany(Order, { foreignKey: 'customer_id', as: 'orders', constraints: false });
Order.belongsTo(User, { foreignKey: 'customer_id', as: 'customer', constraints: false });

Business.hasMany(Order, { foreignKey: 'business_id', as: 'businessOrders', constraints: false });
Order.belongsTo(Business, { foreignKey: 'business_id', as: 'business', constraints: false });

// Hotel associations
User.hasMany(Hotel, { foreignKey: 'owner_id', as: 'ownedHotels', constraints: false });
Hotel.belongsTo(User, { foreignKey: 'owner_id', as: 'owner', constraints: false });

User.hasMany(HotelBooking, { foreignKey: 'user_id', as: 'hotelBookings', constraints: false });
HotelBooking.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

Hotel.hasMany(HotelBooking, { foreignKey: 'hotel_id', as: 'bookings', constraints: false });
HotelBooking.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel', constraints: false });

User.hasMany(HotelReview, { foreignKey: 'user_id', as: 'hotelReviews', constraints: false });
HotelReview.belongsTo(User, { foreignKey: 'user_id', as: 'user', constraints: false });

Hotel.hasMany(HotelReview, { foreignKey: 'hotel_id', as: 'reviews', constraints: false });
HotelReview.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel', constraints: false });

HotelBooking.hasMany(HotelReview, { foreignKey: 'booking_id', as: 'reviews', constraints: false });
HotelReview.belongsTo(HotelBooking, { foreignKey: 'booking_id', as: 'booking', constraints: false });

module.exports = {
  sequelize,
  User,
  Document,
  Conversation,
  ProcessedImage,
  StudySession,
  CryptoAlert,
  UserCryptoWatchlist,
  CryptoInventory,
  StudyGroup,
  StudyGroupMember,
  HomeworkSession,
  Event,
  Course,
  UserCourse,
  Restaurant,
  MenuItem,
  FoodOrder,
  OrderItem,
  Business,
  Order,
  Hotel,
  HotelBooking,
  HotelReview
};