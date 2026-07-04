import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  products: {
    type: [mongoose.Schema.Types.Mixed],
    default: []
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const conversationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  messages: [messageSchema],
  
  // Context
  context: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Metadata
  isActive: {
    type: Boolean,
    default: true
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ sessionId: 1 });
conversationSchema.index({ isActive: 1 });

// Update lastMessageAt on new message
conversationSchema.pre('save', function(next) {
  if (this.isModified('messages')) {
    this.lastMessageAt = new Date();
  }
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

export default Conversation;
