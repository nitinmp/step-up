import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
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
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  role: text("role").notNull().default("user"),
  profileImageUrl: text("profile_image_url"),
  division: text("division").notNull().default("strider"),
  /** Division used for scoring on activity dates before STAGE4_DIVISION_CUTOVER_DATE. */
  divisionBeforeStage4: text("division_before_stage4"),
  gender: text("gender"),
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
  /** Deprecated: live scoring uses calendar today. Kept for existing DB rows. */
  scoringAsOfDate: date("scoring_as_of_date"),
});

export const activityStatusEnum = ["pending", "approved", "disapproved"] as const;
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
    distanceKm: numeric("distance_km", { precision: 7, scale: 3 })
      .notNull()
      .default("0.000"),
    photoUrl: text("photo_url").notNull(),
    status: text("status").notNull().default("pending"),
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

export const dayScoringRun = pgTable(
  "day_scoring_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityDate: date("activity_date")
      .notNull()
      .references(() => challengeDay.date),
    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    starPoints: integer("star_points").notNull(),
    maxSteps: integer("max_steps").notNull(),
  },
  (table) => [index("day_scoring_run_activity_date_idx").on(table.activityDate)],
);

export const dayScoringRunEntry = pgTable(
  "day_scoring_run_entry",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => dayScoringRun.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    steps: integer("steps").notNull(),
    basePoints: integer("base_points").notNull(),
    isStarWinner: boolean("is_star_winner").notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.userId] })],
);

export const weekScoringRun = pgTable(
  "week_scoring_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    weekNo: integer("week_no").notNull(),
    triggeredBy: uuid("triggered_by").references(() => users.id, {
      onDelete: "set null",
    }),
    computedAt: timestamp("computed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    weekStarPoints: integer("week_star_points").notNull(),
    maxWeeklySteps: integer("max_weekly_steps").notNull(),
  },
  (table) => [index("week_scoring_run_week_no_idx").on(table.weekNo)],
);

export const weekScoringRunEntry = pgTable(
  "week_scoring_run_entry",
  {
    runId: uuid("run_id")
      .notNull()
      .references(() => weekScoringRun.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weeklySteps: integer("weekly_steps").notNull(),
    weeklyBasePoints: integer("weekly_base_points").notNull(),
    daysMet: integer("days_met").notNull(),
    consistencyPoints: integer("consistency_points").notNull(),
    isWeekStar: boolean("is_week_star").notNull(),
  },
  (table) => [primaryKey({ columns: [table.runId, table.userId] })],
);

export const starDayCertificateRun = pgTable(
  "star_day_certificate_run",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    activityDate: date("activity_date")
      .notNull()
      .unique()
      .references(() => challengeDay.date),
    generatedBy: uuid("generated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    generatedAt: timestamp("generated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("star_day_certificate_run_activity_date_idx").on(table.activityDate),
  ],
);

export const starDayCertificate = pgTable(
  "star_day_certificate",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    runId: uuid("run_id")
      .notNull()
      .references(() => starDayCertificateRun.id, { onDelete: "cascade" }),
    activityDate: date("activity_date")
      .notNull()
      .references(() => challengeDay.date),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    division: text("division").notNull(),
    recipientName: text("recipient_name").notNull(),
    steps: integer("steps").notNull(),
    imageUrl: text("image_url").notNull(),
  },
  (table) => [
    unique("star_day_certificate_date_user_unique").on(
      table.activityDate,
      table.userId,
    ),
    index("star_day_certificate_activity_date_idx").on(table.activityDate),
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
