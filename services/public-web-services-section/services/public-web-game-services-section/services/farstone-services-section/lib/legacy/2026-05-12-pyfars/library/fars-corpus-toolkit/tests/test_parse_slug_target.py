from fars.substrate.parse._slug_target import slug_of


def test_bare_slug_passes_through():
    assert slug_of("foo") == "foo"


def test_md_suffix_stripped():
    assert slug_of("foo.md") == "foo"


def test_path_extracted_to_basename():
    assert slug_of("../bar/foo.md") == "foo"


def test_anchor_dropped():
    assert slug_of("foo.md#section") == "foo"


def test_query_dropped():
    assert slug_of("foo.md?x=1") == "foo"


def test_require_md_returns_none_for_non_md():
    assert slug_of("foo", require_md=True) is None
    assert slug_of("foo.png", require_md=True) is None


def test_require_md_accepts_md():
    assert slug_of("foo.md", require_md=True) == "foo"


def test_empty_target_returns_none():
    assert slug_of("") is None
