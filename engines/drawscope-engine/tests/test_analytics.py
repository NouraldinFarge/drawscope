from datetime import date, timedelta

import pytest

from drawscope_engine.protocol.models import AnalysisPayload, Drawing
from drawscope_engine.statistics.analytics import (
    AnalysisInputError,
    _confidence_rating,
    analyze,
)


def payload() -> AnalysisPayload:
    filler = [
        Drawing(
            draw_date=date(2025, 12, 31) - timedelta(days=index),
            main_numbers=[8, 9, 10],
            special_number=1,
        )
        for index in range(60)
    ]
    return AnalysisPayload(
        game_id="fixture",
        era_id="fixture-era",
        main_min=1,
        main_max=10,
        draw_count=3,
        ordered=False,
        simulation_trials=500,
        seed=7,
        draws=[
            Drawing(
                draw_date=date(2026, 1, 3),
                main_numbers=[1, 2, 3],
                special_number=1,
            ),
            Drawing(
                draw_date=date(2026, 1, 2),
                main_numbers=[1, 4, 5],
                special_number=1,
            ),
            Drawing(
                draw_date=date(2026, 1, 1),
                main_numbers=[1, 6, 7],
                special_number=1,
            ),
            *filler,
        ],
    )


def test_frequency_gap_pairs_and_reproducible_simulation() -> None:
    first = analyze(payload())
    second = analyze(payload())

    assert first.sample_size == 63
    assert first.numbers[0].frequency == 3
    assert first.numbers[1].current_gap == 0
    assert first.top_pairs[0].numbers == (8, 9)
    assert first.patterns.consecutive_draws == 63
    assert first.simulation == second.simulation
    assert first.theoretical_jackpot_odds == "1 in 120"
    assert first.retrospective.target_draw_date == date(2026, 1, 3)
    assert first.retrospective.history_size == 62
    assert first.retrospective.backtest.tested_draws == 33


def test_rejects_duplicate_unordered_numbers() -> None:
    request = payload()
    request.draws[0].main_numbers = [1, 1, 2]
    with pytest.raises(AnalysisInputError):
        analyze(request)


def test_keeps_special_ball_out_of_main_frequency() -> None:
    request = payload()
    request.draws[0].special_number = 10
    result = analyze(request)
    assert result.numbers[-1].frequency == 60


def test_current_gap_uses_draw_dates_not_input_order() -> None:
    request = payload()
    request.draws = list(reversed(request.draws))
    result = analyze(request)

    number_two = next(item for item in result.numbers if item.number == 2)
    number_six = next(item for item in result.numbers if item.number == 6)
    assert number_two.current_gap == 0
    assert number_six.current_gap == 2


def test_jackpot_odds_include_the_special_ball_pool() -> None:
    request = payload()
    request.special_min = 1
    request.special_max = 5
    request.special_draw_count = 1

    result = analyze(request)

    assert result.theoretical_jackpot_odds == "1 in 600"
    assert result.retrospective.special_number_pattern is not None


def test_rejects_partial_special_ball_rules() -> None:
    request = payload()
    request.special_min = 1
    request.special_draw_count = 1

    with pytest.raises(AnalysisInputError):
        analyze(request)


def test_retrospective_target_never_uses_future_drawings() -> None:
    request = payload()
    request.target_draw_date = date(2026, 1, 1)
    result = analyze(request)

    retrospective = result.retrospective
    assert retrospective.target_draw_date == date(2026, 1, 1)
    assert retrospective.history_size == 60
    assert retrospective.target_main_numbers == [1, 6, 7]
    assert all(
        pattern.overall_hits == 0
        for pattern in retrospective.main_number_patterns
        if pattern.number in {1, 6, 7}
    )
    assert retrospective.backtest.end == date(2026, 1, 1)


def test_retrospective_reports_calendar_ticket_and_signal_patterns() -> None:
    result = analyze(payload())
    retrospective = result.retrospective

    assert retrospective.day_of_week == "Saturday"
    assert retrospective.month == "January"
    assert retrospective.season == "Winter"
    assert len(retrospective.signals) == 30
    assert sum(signal.weight for signal in retrospective.signals) == pytest.approx(1)
    assert retrospective.ticket_pattern.main_sum == 6
    assert retrospective.ticket_pattern.has_consecutive_numbers
    assert retrospective.ticket_pattern.triple_count == 1
    assert retrospective.best_pattern.discovery_draws > 0
    assert retrospective.best_pattern.confirmation_draws > 0
    assert 0 <= retrospective.best_pattern.confidence_score <= 49
    assert 0 <= retrospective.backtest.two_sided_p_value <= 1


def test_retrospective_is_independent_of_input_order() -> None:
    request = payload()
    first = analyze(request).retrospective
    request.draws = list(reversed(request.draws))
    second = analyze(request).retrospective

    assert first == second


def test_rejects_a_target_without_enough_prior_history() -> None:
    request = payload()
    request.target_draw_date = date(2025, 12, 2)

    with pytest.raises(AnalysisInputError):
        analyze(request)


def test_confidence_rating_is_conservative_and_prospectively_capped() -> None:
    no_edge = _confidence_rating(0.99, 0.01, 4, 4)
    weak = _confidence_rating(1.1, 0.25, 2, 4)
    strongest_historical = _confidence_rating(1.5, 0.0001, 4, 4)

    assert no_edge == (0, "no_demonstrated_edge", "do_not_use_to_choose_numbers")
    assert 1 <= weak[0] <= 9
    assert weak[1] == "very_low"
    assert strongest_historical[0] <= 49
    assert strongest_historical[2] == "historical_experiment_only"
