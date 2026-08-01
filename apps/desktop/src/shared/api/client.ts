import type {
  AnalysisResult,
  AppSnapshot,
  Drawing,
  DrawingPage,
  DrawingQuery,
  GameDefinition,
  SavedPageImportSummary,
  SourceUpdateSnapshot,
  TicketProfile,
} from "@drawscope/contracts";
import gameCatalog from "../../../../../data/game-catalog.json";
import sampleDataset from "../../../../../data/fixtures/powerball-2026-sample.json";
import sourceCatalog from "../../../../../data/source-catalog.json";

function isTauri() {
  return "__TAURI_INTERNALS__" in window;
}

export async function getSnapshot(): Promise<AppSnapshot> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<AppSnapshot>("get_app_snapshot");
  }

  return {
    app_version: "0.6.2-browser-preview",
    schema_version: "1.0",
    methodology_version: "1.2.0",
    database_path: "Browser preview · no durable database",
    database_status: "healthy",
    rule_era_count: 1,
    games: gameCatalog as GameDefinition[],
    draws: sampleDataset.draws as Drawing[],
    coverage: [
      {
        game_id: "powerball",
        game_name: "Powerball",
        first_draw: sampleDataset.coverage.first_draw,
        last_draw: sampleDataset.coverage.last_draw,
        draw_count: sampleDataset.coverage.draw_count,
        session_count: 1,
        verification_status: sampleDataset.verification_status,
      },
    ],
    archive: {
      built_at: sampleDataset.retrieved_at,
      seed_sha256: "browser-preview",
      source_count: 1,
      known_gap_count: 0,
    },
    dataset: {
      id: sampleDataset.dataset_id,
      game_id: sampleDataset.game_id,
      era_id: sampleDataset.era_id,
      verification_status: sampleDataset.verification_status,
      first_draw: sampleDataset.coverage.first_draw,
      last_draw: sampleDataset.coverage.last_draw,
      draw_count: sampleDataset.coverage.draw_count,
      source_url: sampleDataset.sources[0].url,
    },
  };
}

export async function getDrawings(query: DrawingQuery): Promise<DrawingPage> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<DrawingPage>("get_drawings", { query });
  }
  const game = (gameCatalog as GameDefinition[]).find((item) => item.id === query.gameId);
  const filtered = (sampleDataset.draws as Drawing[])
    .filter((draw) => query.year === null || draw.draw_date.startsWith(String(query.year)))
    .filter(
      (draw) =>
        query.number === null ||
        draw.main_numbers.includes(query.number) ||
        draw.special_number === query.number,
    );
  return {
    records: filtered.slice(query.offset, query.offset + query.limit).map((draw) => ({
      ...draw,
      id: `preview:${query.gameId}:${draw.draw_date}`,
      game_id: query.gameId,
      game_name: game?.name ?? query.gameId,
      era_id: sampleDataset.era_id,
      session: "evening",
      special_name: game?.special_name ?? null,
      source_url: sampleDataset.sources[0].url,
      source_detail_url: sampleDataset.sources[0].url,
      verification_status: sampleDataset.verification_status,
    })),
    total: filtered.length,
    limit: query.limit,
    offset: query.offset,
  };
}

export async function runAnalysis(targetDrawDate: string | null = null): Promise<AnalysisResult> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<AnalysisResult>("analyze_powerball_archive", { targetDrawDate });
  }
  return analyzeLocally(sampleDataset.draws as Drawing[], targetDrawDate);
}

export async function analyzePowerballTicket(
  mainNumbers: number[],
  specialNumber: number,
): Promise<TicketProfile> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<TicketProfile>("analyze_powerball_ticket", {
      mainNumbers,
      specialNumber,
    });
  }
  const draws = sampleDataset.draws as Drawing[];
  const matches = draws.map((draw) => {
    const mainMatches = mainNumbers.filter((number) => draw.main_numbers.includes(number)).length;
    return mainMatches + (draw.special_number === specialNumber ? 1 : 0);
  });
  const dates = draws.map((draw) => draw.draw_date).sort();
  return {
    game_id: "powerball",
    era_id: "powerball-2015-current",
    sample_size: draws.length,
    first_draw: dates[0],
    last_draw: dates.at(-1) ?? dates[0],
    historical_draws_with_any: matches.filter((count) => count > 0).length,
    best_match: Math.max(0, ...matches),
    main_sum: mainNumbers.reduce((sum, number) => sum + number, 0),
    odd_count: mainNumbers.filter((number) => number % 2 !== 0).length,
  };
}

export async function getSourceUpdateSnapshot(): Promise<SourceUpdateSnapshot> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<SourceUpdateSnapshot>("get_source_update_snapshot");
  }
  return {
    catalog_version: sourceCatalog.catalog_version,
    researched_at: sourceCatalog.researched_at,
    provider: sourceCatalog.provider as SourceUpdateSnapshot["provider"],
    import_directory: "imports/lottery-net",
    parser_version: "lottery-net-saved-html/1.0.0",
    total_imported_pages: 0,
    total_imported_draws: 0,
    feeds: sourceCatalog.feeds.map((feed) => ({
      ...feed,
      archive_url_example: `${sourceCatalog.provider.base_url}${feed.path_template.replace(
        "{year}",
        String(feed.last_year),
      )}`,
      saved_file_pattern: `${feed.id}-YYYY.html`,
      imported_pages: 0,
      imported_draws: 0,
      last_import_at: null,
    })),
  };
}

export async function importSavedLotteryNetPages(): Promise<SavedPageImportSummary> {
  if (isTauri()) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<SavedPageImportSummary>("import_saved_lottery_net_pages");
  }
  return {
    scanned_files: 0,
    imported_pages: 0,
    duplicate_pages: 0,
    imported_draws: 0,
    duplicate_draws: 0,
    rejected_pages: 0,
    failures: [],
  };
}

function analyzeLocally(draws: Drawing[], targetDrawDate: string | null): AnalysisResult {
  const frequencies = new Map<number, number>();
  const lastSeen = new Map<number, number>();
  const pairs = new Map<string, number>();
  const oddEven: Record<string, number> = {};
  let consecutiveDraws = 0;
  let totalSum = 0;

  for (let number = 1; number <= 69; number += 1) frequencies.set(number, 0);
  draws.forEach((draw, index) => {
    draw.main_numbers.forEach((number) => {
      frequencies.set(number, (frequencies.get(number) ?? 0) + 1);
      if (!lastSeen.has(number)) lastSeen.set(number, index);
    });
    const sorted = [...draw.main_numbers].sort((a, b) => a - b);
    for (let left = 0; left < sorted.length; left += 1) {
      for (let right = left + 1; right < sorted.length; right += 1) {
        const key = `${sorted[left]},${sorted[right]}`;
        pairs.set(key, (pairs.get(key) ?? 0) + 1);
      }
    }
    const odd = sorted.filter((value) => value % 2 === 1).length;
    const label = `${odd} odd / ${sorted.length - odd} even`;
    oddEven[label] = (oddEven[label] ?? 0) + 1;
    if (sorted.some((value, position) => position > 0 && value - sorted[position - 1] === 1)) {
      consecutiveDraws += 1;
    }
    totalSum += sorted.reduce((sum, value) => sum + value, 0);
  });

  const expected = (draws.length * 5) / 69;
  const chiSquare = [...frequencies.values()].reduce(
    (sum, count) => sum + (count - expected) ** 2 / expected,
    0,
  );
  const topPairs = [...pairs.entries()]
    .sort(([leftKey, leftCount], [rightKey, rightCount]) => {
      return rightCount - leftCount || leftKey.localeCompare(rightKey);
    })
    .slice(0, 12)
    .map(([key, count]) => ({
      numbers: key.split(",").map(Number) as [number, number],
      count,
    }));
  const chronological = [...draws].sort((left, right) =>
    left.draw_date.localeCompare(right.draw_date),
  );
  const target =
    chronological.find((drawing) => drawing.draw_date === targetDrawDate) ??
    chronological.at(-1) ??
    draws[0];
  const prior = chronological.filter((drawing) => drawing.draw_date < target.draw_date);
  const priorFrequency = new Map<number, number>();
  for (const drawing of prior) {
    for (const number of drawing.main_numbers) {
      priorFrequency.set(number, (priorFrequency.get(number) ?? 0) + 1);
    }
  }
  const targetPatterns = [...target.main_numbers]
    .sort((left, right) => left - right)
    .map((number, index) => ({
      number,
      composite_score: 0,
      composite_rank: index + 1,
      composite_percentile: 50,
      overall_hits: priorFrequency.get(number) ?? 0,
      last_10_hits: prior.slice(-10).filter((drawing) => drawing.main_numbers.includes(number))
        .length,
      last_30_hits: prior.filter((drawing) => drawing.main_numbers.includes(number)).length,
      last_100_hits: prior.filter((drawing) => drawing.main_numbers.includes(number)).length,
      same_weekday_hits: 0,
      same_month_hits: 0,
      same_season_hits: 0,
      same_day_of_month_hits: 0,
      same_month_phase_hits: 0,
      year_to_date_hits: 0,
      previous_year_hits: 0,
      gap_before_draw: null,
      repeated_previous_draw: false,
      adjacent_previous_draw: false,
      top_supporting_signals: [],
    }));
  const previewSignals = [
    ["overall", "All prior drawings", 0.04],
    ["recent_5", "Previous 5 drawings", 0.04],
    ["recent_10", "Previous 10 drawings", 0.05],
    ["recent_20", "Previous 20 drawings", 0.05],
    ["recent_30", "Previous 30 drawings", 0.05],
    ["recent_50", "Previous 50 drawings", 0.04],
    ["recent_100", "Previous 100 drawings", 0.04],
    ["recent_250", "Previous 250 drawings", 0.02],
    ["decay_fast", "Exponentially weighted · 5-draw half-life", 0.05],
    ["decay_medium", "Exponentially weighted · 20-draw half-life", 0.05],
    ["decay_slow", "Exponentially weighted · 100-draw half-life", 0.03],
    ["momentum", "Last 10 versus preceding 10", 0.04],
    ["weekday", "Same day of week", 0.05],
    ["month", "Same calendar month", 0.04],
    ["season", "Same season", 0.03],
    ["quarter", "Same calendar quarter", 0.02],
    ["day_of_month", "Same day of month", 0.02],
    ["month_phase", "Same part of month", 0.02],
    ["week_of_month", "Same week of month", 0.02],
    ["iso_week", "Nearby week of year", 0.02],
    ["year_to_date", "Current year to date", 0.04],
    ["previous_year", "Previous calendar year", 0.03],
    ["gap", "Drawings since last seen", 0.04],
    ["gap_relative", "Gap versus historical interval", 0.05],
    ["previous_repeat", "Present in previous draw", 0.02],
    ["previous_neighbor", "Adjacent to a previous-draw number", 0.02],
    ["previous_last_digit", "Shares last digit with previous draw", 0.02],
    ["transition_affinity", "Historically followed previous-draw values", 0.03],
    ["previous_sum_state", "Followed a similar previous-draw sum", 0.02],
    ["previous_parity_state", "Followed the same previous-draw parity", 0.01],
  ] as const;
  const targetDate = new Date(`${target.draw_date}T12:00:00`);
  const month = targetDate.toLocaleDateString("en-US", { month: "long" });
  const monthNumber = targetDate.getMonth() + 1;
  const season =
    monthNumber === 12 || monthNumber <= 2
      ? "Winter"
      : monthNumber <= 5
        ? "Spring"
        : monthNumber <= 8
          ? "Summer"
          : "Autumn";

  return {
    schema_version: "1.0",
    methodology_version: "1.2.0",
    game_id: "powerball",
    era_id: "powerball-2015-current",
    sample_size: draws.length,
    date_range: { start: "2026-07-01", end: "2026-07-27" },
    theoretical_jackpot_odds: "1 in 292,201,338",
    chi_square_statistic: Number(chiSquare.toFixed(4)),
    numbers: [...frequencies.entries()].map(([number, frequency]) => ({
      number,
      frequency,
      rate: frequency / draws.length,
      current_gap: lastSeen.get(number) ?? null,
    })),
    top_pairs: topPairs,
    patterns: {
      mean_sum: Number((totalSum / draws.length).toFixed(2)),
      odd_even: oddEven,
      consecutive_draws: consecutiveDraws,
    },
    simulation: {
      seed: 20260728,
      trials: 10000,
      min_frequency: 659,
      max_frequency: 796,
    },
    retrospective: {
      target_draw_date: target.draw_date,
      day_of_week: targetDate.toLocaleDateString("en-US", { weekday: "long" }),
      month,
      season,
      history_size: prior.length,
      target_main_numbers: [...target.main_numbers].sort((left, right) => left - right),
      target_special_number: target.special_number,
      main_number_patterns: targetPatterns,
      special_number_pattern: null,
      ticket_pattern: {
        main_sum: target.main_numbers.reduce((sum, number) => sum + number, 0),
        sum_percentile: 50,
        odd_count: target.main_numbers.filter((number) => number % 2 !== 0).length,
        odd_even_prior_rate: 0,
        has_consecutive_numbers: false,
        consecutive_prior_rate: 0,
        repeated_from_previous_draw: 0,
        repeat_prior_rate: 0,
        historical_pair_occurrences: 0,
        pairs_seen_before: 0,
        pair_count: 10,
        historical_triple_occurrences: 0,
        triples_seen_before: 0,
        triple_count: 10,
        spread: Math.max(...target.main_numbers) - Math.min(...target.main_numbers),
        spread_percentile: 50,
        standard_deviation: 0,
        standard_deviation_percentile: 50,
        low_count: target.main_numbers.filter((number) => number <= 35).length,
        low_high_prior_rate: 0,
        prime_count: 0,
        prime_prior_rate: 0,
        multiples_of_3_count: target.main_numbers.filter((number) => number % 3 === 0).length,
        multiples_of_3_prior_rate: 0,
        repeated_last_digit_pairs: 0,
        repeated_last_digit_prior_rate: 0,
        max_consecutive_run: 1,
        max_consecutive_run_prior_rate: 0,
      },
      signals: previewSignals.map(([key, label, weight]) => ({
        key,
        label,
        weight,
        target_winning_percentile: 50,
        backtest_winning_percentile: 50,
        discovery_top_5_lift: 1,
        confirmation_top_5_lift: 1,
      })),
      best_pattern: {
        key: "composite",
        label: "30-signal weighted composite",
        discovery_draws: Math.max(1, Math.floor(prior.length * 0.6)),
        confirmation_draws: Math.max(1, Math.ceil(prior.length * 0.4)),
        discovery_top_5_lift: 1,
        confirmation_average_top_5_hits: 0,
        expected_average_top_5_hits: 25 / 69,
        confirmation_top_5_lift: 0,
        confirmation_winning_percentile: 50,
        confirmation_z_score: 0,
        one_sided_p_value: 0.5,
        positive_confirmation_blocks: 0,
        confirmation_blocks: 1,
        counterfactual_main_numbers: [1, 2, 3, 4, 5],
        counterfactual_main_hits: 0,
        counterfactual_special_number: 1,
        counterfactual_special_hit: false,
        confidence_score: 0,
        confidence_label: "no_demonstrated_edge",
        confidence_cap: 49,
        rating_scope:
          "Confidence in a repeatable historical ranking advantage; not the probability of winning.",
        recommendation: "do_not_use_to_choose_numbers",
      },
      backtest: {
        tested_draws: Math.max(1, prior.length),
        start: prior[0]?.draw_date ?? target.draw_date,
        end: target.draw_date,
        average_top_5_hits: 0,
        expected_average_top_5_hits: 25 / 69,
        top_5_lift: 0,
        any_top_5_hit_draws: 0,
        winning_number_average_percentile: 50,
        special_ball_average_percentile: 50,
        z_score: 0,
        two_sided_p_value: 1,
        evidence_grade: "within_chance_range",
      },
      notes: [
        "Browser preview uses a small display fixture; the desktop build performs the full walk-forward test.",
      ],
    },
    disclaimers: [
      "Browser preview uses a deterministic display fixture; the desktop build runs the Python engine.",
      "Historical frequency does not change future theoretical probability.",
      "This small sample is unsuitable for predictive claims.",
    ],
  };
}
