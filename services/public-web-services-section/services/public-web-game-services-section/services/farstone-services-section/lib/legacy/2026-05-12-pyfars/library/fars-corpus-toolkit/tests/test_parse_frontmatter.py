from fars.substrate.parse.frontmatter import FrontmatterError, parse


def test_parse_returns_fm_dict_and_body():
    text = "---\ntitle: Hello\nkind: concept\n---\n\nbody text\n"
    fm, body = parse(text)
    assert fm == {"title": "Hello", "kind": "concept"}
    assert body == "\nbody text\n"


def test_parse_returns_none_for_no_frontmatter():
    text = "no frontmatter here\njust prose\n"
    fm, body = parse(text)
    assert fm is None
    assert body == text


def test_parse_raises_on_yaml_error():
    bad = '---\ntitle: "unterminated\nkind: concept\n---\n'
    try:
        parse(bad)
    except FrontmatterError:
        return
    assert False, "expected FrontmatterError"


def test_parse_handles_empty_frontmatter():
    text = "---\n---\nbody\n"
    fm, body = parse(text)
    assert fm == {}
    assert body == "body\n"
