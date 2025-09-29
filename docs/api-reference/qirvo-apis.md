# Qirvo Integration APIs

The Qirvo Integration APIs provide direct access to Qirvo's core platform features including tasks, calendar, journal, and user data. This guide covers all available integrations and usage patterns.

## Table of Contents

- [Qirvo API Interface](#qirvo-api-interface)
- [Tasks API](#tasks-api)
- [Calendar API](#calendar-api)
- [Journal API](#journal-api)
- [User Data API](#user-data-api)
- [Notifications API](#notifications-api)
- [Integration Patterns](#integration-patterns)

## Qirvo API Interface

### QirvoAPI Definition

```typescript
interface QirvoAPI {
  tasks: TasksAPI;
  calendar: CalendarAPI;
  journal: JournalAPI;
  user: UserAPI;
  notifications: NotificationsAPI;
  analytics: AnalyticsAPI;
}
```

### Accessing Qirvo APIs

```typescript
export default class QirvoIntegratedPlugin extends BasePlugin {
  async onEnable(context: PluginRuntimeContext): Promise<void> {
    if (!context.api.qirvo) {
      this.log('warn', 'Qirvo API not available');
      return;
    }

    const qirvo = context.api.qirvo;
    
    // Access different API modules
    const tasks = qirvo.tasks;
    const calendar = qirvo.calendar;
    const journal = qirvo.journal;
    const user = qirvo.user;
    
    await this.initializeWithQirvoData(qirvo);
  }

  private async initializeWithQirvoData(qirvo: QirvoAPI): Promise<void> {
    // Load initial data from Qirvo
    const recentTasks = await qirvo.tasks.getRecent(10);
    const todayEvents = await qirvo.calendar.getEventsForDate(new Date());
    const recentEntries = await qirvo.journal.getRecent(5);
    
    this.log('info', `Loaded ${recentTasks.length} tasks, ${todayEvents.length} events, ${recentEntries.length} journal entries`);
  }
}
```

## Tasks API

### TasksAPI Interface

```typescript
interface TasksAPI {
  // Read operations
  getAll(filter?: TaskFilter): Promise<Task[]>;
  getById(id: string): Promise<Task | null>;
  getRecent(limit?: number): Promise<Task[]>;
  getByStatus(status: TaskStatus): Promise<Task[]>;
  getByProject(projectId: string): Promise<Task[]>;
  search(query: string): Promise<Task[]>;
  
  // Write operations
  create(task: CreateTaskData): Promise<Task>;
  update(id: string, updates: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  
  // Status operations
  complete(id: string): Promise<Task>;
  reopen(id: string): Promise<Task>;
  archive(id: string): Promise<Task>;
  
  // Batch operations
  bulkUpdate(updates: Array<{ id: string; changes: Partial<Task> }>): Promise<Task[]>;
  bulkDelete(ids: string[]): Promise<void>;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
  projectId?: string;
  tags: string[];
  assigneeId?: string;
  estimatedHours?: number;
  actualHours?: number;
}

type TaskStatus = 'todo' | 'in_progress' | 'completed' | 'archived';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
```

### Tasks API Usage

```typescript
export default class TaskManagerPlugin extends BasePlugin {
  private tasksAPI: TasksAPI;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.tasksAPI = context.api.qirvo.tasks;
    
    // Set up task event listeners
    context.bus.on('task.created', this.onTaskCreated.bind(this));
    context.bus.on('task.completed', this.onTaskCompleted.bind(this));
  }

  async createTask(taskData: CreateTaskData): Promise<Task> {
    try {
      const task = await this.tasksAPI.create({
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        dueDate: taskData.dueDate,
        tags: taskData.tags || [],
        projectId: taskData.projectId
      });

      this.log('info', `Created task: ${task.title}`);
      return task;
    } catch (error) {
      this.log('error', 'Failed to create task:', error);
      throw error;
    }
  }

  async getTasksForToday(): Promise<Task[]> {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const allTasks = await this.tasksAPI.getAll({
      status: ['todo', 'in_progress'],
      dueBefore: today
    });

    return allTasks.filter(task => 
      task.dueDate && task.dueDate <= today
    );
  }

  async getOverdueTasks(): Promise<Task[]> {
    const now = new Date();
    
    return await this.tasksAPI.getAll({
      status: ['todo', 'in_progress'],
      dueBefore: now
    });
  }

  async completeTask(taskId: string): Promise<void> {
    try {
      const task = await this.tasksAPI.complete(taskId);
      
      await this.notify(
        'Task Completed',
        `"${task.title}" has been marked as complete`,
        'success'
      );

      // Track completion time
      if (task.estimatedHours && task.actualHours) {
        await this.trackTaskPerformance(task);
      }
    } catch (error) {
      this.log('error', 'Failed to complete task:', error);
      throw error;
    }
  }

  async getTaskStatistics(): Promise<TaskStatistics> {
    const allTasks = await this.tasksAPI.getAll();
    
    const stats = {
      total: allTasks.length,
      completed: allTasks.filter(t => t.status === 'completed').length,
      inProgress: allTasks.filter(t => t.status === 'in_progress').length,
      overdue: allTasks.filter(t => 
        t.dueDate && t.dueDate < new Date() && t.status !== 'completed'
      ).length
    };

    return {
      ...stats,
      completionRate: stats.total > 0 ? (stats.completed / stats.total) * 100 : 0
    };
  }

  private async onTaskCreated(data: { task: Task }): Promise<void> {
    // React to task creation
    if (data.task.priority === 'urgent') {
      await this.notify(
        'Urgent Task Created',
        `High priority task: ${data.task.title}`,
        'warning'
      );
    }
  }

  private async onTaskCompleted(data: { task: Task }): Promise<void> {
    // Update plugin statistics
    const completedCount = await this.getStorage('completedTasksCount') || 0;
    await this.setStorage('completedTasksCount', completedCount + 1);
  }
}

interface CreateTaskData {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  tags?: string[];
  projectId?: string;
}

interface TaskFilter {
  status?: TaskStatus[];
  priority?: TaskPriority[];
  dueBefore?: Date;
  dueAfter?: Date;
  projectId?: string;
  tags?: string[];
}

interface TaskStatistics {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
  completionRate: number;
}
```

## Calendar API

### CalendarAPI Interface

```typescript
interface CalendarAPI {
  // Read operations
  getEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]>;
  getEventsForDate(date: Date): Promise<CalendarEvent[]>;
  getEventById(id: string): Promise<CalendarEvent | null>;
  getUpcoming(limit?: number): Promise<CalendarEvent[]>;
  
  // Write operations
  createEvent(event: CreateEventData): Promise<CalendarEvent>;
  updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>;
  deleteEvent(id: string): Promise<void>;
  
  // Availability
  getAvailability(date: Date): Promise<AvailabilitySlot[]>;
  findAvailableSlot(duration: number, after?: Date): Promise<AvailabilitySlot | null>;
}

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  location?: string;
  attendees: string[];
  reminders: EventReminder[];
  recurrence?: RecurrenceRule;
  createdAt: Date;
  updatedAt: Date;
}

interface AvailabilitySlot {
  startTime: Date;
  endTime: Date;
  duration: number; // in minutes
}
```

### Calendar API Usage

```typescript
export default class CalendarIntegrationPlugin extends BasePlugin {
  private calendarAPI: CalendarAPI;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.calendarAPI = context.api.qirvo.calendar;
    
    // Set up calendar event listeners
    context.bus.on('calendar.event.created', this.onEventCreated.bind(this));
    context.bus.on('calendar.event.updated', this.onEventUpdated.bind(this));
  }

  async getTodaysSchedule(): Promise<CalendarEvent[]> {
    const today = new Date();
    return await this.calendarAPI.getEventsForDate(today);
  }

  async getWeeklySchedule(): Promise<CalendarEvent[]> {
    const startOfWeek = this.getStartOfWeek(new Date());
    const endOfWeek = this.getEndOfWeek(new Date());
    
    return await this.calendarAPI.getEvents(startOfWeek, endOfWeek);
  }

  async scheduleTaskAsEvent(task: Task): Promise<CalendarEvent> {
    // Find available time slot
    const duration = task.estimatedHours ? task.estimatedHours * 60 : 60; // Default 1 hour
    const availableSlot = await this.calendarAPI.findAvailableSlot(duration);
    
    if (!availableSlot) {
      throw new Error('No available time slot found');
    }

    const event = await this.calendarAPI.createEvent({
      title: `Work on: ${task.title}`,
      description: task.description,
      startTime: availableSlot.startTime,
      endTime: availableSlot.endTime,
      allDay: false,
      reminders: [
        { type: 'notification', minutesBefore: 15 }
      ]
    });

    // Link task to calendar event
    await this.setStorage(`task_${task.id}_event`, event.id);
    
    return event;
  }

  async getUpcomingMeetings(): Promise<CalendarEvent[]> {
    const upcoming = await this.calendarAPI.getUpcoming(10);
    
    // Filter for meetings (events with attendees)
    return upcoming.filter(event => event.attendees.length > 0);
  }

  async checkForConflicts(startTime: Date, endTime: Date): Promise<CalendarEvent[]> {
    const events = await this.calendarAPI.getEvents(startTime, endTime);
    
    return events.filter(event => 
      (event.startTime < endTime && event.endTime > startTime)
    );
  }

  async createRecurringMeeting(data: CreateRecurringMeetingData): Promise<CalendarEvent> {
    return await this.calendarAPI.createEvent({
      title: data.title,
      description: data.description,
      startTime: data.startTime,
      endTime: data.endTime,
      attendees: data.attendees,
      recurrence: {
        frequency: data.frequency,
        interval: data.interval,
        endDate: data.endDate
      },
      reminders: [
        { type: 'notification', minutesBefore: 15 },
        { type: 'email', minutesBefore: 60 }
      ]
    });
  }

  private getStartOfWeek(date: Date): Date {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day;
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  private getEndOfWeek(date: Date): Date {
    const end = new Date(date);
    const day = end.getDay();
    const diff = end.getDate() - day + 6;
    end.setDate(diff);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  private async onEventCreated(data: { event: CalendarEvent }): Promise<void> {
    // React to new calendar events
    if (data.event.attendees.length > 5) {
      this.log('info', `Large meeting scheduled: ${data.event.title}`);
    }
  }
}

interface CreateEventData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  attendees?: string[];
  reminders?: EventReminder[];
  recurrence?: RecurrenceRule;
}

interface CreateRecurringMeetingData {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees: string[];
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  endDate?: Date;
}
```

## Journal API

### JournalAPI Interface

```typescript
interface JournalAPI {
  // Read operations
  getEntries(filter?: JournalFilter): Promise<JournalEntry[]>;
  getEntryById(id: string): Promise<JournalEntry | null>;
  getRecent(limit?: number): Promise<JournalEntry[]>;
  getEntriesForDate(date: Date): Promise<JournalEntry[]>;
  search(query: string): Promise<JournalEntry[]>;
  
  // Write operations
  createEntry(entry: CreateEntryData): Promise<JournalEntry>;
  updateEntry(id: string, updates: Partial<JournalEntry>): Promise<JournalEntry>;
  deleteEntry(id: string): Promise<void>;
  
  // Analytics
  getWritingStats(): Promise<WritingStats>;
  getMoodTrends(days: number): Promise<MoodTrend[]>;
  getWordCloudData(): Promise<WordCloudData>;
}

interface JournalEntry {
  id: string;
  title?: string;
  content: string;
  mood?: number; // 1-10 scale
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  isPrivate: boolean;
  location?: string;
  weather?: string;
}

interface WritingStats {
  totalEntries: number;
  totalWords: number;
  averageWordsPerEntry: number;
  longestStreak: number;
  currentStreak: number;
  entriesThisMonth: number;
  averageMood: number;
}
```

### Journal API Usage

```typescript
export default class JournalAnalyticsPlugin extends BasePlugin {
  private journalAPI: JournalAPI;

  async onEnable(context: PluginRuntimeContext): Promise<void> {
    this.journalAPI = context.api.qirvo.journal;
    
    // Set up journal event listeners
    context.bus.on('journal.entry.created', this.onEntryCreated.bind(this));
  }

  async createDailyReflection(): Promise<JournalEntry> {
    const today = new Date();
    const todayTasks = await this.getTodaysCompletedTasks();
    const todayEvents = await this.getTodaysEvents();

    const reflectionContent = this.generateReflectionContent(todayTasks, todayEvents);

    return await this.journalAPI.createEntry({
      title: `Daily Reflection - ${today.toDateString()}`,
      content: reflectionContent,
      tags: ['daily-reflection', 'auto-generated'],
      isPrivate: false
    });
  }

  async analyzeMoodTrends(): Promise<MoodAnalysis> {
    const trends = await this.journalAPI.getMoodTrends(30); // Last 30 days
    
    const analysis = {
      averageMood: trends.reduce((sum, trend) => sum + trend.mood, 0) / trends.length,
      trendDirection: this.calculateTrendDirection(trends),
      bestDay: trends.reduce((best, current) => 
        current.mood > best.mood ? current : best
      ),
      worstDay: trends.reduce((worst, current) => 
        current.mood < worst.mood ? current : worst
      )
    };

    return analysis;
  }

  async getWritingInsights(): Promise<WritingInsights> {
    const stats = await this.journalAPI.getWritingStats();
    const wordCloud = await this.journalAPI.getWordCloudData();
    
    return {
      productivity: {
        streak: stats.currentStreak,
        consistency: stats.entriesThisMonth / 30, // Entries per day this month
        verbosity: stats.averageWordsPerEntry
      },
      themes: wordCloud.topWords.slice(0, 10),
      recommendations: this.generateWritingRecommendations(stats)
    };
  }

  async searchEmotionalPatterns(emotion: string): Promise<JournalEntry[]> {
    const entries = await this.journalAPI.search(emotion);
    
    // Filter entries that likely contain emotional content
    return entries.filter(entry => {
      const emotionalWords = ['happy', 'sad', 'angry', 'excited', 'worried', 'grateful'];
      const content = entry.content.toLowerCase();
      return emotionalWords.some(word => content.includes(word));
    });
  }

  async createWeeklySummary(): Promise<JournalEntry> {
    const weekStart = this.getStartOfWeek(new Date());
    const weekEnd = this.getEndOfWeek(new Date());
    
    const weekEntries = await this.journalAPI.getEntries({
      startDate: weekStart,
      endDate: weekEnd
    });

    const summary = this.generateWeeklySummary(weekEntries);

    return await this.journalAPI.createEntry({
      title: `Weekly Summary - Week of ${weekStart.toDateString()}`,
      content: summary,
      tags: ['weekly-summary', 'auto-generated'],
      isPrivate: false
    });
  }

  private generateReflectionContent(tasks: Task[], events: CalendarEvent[]): string {
    const completedTasks = tasks.filter(t => t.status === 'completed');
    
    let content = `## Daily Reflection\n\n`;
    content += `### Accomplishments\n`;
    content += `Completed ${completedTasks.length} tasks today:\n`;
    
    completedTasks.forEach(task => {
      content += `- ${task.title}\n`;
    });

    content += `\n### Events\n`;
    content += `Attended ${events.length} events:\n`;
    
    events.forEach(event => {
      content += `- ${event.title} (${event.startTime.toLocaleTimeString()})\n`;
    });

    content += `\n### Reflection\n`;
    content += `[Add your personal reflection here]\n`;

    return content;
  }

  private calculateTrendDirection(trends: MoodTrend[]): 'improving' | 'declining' | 'stable' {
    if (trends.length < 2) return 'stable';
    
    const recent = trends.slice(-7); // Last 7 days
    const earlier = trends.slice(-14, -7); // Previous 7 days
    
    const recentAvg = recent.reduce((sum, t) => sum + t.mood, 0) / recent.length;
    const earlierAvg = earlier.reduce((sum, t) => sum + t.mood, 0) / earlier.length;
    
    const difference = recentAvg - earlierAvg;
    
    if (difference > 0.5) return 'improving';
    if (difference < -0.5) return 'declining';
    return 'stable';
  }

  private generateWritingRecommendations(stats: WritingStats): string[] {
    const recommendations: string[] = [];
    
    if (stats.currentStreak < 3) {
      recommendations.push('Try to write daily to build a consistent habit');
    }
    
    if (stats.averageWordsPerEntry < 50) {
      recommendations.push('Consider writing longer entries to capture more detail');
    }
    
    if (stats.averageMood < 5) {
      recommendations.push('Consider adding gratitude practices to your journaling');
    }
    
    return recommendations;
  }

  private async onEntryCreated(data: { entry: JournalEntry }): Promise<void> {
    // Analyze new entry for insights
    if (data.entry.mood && data.entry.mood >= 8) {
      await this.notify(
        'Great Day!',
        'Your journal entry shows you\'re having a wonderful day!',
        'success'
      );
    }
  }
}

interface CreateEntryData {
  title?: string;
  content: string;
  mood?: number;
  tags?: string[];
  isPrivate?: boolean;
  location?: string;
}

interface JournalFilter {
  startDate?: Date;
  endDate?: Date;
  tags?: string[];
  minMood?: number;
  maxMood?: number;
}

interface MoodTrend {
  date: Date;
  mood: number;
  entryCount: number;
}

interface MoodAnalysis {
  averageMood: number;
  trendDirection: 'improving' | 'declining' | 'stable';
  bestDay: MoodTrend;
  worstDay: MoodTrend;
}

interface WritingInsights {
  productivity: {
    streak: number;
    consistency: number;
    verbosity: number;
  };
  themes: string[];
  recommendations: string[];
}
```

## User Data API

### UserAPI Interface

```typescript
interface UserAPI {
  // Profile
  getProfile(): Promise<UserProfile>;
  updateProfile(updates: Partial<UserProfile>): Promise<UserProfile>;
  
  // Preferences
  getPreferences(): Promise<UserPreferences>;
  updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences>;
  
  // Activity
  getActivity(filter?: ActivityFilter): Promise<UserActivity[]>;
  logActivity(activity: LogActivityData): Promise<UserActivity>;
  
  // Stats
  getStats(): Promise<UserStats>;
  getUsageStats(period: 'day' | 'week' | 'month'): Promise<UsageStats>;
}

interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  timezone: string;
  language: string;
  createdAt: Date;
  lastLoginAt: Date;
}

interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacySettings;
  integrations: IntegrationSettings;
}

interface UserStats {
  totalTasks: number;
  completedTasks: number;
  totalJournalEntries: number;
  totalCalendarEvents: number;
  averageMood: number;
  longestStreak: number;
}
```

## Integration Patterns

### Cross-API Workflows

```typescript
export default class WorkflowPlugin extends BasePlugin {
  async createTaskFromCalendarEvent(eventId: string): Promise<Task> {
    const event = await this.context.api.qirvo.calendar.getEventById(eventId);
    if (!event) {
      throw new Error('Event not found');
    }

    // Create task based on calendar event
    const task = await this.context.api.qirvo.tasks.create({
      title: `Prepare for: ${event.title}`,
      description: `Preparation task for calendar event: ${event.description}`,
      dueDate: new Date(event.startTime.getTime() - 24 * 60 * 60 * 1000), // Day before
      priority: 'medium',
      tags: ['calendar-prep', 'auto-generated']
    });

    // Log the workflow in journal
    await this.context.api.qirvo.journal.createEntry({
      content: `Created preparation task "${task.title}" for upcoming event "${event.title}"`,
      tags: ['workflow', 'automation'],
      isPrivate: false
    });

    return task;
  }

  async generateDailyPlan(): Promise<void> {
    const today = new Date();
    
    // Get today's data
    const [tasks, events, profile] = await Promise.all([
      this.context.api.qirvo.tasks.getAll({ 
        dueBefore: today,
        status: ['todo', 'in_progress'] 
      }),
      this.context.api.qirvo.calendar.getEventsForDate(today),
      this.context.api.qirvo.user.getProfile()
    ]);

    // Generate plan content
    const planContent = this.generatePlanContent(tasks, events, profile);

    // Create journal entry with the plan
    await this.context.api.qirvo.journal.createEntry({
      title: `Daily Plan - ${today.toDateString()}`,
      content: planContent,
      tags: ['daily-plan', 'auto-generated'],
      isPrivate: false
    });

    // Send notification
    await this.notify(
      'Daily Plan Ready',
      'Your daily plan has been generated and saved to your journal',
      'info'
    );
  }

  private generatePlanContent(tasks: Task[], events: CalendarEvent[], profile: UserProfile): string {
    let content = `# Daily Plan for ${new Date().toDateString()}\n\n`;
    
    content += `Good morning, ${profile.name}! Here's your plan for today:\n\n`;
    
    content += `## Schedule\n`;
    events.forEach(event => {
      content += `- ${event.startTime.toLocaleTimeString()} - ${event.title}\n`;
    });
    
    content += `\n## Priority Tasks\n`;
    const priorityTasks = tasks
      .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
      .slice(0, 5);
    
    priorityTasks.forEach(task => {
      content += `- [ ] ${task.title} (${task.priority})\n`;
    });
    
    content += `\n## Focus Areas\n`;
    content += `- Complete high-priority tasks before meetings\n`;
    content += `- Review calendar 15 minutes before each event\n`;
    content += `- Take breaks between focused work sessions\n`;
    
    return content;
  }

  private getPriorityWeight(priority: TaskPriority): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 1;
  }
}
```

## Best Practices

### API Usage
1. **Check Availability**: Always verify API availability before use
2. **Handle Errors**: Implement proper error handling for API calls
3. **Rate Limiting**: Respect API rate limits and implement backoff
4. **Caching**: Cache frequently accessed data to improve performance

### Data Integration
1. **Consistent IDs**: Use consistent ID formats across integrations
2. **Data Validation**: Validate data before creating/updating records
3. **Conflict Resolution**: Handle data conflicts gracefully
4. **Sync Status**: Track synchronization status and handle failures

### User Experience
1. **Permissions**: Request only necessary permissions
2. **Feedback**: Provide clear feedback for long-running operations
3. **Privacy**: Respect user privacy settings
4. **Performance**: Optimize for responsiveness and efficiency

---

This completes the API reference documentation. The Qirvo Integration APIs provide powerful access to platform features while maintaining security and performance standards.
