from fars.substrate.parse.citations import parse


def test_finds_one_citation():
    body = "as shown by [@arnold1995]."
    cites = parse(body)
    assert len(cites) == 1
    assert cites[0].key == "arnold1995"
    assert cites[0].line == 1


def test_multiple_citations():
    body = "see [@foo2020] and [@bar2021a]"
    cites = parse(body)
    assert {c.key for c in cites} == {"foo2020", "bar2021a"}


def test_disambiguator_letter_accepted():
    body = "[@author2020a] and [@author2020b]"
    cites = parse(body)
    assert {c.key for c in cites} == {"author2020a", "author2020b"}


def test_does_not_match_arbitrary_brackets():
    body = "[some text] not a cite"
    assert parse(body) == []
