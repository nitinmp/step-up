import { relations } from "drizzle-orm";
import {
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  mobile: varchar("mobile", { length: 15 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),
  profileImageUrl: text("profile_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const challengeDay = pgTable("challenge_day", {
  date: date("date").primaryKey(),
  weekNo: integer("week_no").notNull(),
  dayRate: integer("day_rate").notNull(),
  targetSteps: integer("target_steps").notNull(),
});

export const challengeConfig = pgTable("challenge_config", {
  id: integer("id").primaryKey().default(1),
  starOfDayPoints: integer("star_of_day_points").notNull().default(50),
  starOfWeekPoints: integer("star_of_week_points").notNull().default(100),
  beastMultiplier: integer("beast_multiplier").notNull().default(2),
  consistency5: integer("consistency_5").notNull().default(10),
  consistency6: integer("consistency_6").notNull().default(20),
  consistency7: integer("consistency_7").notNull().default(35),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  /** When set, bonus scoring treats the challenge as if this IST date has passed. */
  scoringAsOfDate: date("scoring_as_of_date"),
});

export const activityStatusEnum = ["approved", "disapproved"] as const;
export type ActivityStatus = (typeof activityStatusEnum)[number];

export const activities = pgTable(
  "activity",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    activityDate: date("activity_date")
      .notNull()
      .references(() => challengeDay.date),
    steps: integer("steps").notNull(),
    photoUrl: text("photo_url").notNull(),
    status: text("status").notNull().default("approved"),
    basePoints: integer("base_points").notNull().default(0),
    adminNote: text("admin_note"),
    editedBy: uuid("edited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("activity_user_date_unique").on(table.userId, table.activityDate),
    index("activity_activity_date_idx").on(table.activityDate),
    index("activity_user_id_idx").on(table.userId),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  challengeDay: one(challengeDay, {
    fields: [activities.activityDate],
    references: [challengeDay.date],
  }),
  editor: one(users, {
    fields: [activities.editedBy],
    references: [users.id],
  }),
}));
