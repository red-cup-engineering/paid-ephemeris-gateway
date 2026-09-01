from fars.closure.valuation.body_chars import score as body_chars
from fars.closure.valuation.density import score as density
from fars.closure.valuation.has_description import score as has_description
from fars.closure.valuation.rubric_coverage import score as rubric_coverage
from fars.closure.valuation.slop import score as slop
from fars.closure.valuation.structure import score as structure


def test_body_chars_excludes_headings():
    body = "# Title\n\nReal prose here.\n## Section\n"
    assert body_chars(body) == len("Real prose here.")


def test_density_curve_low_for_short():
    assert density("x" * 100) < 0.2


def test_density_curve_peak_for_medium():
    assert density("x" * 5000) == 1.0


def test_has_description_present():
    assert has_description({"description": "real text"}) is True


def test_has_description_empty():
    assert has_description({"description": ""}) is False
    assert has_description({"description": "   "}) is False
    assert has_description({}) is False


def test_structure_counts_h2():
    body = "## A\n\n## B\n\n### C\n"
    assert structure(body) == 2


def test_rubric_coverage_full():
    body = (
        "## Etymology\n\n## Definitional structure\n\n## Examples\n\n"
        "## Adjacent\n\n## Open questions\n\n## See also\n"
    )
    assert rubric_coverage(body) == 1.0


def test_rubric_coverage_partial():
    body = "## Examples\n\n## See also\n"
    assert 0 < rubric_coverage(body) < 1


def test_slop_detects_marker():
    body = "As an AI language model, I cannot..."
    assert slop(body) is True


def test_slop_clean_body():
    body = "Real prose without markers."
    assert slop(body) is False
