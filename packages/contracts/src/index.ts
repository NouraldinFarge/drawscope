import { z } from "zod";

export const verificationSchema = z.enum([
  "official",
  "official-name-only",
  "single_secondary_source",
  "cross_verified",
  "conflict",
  "unverified",
]);

export const gameDefinitionSchema = z.strictObject({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["current", "retired", "renamed"]),
  kind: z.enum(["jackpot", "ordered", "keno"]),
  price_usd: z.number().nonnegative().nullable(),
  schedule: z.string(),
  ordered: z.boolean(),
  main_draw_count: z.number().int().positive(),
  main_min: z.number().int(),
  main_max: z.number().int().nullable(),
  special_name: z.string().nullable(),
  special_min: z.number().int().nullable(),
  special_max: z.number().int().nullable(),
  era: z.string(),
  era_start: z.string().nullable(),
  odds: z.string(),
  source_url: z.url(),
  verification: verificationSchema,
});

export const drawingSchema = z.strictObject({
  draw_date: z.iso.date(),
  main_numbers: z.array(z.number().int()).min(1),
  special_number: z.number().int().nullable(),
  multiplier: z.number().int().positive().nullable(),
});

export const numberStatisticSchema = z.strictObject({
  number: z.number().int(),
  frequency: z.number().int().nonnegative(),
  rate: z.number().nonnegative(),
  current_gap: z.number().int().nonnegative().nullable(),
});

export const pairStatisticSchema = z.strictObject({
  numbers: z.tuple([z.number().int(), z.number().int()]),
  count: z.number().int().nonnegative(),
});

export const signalContributionSchema = z.strictObject({
  key: z.string().min(1),
  label: z.string().min(1),
  raw_value: z.number(),
  standardized_score: z.number(),
  weighted_contribution: z.number(),
});

export const winningNumberPatternSchema = z.strictObject({
  number: z.number().int(),
  composite_score: z.number(),
  composite_rank: z.number().int().positive(),
  composite_percentile: z.number().min(0).max(100),
  overall_hits: z.number().int().nonnegative(),
  last_10_hits: z.number().int().nonnegative(),
  last_30_hits: z.number().int().nonnegative(),
  last_100_hits: z.number().int().nonnegative(),
  same_weekday_hits: z.number().int().nonnegative(),
  same_month_hits: z.number().int().nonnegative(),
  same_season_hits: z.number().int().nonnegative(),
  same_day_of_month_hits: z.number().int().nonnegative(),
  same_month_phase_hits: z.number().int().nonnegative(),
  year_to_date_hits: z.number().int().nonnegative(),
  previous_year_hits: z.number().int().nonnegative(),
  gap_before_draw: z.number().int().nonnegative().nullable(),
  repeated_previous_draw: z.boolean(),
  adjacent_previous_draw: z.boolean(),
  top_supporting_signals: z.array(signalContributionSchema).max(5),
});

export const signalPerformanceSchema = z.strictObject({
  key: z.string().min(1),
  label: z.string().min(1),
  weight: z.number().positive().max(1),
  target_winning_percentile: z.number().min(0).max(100),
  backtest_winning_percentile: z.number().min(0).max(100),
  discovery_top_5_lift: z.number().nonnegative(),
  confirmation_top_5_lift: z.number().nonnegative(),
});

export const retrospectivePatternAnalysisSchema = z.strictObject({
  target_draw_date: z.iso.date(),
  day_of_week: z.string().min(1),
  month: z.string().min(1),
  season: z.enum(["Winter", "Spring", "Summer", "Autumn"]),
  history_size: z.number().int().min(60),
  target_main_numbers: z.array(z.number().int()).min(1),
  target_special_number: z.number().int().nullable(),
  main_number_patterns: z.array(winningNumberPatternSchema).min(1),
  special_number_pattern: winningNumberPatternSchema.nullable(),
  ticket_pattern: z.strictObject({
    main_sum: z.number().int(),
    sum_percentile: z.number().min(0).max(100),
    odd_count: z.number().int().nonnegative(),
    odd_even_prior_rate: z.number().min(0).max(1),
    has_consecutive_numbers: z.boolean(),
    consecutive_prior_rate: z.number().min(0).max(1),
    repeated_from_previous_draw: z.number().int().nonnegative(),
    repeat_prior_rate: z.number().min(0).max(1),
    historical_pair_occurrences: z.number().int().nonnegative(),
    pairs_seen_before: z.number().int().nonnegative(),
    pair_count: z.number().int().nonnegative(),
    historical_triple_occurrences: z.number().int().nonnegative(),
    triples_seen_before: z.number().int().nonnegative(),
    triple_count: z.number().int().nonnegative(),
    spread: z.number().int().nonnegative(),
    spread_percentile: z.number().min(0).max(100),
    standard_deviation: z.number().nonnegative(),
    standard_deviation_percentile: z.number().min(0).max(100),
    low_count: z.number().int().nonnegative(),
    low_high_prior_rate: z.number().min(0).max(1),
    prime_count: z.number().int().nonnegative(),
    prime_prior_rate: z.number().min(0).max(1),
    multiples_of_3_count: z.number().int().nonnegative(),
    multiples_of_3_prior_rate: z.number().min(0).max(1),
    repeated_last_digit_pairs: z.number().int().nonnegative(),
    repeated_last_digit_prior_rate: z.number().min(0).max(1),
    max_consecutive_run: z.number().int().positive(),
    max_consecutive_run_prior_rate: z.number().min(0).max(1),
  }),
  signals: z.array(signalPerformanceSchema).min(1),
  best_pattern: z.strictObject({
    key: z.string().min(1),
    label: z.string().min(1),
    discovery_draws: z.number().int().positive(),
    confirmation_draws: z.number().int().positive(),
    discovery_top_5_lift: z.number().nonnegative(),
    confirmation_average_top_5_hits: z.number().nonnegative(),
    expected_average_top_5_hits: z.number().nonnegative(),
    confirmation_top_5_lift: z.number().nonnegative(),
    confirmation_winning_percentile: z.number().min(0).max(100),
    confirmation_z_score: z.number(),
    one_sided_p_value: z.number().min(0).max(1),
    positive_confirmation_blocks: z.number().int().nonnegative(),
    confirmation_blocks: z.number().int().positive(),
    counterfactual_main_numbers: z.array(z.number().int()).min(1),
    counterfactual_main_hits: z.number().int().nonnegative(),
    counterfactual_special_number: z.number().int().nullable(),
    counterfactual_special_hit: z.boolean().nullable(),
    confidence_score: z.number().int().min(0).max(49),
    confidence_label: z.enum([
      "no_demonstrated_edge",
      "very_low",
      "low",
      "preliminary",
      "tentative_historical_only",
    ]),
    confidence_cap: z.literal(49),
    rating_scope: z.string().min(1),
    recommendation: z.enum(["do_not_use_to_choose_numbers", "historical_experiment_only"]),
  }),
  backtest: z.strictObject({
    tested_draws: z.number().int().positive(),
    start: z.iso.date(),
    end: z.iso.date(),
    average_top_5_hits: z.number().nonnegative(),
    expected_average_top_5_hits: z.number().nonnegative(),
    top_5_lift: z.number().nonnegative(),
    any_top_5_hit_draws: z.number().int().nonnegative(),
    winning_number_average_percentile: z.number().min(0).max(100),
    special_ball_average_percentile: z.number().min(0).max(100).nullable(),
    z_score: z.number(),
    two_sided_p_value: z.number().min(0).max(1),
    evidence_grade: z.enum(["within_chance_range", "above_chance_range", "below_chance_range"]),
  }),
  notes: z.array(z.string()).min(1),
});

export const analysisResultSchema = z.strictObject({
  schema_version: z.literal("1.0"),
  methodology_version: z.literal("1.3.0"),
  game_id: z.string(),
  era_id: z.string(),
  sample_size: z.number().int().nonnegative(),
  date_range: z.strictObject({ start: z.iso.date(), end: z.iso.date() }),
  theoretical_jackpot_odds: z.string(),
  chi_square_statistic: z.number().nonnegative(),
  numbers: z.array(numberStatisticSchema),
  top_pairs: z.array(pairStatisticSchema),
  patterns: z.strictObject({
    mean_sum: z.number(),
    odd_even: z.record(z.string(), z.number().int().nonnegative()),
    consecutive_draws: z.number().int().nonnegative(),
  }),
  simulation: z.strictObject({
    seed: z.number().int(),
    trials: z.number().int().positive(),
    min_frequency: z.number().int().nonnegative(),
    max_frequency: z.number().int().nonnegative(),
  }),
  retrospective: retrospectivePatternAnalysisSchema,
  disclaimers: z.array(z.string()).min(1),
});

export type GameDefinition = z.infer<typeof gameDefinitionSchema>;
export type Drawing = z.infer<typeof drawingSchema>;
export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type RetrospectivePatternAnalysis = z.infer<typeof retrospectivePatternAnalysisSchema>;
export type WinningNumberPattern = z.infer<typeof winningNumberPatternSchema>;

export type SourceProvider = {
  id: string;
  name: string;
  base_url: string;
  terms_url: string;
  policy_status: "permission_required" | "approved" | "blocked";
  live_network_enabled: boolean;
  policy_note: string;
  official_alternative_url: string;
};

export type SourceFeedStatus = {
  id: string;
  name: string;
  game_id: string;
  session: string;
  path_template: string;
  first_year: number;
  last_year: number;
  main_count: number;
  ordered: boolean;
  optional_special: string | null;
  optional_draw_number: boolean;
  notes: string;
  archive_url_example: string;
  saved_file_pattern: string;
  imported_pages: number;
  imported_draws: number;
  last_import_at: string | null;
};

export type SourceUpdateSnapshot = {
  catalog_version: string;
  researched_at: string;
  provider: SourceProvider;
  import_directory: string;
  parser_version: string;
  total_imported_pages: number;
  total_imported_draws: number;
  feeds: SourceFeedStatus[];
};

export type SavedPageImportSummary = {
  scanned_files: number;
  imported_pages: number;
  duplicate_pages: number;
  imported_draws: number;
  duplicate_draws: number;
  rejected_pages: number;
  failures: Array<{ file_name: string; code: string }>;
};

export type GameCoverage = {
  game_id: string;
  game_name: string;
  first_draw: string;
  last_draw: string;
  draw_count: number;
  session_count: number;
  verification_status: string;
};

export type DrawingRecord = Drawing & {
  id: string;
  game_id: string;
  game_name: string;
  era_id: string;
  session: string;
  special_name: string | null;
  source_url: string;
  source_detail_url: string | null;
  verification_status: string;
};

export type DrawingQuery = {
  gameId: string;
  session: string | null;
  year: number | null;
  number: number | null;
  limit: number;
  offset: number;
};

export type DrawingPage = {
  records: DrawingRecord[];
  total: number;
  limit: number;
  offset: number;
};

export type ArchiveStatus = {
  built_at: string;
  seed_sha256: string;
  source_count: number;
  known_gap_count: number;
};

export type TicketProfile = {
  game_id: "powerball";
  era_id: "powerball-2015-current";
  sample_size: number;
  first_draw: string;
  last_draw: string;
  historical_draws_with_any: number;
  best_match: number;
  main_sum: number;
  odd_count: number;
};

export type AppSnapshot = {
  app_version: string;
  schema_version: string;
  methodology_version: string;
  database_path: string;
  database_status: "healthy" | "degraded";
  rule_era_count: number;
  games: GameDefinition[];
  draws: Drawing[];
  coverage: GameCoverage[];
  archive: ArchiveStatus;
  dataset: {
    id: string;
    game_id: string;
    era_id: string;
    verification_status: string;
    first_draw: string;
    last_draw: string;
    draw_count: number;
    source_url: string;
  };
};
