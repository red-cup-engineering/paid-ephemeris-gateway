from fars.substrate.parse.markdown_links import parse


def test_parse_finds_one_relative_link():
    body = "see [foo](bar.md) for details"
    links = parse(body)
    assert len(links) == 1
    assert links[0].text == "foo"
    assert links[0].target_raw == "bar.md"
    assert links[0].kind == "relative"
    assert links[0].line == 1


def test_external_link_classified():
    body = "[google](https://google.com)"
    links = parse(body)
    assert links[0].kind == "external"


def test_anchor_link_classified():
    body = "[top](#top)"
    links = parse(body)
    assert links[0].kind == "anchor"


def test_asset_link_classified():
    body = "![img](pic.png)"
    links = parse(body)
    assert links[0].kind == "asset"


def test_line_numbers_track():
    body = "first\n[a](a.md)\n[b](b.md)\n"
    links = parse(body)
    assert [link.line for link in links] == [2, 3]
