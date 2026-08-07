/**
 * schemas - lifted organizing carrier schemas.
 *
 * Generated mechanically from the checked-in *.schema.json proof trees during the
 * FromSchema migration. The schema literal is now the source: FromSchema infers
 * the type and carrierFrom registers the same $id for runtime validation.
 */
import { carrierFrom, type FromSchema } from "@emsenn/relating";

export const accountingBalance = {
  "$id": "organizing/accounting-balance",
  "title": "AccountingBalance",
  "description": "The exact per-commodity conservation read of one accounting transaction. Residuals are decimal integer rational amounts; an elided posting can be inferred when the nonzero residual is confined to one commodity.",
  "type": "object",
  "required": [
    "kind",
    "balanced",
    "residual",
    "residualExact",
    "inferredPostingIndex",
    "inferredAmount"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.accounting.balance"
    },
    "balanced": {
      "type": "boolean"
    },
    "residual": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Amount"
      }
    },
    "residualExact": {
      "type": "array",
      "items": {
        "type": "string"
      }
    },
    "inferredPostingIndex": {
      "oneOf": [
        {
          "type": "integer",
          "minimum": 0
        },
        {
          "type": "null"
        }
      ]
    },
    "inferredAmount": {
      "oneOf": [
        {
          "$ref": "#/$defs/Amount"
        },
        {
          "type": "null"
        }
      ]
    }
  },
  "$defs": {
    "Amount": {
      "type": "object",
      "required": [
        "num",
        "den",
        "commodity"
      ],
      "additionalProperties": false,
      "properties": {
        "num": {
          "type": "string",
          "pattern": "^-?[0-9]+$"
        },
        "den": {
          "type": "string",
          "pattern": "^[1-9][0-9]*$"
        },
        "commodity": {
          "type": "string",
          "minLength": 1
        }
      }
    }
  }
} as const;
export type AccountingBalance = FromSchema<typeof accountingBalance>;
export const accountingBalanceCarrier = carrierFrom(accountingBalance);

export const accountingEntry = {
  "$id": "organizing/accounting-entry",
  "title": "AccountingEntry",
  "description": "A JSON-safe accounting record admitted at organizing's record-state boundary. Exact amounts carry decimal integer strings for numerator and denominator; arithmetic and balance residuals belong to the exact-number layer, while this carrier is normalized to finite relating utterances.",
  "oneOf": [
    {
      "$ref": "#/$defs/Transaction"
    },
    {
      "$ref": "#/$defs/Directive"
    },
    {
      "$ref": "#/$defs/Malformed"
    }
  ],
  "$defs": {
    "Json": {},
    "Source": {
      "type": "object",
      "required": [
        "file",
        "line"
      ],
      "additionalProperties": false,
      "properties": {
        "file": {
          "type": [
            "string",
            "null"
          ]
        },
        "line": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "Amount": {
      "type": "object",
      "required": [
        "num",
        "den",
        "commodity"
      ],
      "additionalProperties": false,
      "properties": {
        "num": {
          "type": "string",
          "pattern": "^-?[0-9]+$"
        },
        "den": {
          "type": "string",
          "pattern": "^[1-9][0-9]*$"
        },
        "commodity": {
          "type": "string"
        }
      }
    },
    "Cost": {
      "type": "object",
      "required": [
        "kind",
        "amount"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "enum": [
            "per-unit",
            "total"
          ]
        },
        "amount": {
          "oneOf": [
            {
              "$ref": "#/$defs/Amount"
            },
            {
              "type": "null"
            }
          ]
        },
        "date": {
          "type": "string"
        },
        "label": {
          "type": "string"
        }
      }
    },
    "Price": {
      "type": "object",
      "required": [
        "kind",
        "amount"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "enum": [
            "@",
            "@@"
          ]
        },
        "amount": {
          "$ref": "#/$defs/Amount"
        }
      }
    },
    "BalanceAssertion": {
      "type": "object",
      "required": [
        "amount"
      ],
      "additionalProperties": false,
      "properties": {
        "amount": {
          "$ref": "#/$defs/Amount"
        },
        "sole": {
          "type": "boolean"
        }
      }
    },
    "Posting": {
      "type": "object",
      "required": [
        "account",
        "amount",
        "cost",
        "price",
        "balanceAssertion",
        "meta"
      ],
      "additionalProperties": false,
      "properties": {
        "account": {
          "type": "string"
        },
        "amount": {
          "oneOf": [
            {
              "$ref": "#/$defs/Amount"
            },
            {
              "type": "null"
            }
          ]
        },
        "cost": {
          "oneOf": [
            {
              "$ref": "#/$defs/Cost"
            },
            {
              "type": "null"
            }
          ]
        },
        "price": {
          "oneOf": [
            {
              "$ref": "#/$defs/Price"
            },
            {
              "type": "null"
            }
          ]
        },
        "balanceAssertion": {
          "oneOf": [
            {
              "$ref": "#/$defs/BalanceAssertion"
            },
            {
              "type": "null"
            }
          ]
        },
        "meta": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/Json"
          }
        }
      }
    },
    "Transaction": {
      "type": "object",
      "required": [
        "date",
        "time",
        "flag",
        "payee",
        "narration",
        "postings",
        "tags",
        "links",
        "meta",
        "code",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "id": {
          "type": [
            "string",
            "null"
          ]
        },
        "date": {
          "type": "string"
        },
        "time": {
          "type": [
            "string",
            "null"
          ]
        },
        "flag": {
          "type": [
            "string",
            "null"
          ]
        },
        "payee": {
          "type": [
            "string",
            "null"
          ]
        },
        "narration": {
          "type": "string"
        },
        "postings": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Posting"
          }
        },
        "tags": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "links": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "meta": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/Json"
          }
        },
        "code": {
          "type": [
            "string",
            "null"
          ]
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "OpenDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "account",
        "commodities",
        "booking",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "open"
        },
        "date": {
          "type": [
            "string",
            "null"
          ]
        },
        "account": {
          "type": "string"
        },
        "commodities": {
          "type": "array",
          "items": {
            "type": "string"
          }
        },
        "booking": {
          "type": [
            "string",
            "null"
          ]
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "CloseDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "account",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "close"
        },
        "date": {
          "type": "string"
        },
        "account": {
          "type": "string"
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "CommodityDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "symbol",
        "precision",
        "meta",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "commodity"
        },
        "date": {
          "type": [
            "string",
            "null"
          ]
        },
        "symbol": {
          "type": "string"
        },
        "precision": {
          "type": [
            "integer",
            "null"
          ],
          "minimum": 0
        },
        "meta": {
          "type": "object",
          "additionalProperties": {
            "$ref": "#/$defs/Json"
          }
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "PriceDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "commodity",
        "amount",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "price"
        },
        "date": {
          "type": "string"
        },
        "commodity": {
          "type": "string"
        },
        "amount": {
          "$ref": "#/$defs/Amount"
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "PadDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "account",
        "padAccount",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "pad"
        },
        "date": {
          "type": "string"
        },
        "account": {
          "type": "string"
        },
        "padAccount": {
          "type": "string"
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "BalanceDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "account",
        "amount",
        "tolerance",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "balance"
        },
        "date": {
          "type": "string"
        },
        "account": {
          "type": "string"
        },
        "amount": {
          "$ref": "#/$defs/Amount"
        },
        "tolerance": {
          "type": [
            "string",
            "null"
          ]
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "OptionDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "key",
        "value",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "option"
        },
        "date": {
          "type": "null"
        },
        "key": {
          "type": [
            "string",
            "null"
          ]
        },
        "value": {
          "type": [
            "string",
            "null"
          ]
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "IncludeDirective": {
      "type": "object",
      "required": [
        "directive",
        "date",
        "path",
        "resolved",
        "error",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "directive": {
          "const": "include"
        },
        "date": {
          "type": "null"
        },
        "path": {
          "type": [
            "string",
            "null"
          ]
        },
        "resolved": {
          "type": "boolean"
        },
        "error": {
          "type": [
            "string",
            "null"
          ]
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    },
    "Directive": {
      "oneOf": [
        {
          "$ref": "#/$defs/OpenDirective"
        },
        {
          "$ref": "#/$defs/CloseDirective"
        },
        {
          "$ref": "#/$defs/CommodityDirective"
        },
        {
          "$ref": "#/$defs/PriceDirective"
        },
        {
          "$ref": "#/$defs/PadDirective"
        },
        {
          "$ref": "#/$defs/BalanceDirective"
        },
        {
          "$ref": "#/$defs/OptionDirective"
        },
        {
          "$ref": "#/$defs/IncludeDirective"
        }
      ]
    },
    "Malformed": {
      "type": "object",
      "required": [
        "kind",
        "raw",
        "reason",
        "source"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "malformed"
        },
        "raw": {
          "type": "string"
        },
        "reason": {
          "type": "string"
        },
        "source": {
          "oneOf": [
            {
              "$ref": "#/$defs/Source"
            },
            {
              "type": "null"
            }
          ]
        }
      }
    }
  }
} as const;
export type AccountingEntry = FromSchema<typeof accountingEntry>;
export const accountingEntryCarrier = carrierFrom(accountingEntry);

export const accountingUtterances = {
  "$id": "organizing/accounting-utterances",
  "title": "AccountingUtterances",
  "description": "The finite relating-utterance projection of an accounting entry or journal. Each utterance states one organizing.accounting.* relation; settling, balance arithmetic, and financial ledger reads are downstream.",
  "type": "object",
  "required": [
    "kind",
    "utterances"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.accounting.utterances"
    },
    "utterances": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/UtteranceCarrier"
      }
    }
  },
  "$defs": {
    "Mark": {
      "type": "object",
      "required": [
        "kind",
        "value"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.mark"
        },
        "value": {}
      }
    },
    "Token": {
      "type": "object",
      "required": [
        "kind",
        "hand",
        "mark"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.token"
        },
        "hand": {
          "const": "left"
        },
        "mark": {
          "$ref": "#/$defs/Mark"
        }
      }
    },
    "Claim": {
      "type": "object",
      "required": [
        "kind",
        "hand",
        "mark"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.claim"
        },
        "hand": {
          "const": "right"
        },
        "mark": {
          "$ref": "#/$defs/Mark"
        }
      }
    },
    "UtteranceCarrier": {
      "type": "object",
      "required": [
        "kind",
        "token",
        "claim"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.carrier"
        },
        "token": {
          "$ref": "#/$defs/Token"
        },
        "claim": {
          "$ref": "#/$defs/Claim"
        }
      }
    }
  }
} as const;
export type AccountingUtterances = FromSchema<typeof accountingUtterances>;
export const accountingUtterancesCarrier = carrierFrom(accountingUtterances);

export const adjudication = {
  "$id": "organizing/adjudication",
  "title": "Adjudication",
  "description": "The gluing ACT of organizing — the corpus's act of governing, 'the receiving dual of speaking' (adjudication.md): it holds and settles the charges that MANY agents' acts produce, forming a single state of the record from accumulating, possibly conflicting, possibly partial sources. This is the genuinely off-diagonal act: one agent's own three faces cannot contest (they glue coordination-free), so speaking has no adjudication sibling on the diagonal; distinct agents DO contest, so forming one record off the diagonal requires this receiving dual. Its content is the corpus's CROSS-ARENA Mayer–Vietoris decomposition over the cover of agents (cross-arena-mayer-vietoris.md): adjudication RECEIVES many constituent sections and decomposes their merge into agreement (lifts free), disagreement (tolerated), and federation-only content (the genuine obstruction). The three disciplines (adjudication.md): `contested` = conflict held as stable (Belnap-paraconsistent, NOT collapsed) — and crucially, by cross-arena MV these disagreement-pairs live in ker(δ), so they are TOLERATED and adjudicated locally, contributing NO federation-level H¹; `open` = partial held as absurd (silence ≠ denial); `monotone` = accumulation converging 'without requiring every source to coordinate' (Mayer–Vietoris coordination-free merge / CRDT). The genuine gluing obstruction is `federationOnly` = coker(diff): overlap-content that NO single constituent can express, the only content the federation-level apparatus is invoked for; `cohomologyRank` is its rank, the consensus cost (glued ⟺ rank 0). Note: by Arrow/Gibbard–Satterthwaite (social-choice.md, why-multi-agent-coordination-is-hard.md) this cost can be IRREDUCIBLE — no aggregation rule removes it — so non-zero here may be a structural impossibility, not merely 'more consensus needed'. $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md and content/_archive adjudication.md / cross-arena-mayer-vietoris.md / social-choice.md.",
  "type": "object",
  "required": [
    "kind",
    "contested",
    "open",
    "monotone",
    "federationOnly",
    "cohomologyRank"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.adjudication"
    },
    "contested": {
      "type": "integer",
      "minimum": 0,
      "description": "conflicts held as stable (Belnap-paraconsistent): contradictory contributions across agents, marked not collapsed. By cross-arena Mayer–Vietoris these disagreement-pairs live in ker(δ) — TOLERATED, adjudicated within each constituent, contributing NO federation-level obstruction; a society can be fully glued yet deeply contested"
    },
    "open": {
      "type": "integer",
      "minimum": 0,
      "description": "cells held as absurd: where nothing has been contributed, the state is open, not false (silence ≠ denial)"
    },
    "monotone": {
      "const": true,
      "description": "accumulation is monotone: the state grows as contributions arrive, converging without requiring every source to coordinate (the CRDT / coordination-free-merge discipline)"
    },
    "federationOnly": {
      "type": "integer",
      "minimum": 0,
      "description": "the genuine gluing obstruction (coker(diff) in cross-arena Mayer–Vietoris), computed EXACTLY from the proved settling-cohomology: the count of degree-1 cohomology generators (non-Scott / limit-stage firings) of the merged settlement whose cell carries no constituent's own H¹ generator — the obstruction the parallel composition itself introduces. Distinct from `contested`: a finite ⊤-disagreement settles at a finite stage (never a limit-stage firing), so it is NOT counted here — it lives in ker(δ); only genuinely non-Scott-continuous composition obligates the federation"
    },
    "cohomologyRank": {
      "type": "integer",
      "minimum": 0,
      "description": "the rank of the federation-only obstruction (= H¹ over the social cover, since disagreement lives in ker(δ) and H≥2=0); the adjudication / consensus cost (glued ⟺ rank 0). By Arrow/Gibbard–Satterthwaite this may be IRREDUCIBLE"
    }
  }
} as const;
export type Adjudication = FromSchema<typeof adjudication>;
export const adjudicationCarrier = carrierFrom(adjudication);

export const community = {
  "$id": "organizing/community",
  "title": "Community",
  "description": "Stage 3 (working) of the SOCIAL descent — the shared field among individuals. The corpus (`individual.md`, `relating.md`): accumulated `relating` among individuals builds `community`, the shared social field, which in turn settles into the institution/collective (the social governing, = the organization). It is the social-scale analogue of working (acting made shared and ongoing on a common field). Simondon's **transindividual** names it: the collective is NOT a mere aggregate of pre-formed individuals nor a fusion of them, but the relation in which individuals are further individuated together — so `transindividual` is true by construction. `field` counts the shared-field cells the accumulated relating holds; `members` the distinct agents sharing it; `contested` the cells where members disagree (held stable, not collapsed). $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md.",
  "type": "object",
  "required": [
    "kind",
    "scale",
    "stage",
    "face",
    "epistemic",
    "field",
    "members",
    "contested",
    "transindividual"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.community"
    },
    "scale": {
      "const": "social"
    },
    "stage": {
      "const": "working"
    },
    "face": {
      "const": "agentic"
    },
    "epistemic": {
      "const": "belief",
      "description": "the epistemic moment of stage 3 (Gen-2 mirror of animating/working): belief — the shared field held in common"
    },
    "field": {
      "type": "integer",
      "minimum": 0,
      "description": "count of cells in the shared social field the accumulated relating holds"
    },
    "members": {
      "type": "integer",
      "minimum": 0,
      "description": "count of distinct agents sharing the field"
    },
    "contested": {
      "type": "integer",
      "minimum": 0,
      "description": "count of shared-field cells where members disagree — held stable (contested), not collapsed"
    },
    "transindividual": {
      "const": true,
      "description": "Simondon: the collective is not an aggregate but the relation in which individuals are further individuated together"
    }
  }
} as const;
export type Community = FromSchema<typeof community>;
export const communityCarrier = carrierFrom(community);

export const face = {
  "$id": "organizing/face",
  "title": "Face",
  "description": "One boundary face of organizing's three-faced social boundary — one element of the social cover U = socializing ∪ computing ∪ gaming. organizing is the Gen-2 (inter-agent) lift of animating: a holographic bulk whose boundary is the disjoint union of three typed interfaces, the Gen-2 sibling faculties socializing (inter-agent communicating, ACROSS — convention, common ground, language-as-institution), computing (inter-agent knowing, INSIDE — distributed/repeatable cognition), and gaming (inter-agent playing, OUTSIDE — concurrent games among agents, CGS multi-player). A face is a cover element carrying the LOCAL SECTION settled over that faculty's inter-agent membrane log (`held` cells, of which `contested` read stable / held-contradiction). The organization (the interior bulk) is the global section glued from the three local sections; whether they glue is the adjudication / Mayer–Vietoris obstruction H¹(U). A face is how the organization is SEEN from one side; organizing provides the face carrier, the sibling faculty supplies its content when mounted (threaded, not absorbed). $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md.",
  "type": "object",
  "required": [
    "kind",
    "faculty",
    "direction",
    "axis",
    "cover",
    "held",
    "contested",
    "belnap",
    "obstruction",
    "aggregate"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.face"
    },
    "faculty": {
      "enum": [
        "socializing",
        "computing",
        "gaming"
      ],
      "description": "the Gen-2 sibling faculty this face is the boundary interface of"
    },
    "direction": {
      "enum": [
        "across",
        "inside",
        "outside"
      ],
      "description": "where the faculty acts relative to the organization's boundary: socializing across, computing inside, gaming outside"
    },
    "axis": {
      "enum": [
        "truth",
        "knowledge",
        "evidence"
      ],
      "description": "the agentive-triad bilattice axis this face reads — the universal three transverse axes (Avron twist-product): socializing reads TRUTH (≤_t, which way the collective leans; negation antitone), computing reads KNOWLEDGE (≤_k, how much is settled; monotone accumulation), gaming reads EVIDENCE (the paired ⟨a₊,a₋⟩ for/against). The face↔axis correspondence is the agentive triad read at the social boundary (provisional downstream theory). See dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md"
    },
    "cover": {
      "type": "integer",
      "minimum": 0,
      "description": "the cells of the local section over this face's cover"
    },
    "held": {
      "type": "integer",
      "minimum": 0,
      "description": "count of cells the local section holds on this face = belnap non-absurd"
    },
    "contested": {
      "type": "integer",
      "minimum": 0,
      "description": "count of stable cells — held contradictions on this face's cover = belnap.stable"
    },
    "belnap": {
      "$ref": "#/$defs/Belnap"
    },
    "obstruction": {
      "type": "integer",
      "minimum": 0,
      "description": "the WITHIN-face gluing obstruction H¹ over this face's own cover — the disagreement among its local-section pieces that fails to assemble coordination-free (content/…/settling-cohomology.md: H⁰ is the section realized, H¹ the obstruction to gluing; H¹=0 ⟺ the section settles, the CRDT/CALM coordination-free convergence). Each face reads it off its OWN structure: socializing the opposition-H¹ (a cycle of opposed truth directions among observers), computing the contested concerns (the society's per-concern disagreements relayed to ⊤), gaming the for/against CONFLICT edges of its arena. This is the per-face coherence the organization needs BEFORE the cross-face adjudication (the bulk's H¹ over the social cover); the organization coheres coordination-free iff every face's obstruction is 0 AND the three faces agree across overlaps. 0 ⟺ this face integrates without adjudication."
    },
    "aggregate": {
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ],
      "description": "the face's collective standing: the KNOWLEDGE-order join (∨_k) over its whole cover — the single value the converged record settles to. ADJUDICATION's ACCUMULATION discipline (content/_archive adjudication.md: the state grows monotonically as contributions arrive, converging without requiring sources to coordinate; content/…/join.md: 'the fixed point settling reaches is a join', the LUB of the graded chain; content/…/knowledge-order.md: ≤_k accumulates, top ⊤=told-both). Closed form over the FOUR census: ⊤ stable if any cell is stable OR both held-for (potential) and held-against (active) are present (potential ∨_k active = ⊤); else the lone present side; else ⊥ absurd. computing's reading equals its OWN member-join `aggregate` by associativity of ∨_k."
    }
  },
  "$defs": {
    "Belnap": {
      "type": "object",
      "required": [
        "absurd",
        "potential",
        "active",
        "stable"
      ],
      "additionalProperties": false,
      "description": "the per-cell FOUR census of this face's local section ON ITS AGENTIVE-TRIAD AXIS, read as ADJUDICATION's disciplines (the RECEIVING-dual of the personal-scale producing census on animating/face; content/_archive adjudication.md). The Gen-2 sibling faculty's OWN four-valued reading the organizing bulk consolidates, not a generic descend — socializing reads the truth DIRECTION of each consensus component, computing the ≤_k STANDING relayed across the society, gaming the evidence PAIR off its arena. The four canonical Belnap values carry adjudication's disciplines: ⊥ told-nothing = held OPEN (the partial-information discipline: silence ≠ denial), t told-true = held FOR, f told-false = held AGAINST, ⊤ told-both = held CONTESTED (the conflict discipline: paraconsistent, kept live not collapsed). The third discipline — monotone accumulation — is not a Belnap value; it is the converged record itself. `held` = potential+active+stable, `contested` = stable. See dev/docs/notes/2026-06-21-bulk-over-faces-local-section-threading.md.",
      "properties": {
        "absurd": {
          "type": "integer",
          "minimum": 0,
          "description": "⊥ held OPEN: nothing contributed at this cell on this axis (silence ≠ denial — adjudication's partial-information discipline)"
        },
        "potential": {
          "type": "integer",
          "minimum": 0,
          "description": "t held FOR: the for-side only — leaning for / a₊ / accumulated-for / verified on this axis"
        },
        "active": {
          "type": "integer",
          "minimum": 0,
          "description": "f held AGAINST: the against-side only — leaning against / a₋ / accumulated-against / refuted on this axis"
        },
        "stable": {
          "type": "integer",
          "minimum": 0,
          "description": "⊤ held CONTESTED: both sides present — a held contradiction kept live (adjudication's conflict discipline, paraconsistent)"
        }
      }
    }
  }
} as const;
export type Face = FromSchema<typeof face>;
export const faceCarrier = carrierFrom(face);

export const federation = {
  "$id": "organizing/federation",
  "title": "Federation",
  "description": "The next scale up the agency spiral: a plurality of constituent societies composed into one federation. The corpus makes this exact (federation-is-parallel-composition.md): federation IS parallel composition `‖` in CGS (the *-autonomous category of concurrent games with symmetry); entity-mobility across constituents — a member who belongs to two polities — is nominal-set NAME-PASSING under FSym(𝔸)-equivariance. This is genuinely RICHER than the diagonal: one agent has no parallel-composition and no name-permutation symmetry; a federation is a monoidal product of arenas with a symmetry action. Its cohomology decomposes by the CROSS-ARENA Mayer–Vietoris sequence (cross-arena-mayer-vietoris.md) into three classes: `shared` (overlap-kernel, ker(diff) — agreements that lift to the federation coordination-free), `contested` (disagreement-pairs on overlaps, ker(δ) — TOLERATED, recorded as ⊤, adjudicated within each constituent, contributing NO federation H¹), and `federationOnly` (coker(diff) — content no single constituent can express, the genuine federation-level obligation). With H≥2=0 (coordination-cohomologically-bounded-by-h1) all content lives in H⁰/H¹. `nameMobility` counts the members shared across ≥2 constituents (the name-passing overlap). `glued` is federationOnly = 0 (the constituents cohere coordination-free); by Arrow/Gibbard–Satterthwaite the cost can be irreducible. $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md and content/_archive federation-is-parallel-composition.md / cross-arena-mayer-vietoris.md.",
  "type": "object",
  "required": [
    "kind",
    "monoidal",
    "constituents",
    "members",
    "nameMobility",
    "shared",
    "contested",
    "federationOnly",
    "glued",
    "coordination"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.federation"
    },
    "monoidal": {
      "const": "parallel-composition",
      "description": "federation is the monoidal product ‖ of arenas in CGS (federation-is-parallel-composition.md), not an external coordination protocol layered on top"
    },
    "constituents": {
      "type": "integer",
      "minimum": 1,
      "description": "count of constituent societies composed in parallel"
    },
    "members": {
      "type": "integer",
      "minimum": 0,
      "description": "count of distinct members across the whole federation (the union of constituent social bases)"
    },
    "nameMobility": {
      "type": "integer",
      "minimum": 0,
      "description": "count of members shared across ≥2 constituents — the nominal-set name-passing overlap (FSym(𝔸)-equivariant entity-mobility: a member belonging to more than one constituent)"
    },
    "shared": {
      "type": "integer",
      "minimum": 0,
      "description": "overlap-kernel content (ker(diff)): cells multiple constituents hold in AGREEMENT — they lift to the federation coordination-free"
    },
    "contested": {
      "type": "integer",
      "minimum": 0,
      "description": "disagreement-pairs on overlaps (ker(δ)): cells multiple constituents hold with conflicting charge — TOLERATED (recorded ⊤, adjudicated within each constituent), contributing NO federation-level obstruction"
    },
    "federationOnly": {
      "type": "integer",
      "minimum": 0,
      "description": "the genuine federation obstruction (coker(diff)), computed EXACTLY from the proved settling-cohomology: the degree-1 cohomology generators (non-Scott / limit-stage firings) the parallel composition introduces that no single constituent carries. A finite ⊤-disagreement settles at a finite stage and is NOT counted (ker δ); only non-Scott-continuous composition obligates the federation"
    },
    "glued": {
      "type": "boolean",
      "description": "whether the constituents cohere into one federation coordination-free: federationOnly = 0 (H¹ over the cross-arena cover vanishes). Independent of `contested` — a federation tolerates large inter-constituent disagreement structurally"
    },
    "coordination": {
      "enum": [
        "coordination-free",
        "consensus-required"
      ],
      "description": "the cross-arena Mayer–Vietoris reading: coordination-free (federationOnly=0) or a merge requiring the federation-level apparatus (federationOnly>0, possibly Arrow-irreducible)"
    }
  }
} as const;
export type Federation = FromSchema<typeof federation>;
export const federationCarrier = carrierFrom(federation);

export const institution = {
  "$id": "organizing/institution",
  "title": "Institution",
  "description": "Stage 4 of the SOCIAL descent — the settled social order, generated WITHIN community: the corpus's `governing` read socially. The corpus (`governing.md`, `individual.md`): accumulated relating builds community (the shared field), which 'settles in turn into the institution or collective' — 'the settling of an open plurality into a bounded, law-bearing order' (Ostrom, Hobbes). It is the Gen-2 mirror of animating/governing (the glued individual sheaf): where governing settles ONE shared field to its fixed point (the individual), the institution settles the SOCIAL shared field — the plurality of agents — to its fixed point (the collective). `glued` is whether that plurality coheres into one body (H¹ = 0 over the social cover, by the replica Mayer–Vietoris theorem); `cohomologyRank` is the adjudication / consensus cost (`glued` ⟺ rank 0); `field` counts the settled social field's cells. The institution is the settled order the organization (the interior bulk) IS, read at its knowledge-least section — distinct from `adjudication`, the proper ACT that forms it (governing.md: 'its proper acts are adjudication and knowledge'). $id is the bare package-rooted descent path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md.",
  "type": "object",
  "required": [
    "kind",
    "scale",
    "stage",
    "face",
    "epistemic",
    "settled",
    "glued",
    "cohomologyRank",
    "field"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.institution"
    },
    "scale": {
      "const": "social"
    },
    "stage": {
      "const": "governing"
    },
    "face": {
      "const": "individual"
    },
    "epistemic": {
      "const": "knowledge"
    },
    "settled": {
      "const": true,
      "description": "the social settlement reached a fixed point — the plurality comes to rest as one order"
    },
    "glued": {
      "type": "boolean",
      "description": "whether the plurality of agents glues into one body: H¹ = 0 over the social cover, no inter-agent disagreement left contested at a coincident cell"
    },
    "cohomologyRank": {
      "type": "integer",
      "minimum": 0,
      "description": "the first-cohomology rank of the social settlement; the adjudication / consensus cost (`glued` is exactly `cohomologyRank === 0`)"
    },
    "field": {
      "type": "integer",
      "minimum": 0,
      "description": "count of cells in the settled social field the institution bounds"
    }
  }
} as const;
export type Institution = FromSchema<typeof institution>;
export const institutionCarrier = carrierFrom(institution);

export const institutionMembrane = {
  "$id": "organizing/institution/membrane",
  "title": "InstitutionMembrane",
  "description": "The re-seedable membrane of a settled organization: the institution exposed as a first-class relating node plus the witnessed social boundary it settled from. `node` is byte-shaped like animating.reseed (`identity|individuated`), here `identity|institution`; it is the scale-3 name that can pass through FSym name-mobility. `seed` is the institution boundary membrane the federation can admit without a caller re-supplying the original cover. `witnesses` are RWIL/EAVT rows witnessing the node and each membrane line.",
  "type": "object",
  "required": [
    "kind",
    "identity",
    "node",
    "seed",
    "witnesses"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.institution.membrane"
    },
    "identity": {
      "type": "string",
      "minLength": 1
    },
    "node": {
      "type": "string",
      "minLength": 1
    },
    "seed": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "witnesses": {
      "type": "array",
      "items": {
        "type": "object",
        "required": [
          "e",
          "a",
          "v",
          "t"
        ],
        "additionalProperties": false,
        "properties": {
          "e": {},
          "a": {},
          "v": {},
          "t": {}
        }
      }
    }
  }
} as const;
export type InstitutionMembrane = FromSchema<typeof institutionMembrane>;
export const institutionMembraneCarrier = carrierFrom(institutionMembrane);

export const officeEligibilityDecision = {
  "$id": "organizing/office-eligibility-decision",
  "title": "OfficeEligibilityDecision",
  "description": "The organizing read of office-conferred authority eligibility. `eligible` is true exactly when both capability and authority residuals vanish.",
  "type": "object",
  "required": [
    "kind",
    "eligible",
    "status",
    "gap",
    "missingCapabilities",
    "missingAuthorities"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.office-eligibility-decision"
    },
    "eligible": {
      "type": "boolean"
    },
    "status": {
      "enum": [
        "potential",
        "active"
      ]
    },
    "gap": {
      "enum": [
        "none",
        "capability",
        "authority",
        "both"
      ]
    },
    "missingCapabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "missingAuthorities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  }
} as const;
export type OfficeEligibilityDecision = FromSchema<typeof officeEligibilityDecision>;
export const officeEligibilityDecisionCarrier = carrierFrom(officeEligibilityDecision);

export const officeEligibilityRequest = {
  "$id": "organizing/office-eligibility-request",
  "title": "OfficeEligibilityRequest",
  "description": "A social-scale governing request: an agent's capabilities plus the authorities conferred by an office are checked against capability and authority requirements. This is organizing's office/authority face of the old dispatch algebra.",
  "type": "object",
  "required": [
    "kind",
    "capabilities",
    "officeAuthorities",
    "requiresCapabilities",
    "requiresAuthorities"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.office-eligibility-request"
    },
    "capabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "officeAuthorities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "requiresCapabilities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    },
    "requiresAuthorities": {
      "type": "array",
      "items": {
        "type": "string",
        "minLength": 1
      }
    }
  }
} as const;
export type OfficeEligibilityRequest = FromSchema<typeof officeEligibilityRequest>;
export const officeEligibilityRequestCarrier = carrierFrom(officeEligibilityRequest);

export const organization = {
  "$id": "organizing/organization",
  "title": "Organization",
  "description": "The interior bulk of organizing's social boundary: the organization (community / institution / polity) — the global section glued from a sheaf of agents over a social base. organizing is the social-scale reading of `governing` (the settling of an open plurality of agents into one bounded, law-bearing collective — Hobbes' 'how a multitude becomes one body able to act and endure', Ostrom's commons) and the Gen-2 lift of the animating agent: where animating glues three faculty-faces into one agent, organizing glues many agents into one organization (the two are 'two faces of one fixed point'). The organization is never a domain or codomain — you see it only through its three social `faces` (socializing/computing/gaming) and the holographic `project`. `glued` is the gluing condition, read by the cross-arena Mayer–Vietoris over the cover of constituent agents: the genuine obstruction is federation-only content (coker(diff)), NOT inter-agent disagreement (which lives in ker(δ) and is tolerated). `adjudication` is the corpus's act of governing — the receiving dual of speaking — the off-diagonal gluing that one agent's own faces never need. `institution` is the intrinsic settled order (the stage-4 reading); `adjudication` is its proper act. The organization is `settledBelow` and `openAbove`: settled as one body, open to compose into the next scale (`federate`, federation = parallel composition ‖). $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md.",
  "type": "object",
  "required": [
    "kind",
    "identity",
    "members",
    "faces",
    "glued",
    "coordination",
    "institution",
    "membrane",
    "adjudication",
    "settledBelow",
    "openAbove",
    "milieu"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.organization"
    },
    "identity": {
      "type": "string",
      "description": "the organization's name — the collective it individuates as"
    },
    "members": {
      "type": "integer",
      "minimum": 0,
      "description": "count of distinct agents (terms) in the social base the organization is glued from"
    },
    "faces": {
      "type": "array",
      "items": {
        "$ref": "organizing/face"
      },
      "description": "the three social boundary faces (socializing, computing, gaming) the organization is the glued bulk of — its only visible surfaces"
    },
    "glued": {
      "type": "boolean",
      "description": "whether the plurality of agents coheres into one body, read by the cross-arena Mayer–Vietoris over the cover of constituents (= adjudication.federationOnly is 0). CRUCIALLY this is NOT broken by inter-agent disagreement: disagreement-pairs live in ker(δ) and are tolerated (adjudicated locally); only federation-only content (coker(diff)) obstructs. So an organization can be glued yet deeply contested"
    },
    "coordination": {
      "enum": [
        "coordination-free",
        "consensus-required"
      ],
      "description": "the cross-arena Mayer–Vietoris reading: coordination-free (no federation-only content) or a merge requiring adjudication/consensus — which by Arrow/Gibbard–Satterthwaite may be irreducible"
    },
    "institution": {
      "$ref": "organizing/institution",
      "description": "the settled social order (stage-4 social-governing carrier) the organization IS, by reference — the Gen-2 mirror of the agent's `governing` reference; the institution is the intrinsic settled order (single-filtration H¹), `adjudication` is its proper act (the cross-arena gluing over the constituents). They answer different questions, so may differ"
    },
    "membrane": {
      "$ref": "organizing/institution/membrane",
      "description": "the institution boundary exposed as a first-class re-seedable node, so federation can admit Organization carriers directly"
    },
    "adjudication": {
      "$ref": "organizing/adjudication"
    },
    "settledBelow": {
      "const": true,
      "description": "the organization is settled as one body — its social descent has reached a fixed point"
    },
    "openAbove": {
      "const": true,
      "description": "the organization carries unspent potential: it re-seeds the next-scale descent (institution → federation)"
    },
    "milieu": {
      "type": "integer",
      "minimum": 0,
      "description": "the associated milieu (Simondon) at the social scale: the count of social-field cells not yet at the knowledge-top (not stable) — the residual collective potential the settled organization carries. `openAbove` is true exactly because this residue is non-trivial; a collective is never exhausted by its institution, so it can compose into a federation. The Gen-2 mirror of the agent's `milieu`."
    },
    "telos": {
      "$ref": "organizing/organization/telos",
      "description": "the collective's reason-for-running — the aperiodic function it is open-above toward. The Gen-2 lift of the agent's `goal`; an organization without a declared telos is open-above toward nothing named. Optional for now (the principled end-state is required — an undeclared telos is malformed — but it lands optional so existing constructions keep settling); the constructor derives a default telos from the social union's dominant unsatisfied concern"
    }
  }
} as const;
export type Organization = FromSchema<typeof organization>;
export const organizationCarrier = carrierFrom(organization);

export const projection = {
  "$id": "organizing/projection",
  "title": "SocialProjection",
  "description": "The holographic boundary projection of an organization: its three social boundary faces (socializing/computing/gaming) keyed by faculty, with the coordination reading. organizing is the Gen-2 (inter-agent) lift of animating's holographic node — the organization (the interior bulk) is never returned directly; you see it ONLY through this projection onto its three faces, exactly as a holographic bulk is reconstructed from its boundary. `project` restricts the organization to these three views; each face is the local section settled over that faculty's inter-agent membrane (the sibling faculty's OWN reading, re-typed). `glued` and `coordination` carry the cross-arena Mayer–Vietoris gluing verdict the bulk reached (coordination-free iff there is no federation-only obstruction). $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-animating-organizing-exact-mirror.md.",
  "type": "object",
  "required": [
    "kind",
    "identity",
    "glued",
    "coordination",
    "socializing",
    "computing",
    "gaming"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.projection"
    },
    "identity": {
      "type": "string",
      "description": "the projected organization's name — the collective it individuates as"
    },
    "glued": {
      "type": "boolean",
      "description": "whether the plurality coheres into one body (the cross-arena Mayer–Vietoris verdict the bulk reached: federation-only content is 0), carried onto the boundary so the gluing condition is visible without the bulk"
    },
    "coordination": {
      "enum": [
        "coordination-free",
        "consensus-required"
      ],
      "description": "the coordination cost the bulk read: coordination-free (no federation-only content) or consensus-required (a merge demanding adjudication, possibly Arrow-irreducible)"
    },
    "socializing": {
      "$ref": "organizing/face",
      "description": "the ACROSS face — the socializing (inter-agent communicating) local section over the social cover, read on the truth axis"
    },
    "computing": {
      "$ref": "organizing/face",
      "description": "the INSIDE face — the computing (inter-agent knowing) local section over the social cover, read on the knowledge axis"
    },
    "gaming": {
      "$ref": "organizing/face",
      "description": "the OUTSIDE face — the gaming (inter-agent playing) local section over the social cover, read on the evidence axis"
    }
  }
} as const;
export type SocialProjection = FromSchema<typeof projection>;
export const projectionCarrier = carrierFrom(projection);

export const relating = {
  "$id": "organizing/relating",
  "title": "Relating",
  "description": "Stage 2 (doing) of the SOCIAL descent — the re-entered individual's act among other selves. The corpus (`individual.md`, `relating.md`) runs the same four-fold descent one scale up: the settled individual re-poses (social becoming), then `relating` is its social DOING — 'the act one self directs toward another' (Buber's I–Thou, Lévinas's face-to-face) — which leaves the BOND (friendship/kinship/contract). It is the social-scale analogue of speaking (the act that feeds the whole social descent). `bonds` counts the directed relations among agents the social membrane articulates; `agents` counts the distinct selves they run between. This is the agential face at the social scale. $id is the bare package-rooted path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md.",
  "type": "object",
  "required": [
    "kind",
    "scale",
    "stage",
    "face",
    "epistemic",
    "bonds",
    "agents"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.relating"
    },
    "scale": {
      "const": "social"
    },
    "stage": {
      "const": "doing"
    },
    "face": {
      "const": "agential"
    },
    "epistemic": {
      "const": "judgement",
      "description": "the epistemic moment of stage 2 (Gen-2 mirror of animating/doing): judgement — the directed deed between selves"
    },
    "bonds": {
      "type": "integer",
      "minimum": 0,
      "description": "count of directed relations among agents the social membrane articulates — the bonds relating leaves behind"
    },
    "agents": {
      "type": "integer",
      "minimum": 0,
      "description": "count of distinct selves the relating runs between (the social base)"
    }
  }
} as const;
export type Relating = FromSchema<typeof relating>;
export const relatingCarrier = carrierFrom(relating);

export const socialBecoming = {
  "$id": "organizing/social-becoming",
  "title": "SocialBecoming",
  "description": "Stage 1 of the SOCIAL descent — the re-entered individual posed as a someone among other selves. The corpus (`individual.md`) runs the same four-fold descent one scale up and names its first moment exactly: 'becoming — the individual re-posed as a someone at the social scale'. Simondon supplies the mechanism: the individuated being is never exhausted by its individuation; it carries a charge of pre-individual potential — its associated milieu — that drives further individuation, now AMONG OTHER SELVES. So a social-becoming is the agency seed of the social descent: the plurality of settled individuals re-posed, in pure social potential, nothing yet related, shared, or settled into a collective. It is the Gen-2 mirror of animating/becoming, and it is also the carrier the spiral re-enters at the next scale (`federate` re-poses a settled organization as a `scale: \"federation\"` social-becoming) — one self-similar carrier recurring up the agency scales. `seed` records the re-posed members (rendered `member|individuated` labels — exactly what animating's `reseed` emits per agent, so the spiral composes literally); `members` counts the distinct selves; the carrier is `openAbove` by construction. $id is the bare package-rooted descent path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md.",
  "type": "object",
  "required": [
    "kind",
    "scale",
    "stage",
    "face",
    "epistemic",
    "seed",
    "members",
    "openAbove"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.social-becoming"
    },
    "scale": {
      "enum": [
        "social",
        "federation"
      ],
      "description": "the scale this becoming seeds: `social` (the individual re-posed among other agents) or `federation` (a settled organization re-posed among other organizations) — the same self-similar carrier one rung up"
    },
    "stage": {
      "const": "becoming"
    },
    "face": {
      "const": "animate"
    },
    "epistemic": {
      "const": "question"
    },
    "seed": {
      "type": "array",
      "items": {
        "type": "string"
      },
      "description": "the inter-agent membrane the social seed articulates, rendered as `subject|predicate` labels (the social-scale analogue of animating/becoming's seed); when the members are re-posed settled individuals these read `member|individuated` — exactly what animating's `reseed` emits, so the spiral composes literally"
    },
    "members": {
      "type": "integer",
      "minimum": 0,
      "description": "count of distinct selves re-posed into the social descent (the social base in pure potential)"
    },
    "openAbove": {
      "const": true,
      "description": "the social seed is pure potential — nothing has settled below it yet; the collective is not yet formed"
    }
  }
} as const;
export type SocialBecoming = FromSchema<typeof socialBecoming>;
export const socialBecomingCarrier = carrierFrom(socialBecoming);

export const socialFactorization = {
  "$id": "organizing/social-factorization",
  "title": "SocialFactorization",
  "description": "The social-scale ACT-FACTORIZATION of one Gen-2 face's act — the Gen-2 mirror of animating/becoming/doing/factorization, and the RECEIVING dual of it. Where the personal-scale factorization reads SPEAKING (a producing act: locution selects a cell, illocution posits a charge, perlocution closes) over communicating/knowing/playing, this reads ADJUDICATION (the receiving dual of speaking — the corpus's act of governing) over socializing/computing/gaming. The corpus (`adjudication.md`): adjudication 'holds and settles the charges that many acts produce, forming a single state of the record from accumulating, possibly conflicting, possibly partial sources.' The Austin/Searle three layers are preserved (the corpus: doing-acts factor through the same locution/illocution/perlocution shape, the middle layer differing) and read here dually — locution = the cover RECEIVED (which cells the inter-agent membrane contributes), illocution = the charges HELD (what is asserted across agents, contested or for/against), perlocution = the record CONVERGED (the monotone settled section many contributions accumulate into). `belnap` is the four-fold Belnap classification of the held charges (absurd = open/silence, potential/active = held for/against, stable = held contested). `faculty` names which Gen-2 face acts; `axis` is the agentive-triad bilattice axis it works — socializing↔truth, computing↔knowledge, gaming↔evidence — a PROVISIONAL correspondence mirroring the Gen-1 triad (an open question in the corpus). $id is the bare package-rooted descent path. See dev/docs/notes/2026-06-21-organizing-as-social-scale-governing.md and content/_archive adjudication.md / agentive-triad notes.",
  "type": "object",
  "required": [
    "kind",
    "faculty",
    "axis",
    "dual",
    "locution",
    "illocution",
    "perlocution",
    "belnap"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.social-factorization"
    },
    "faculty": {
      "enum": [
        "socializing",
        "computing",
        "gaming"
      ],
      "description": "which Gen-2 boundary face's act is factored"
    },
    "axis": {
      "enum": [
        "truth",
        "knowledge",
        "evidence"
      ],
      "description": "the agentive-triad bilattice axis the faculty works (PROVISIONAL, mirroring Gen-1): socializing↔truth, computing↔knowledge, gaming↔evidence"
    },
    "dual": {
      "const": "receiving",
      "description": "the polarity of the act: at the social (Gen-2) scale the act is RECEIVING — adjudication holds the charges many agents' acts produce (the corpus, adjudication.md: 'the receiving dual of speaking'). Its producing dual is speaking at the personal scale (animating/becoming/doing/factorization, dual: producing). PROVISIONAL (session synthesis, not settled corpus): that 'the receiving dual is needed only off the diagonal — distinct agents contest while one agent's own faces glue coordination-free' is a checkable claim; and the genuinely off-diagonal receiving structure is realized NOT in these per-face counts (which parallel the producing case) but in the multi-constituent cross-arena Mayer–Vietoris of organizing/adjudication and organizing/federation."
    },
    "locution": {
      "type": "integer",
      "minimum": 0,
      "description": "the cover RECEIVED (receiving dual of cell-selection): the count of predication-base cells |Φ| the inter-agent membrane contributes"
    },
    "illocution": {
      "type": "integer",
      "minimum": 0,
      "description": "the charges HELD (receiving dual of the positing): the count of cells with an asserted (non-absurd) charge across agents"
    },
    "perlocution": {
      "type": "integer",
      "minimum": 0,
      "description": "the record CONVERGED (receiving dual of the closure): the count of cells in the settled fixed-point section the contributions accumulate into (monotone)"
    },
    "belnap": {
      "$ref": "#/$defs/Belnap"
    }
  },
  "$defs": {
    "Belnap": {
      "type": "object",
      "required": [
        "absurd",
        "potential",
        "active",
        "stable"
      ],
      "additionalProperties": false,
      "description": "the four-fold Belnap classification of the held charges in the settled record — the bilattice's four slot-presence values. Two of adjudication's three disciplines land here (conflict → stable/contested, partial → absurd/open) plus the for/against split (potential/active); the third discipline, monotone accumulation, is not a Belnap value — it is carried by the converged `perlocution`",
      "properties": {
        "absurd": {
          "type": "integer",
          "minimum": 0,
          "description": "knowledge-bottom: held OPEN — nothing contributed at this cell (silence ≠ denial)"
        },
        "potential": {
          "type": "integer",
          "minimum": 0,
          "description": "truth-present only: held for (a contribution asserting the cell)"
        },
        "active": {
          "type": "integer",
          "minimum": 0,
          "description": "falsity-present only: held against (a contribution denying the cell)"
        },
        "stable": {
          "type": "integer",
          "minimum": 0,
          "description": "knowledge-top: held CONTESTED — conflicting contributions kept live, Belnap-paraconsistent, not collapsed"
        }
      }
    }
  }
} as const;
export type SocialFactorization = FromSchema<typeof socialFactorization>;
export const socialFactorizationCarrier = carrierFrom(socialFactorization);

export const telos = {
  "$id": "organizing/organization/telos",
  "title": "Telos",
  "description": "The organization's telos — the function-as-aperiodic-settling the collective is oriented toward and the reason its operations loop runs forever. The Gen-2 lift of the animating agent's `goal`, but NOT a satisfiable target: a goal lives in the finite regime and halts on arrival; a telos is pinned to the APERIODIC regime (κ ≥ ω₁) and is structurally never satisfied — its non-arrival is what keeps the institution alive ('the means change, the function does not'). The Scott-continuous operations-loop cycles (managing-operations) are fibers over this aperiodic base: each cycle ADVANCES the telos's settling by one step without reaching it. Per the propaganda topology's discipline, a telos is DECLARED, first-class, and auditable — an undeclared telos is malformed. $id is the bare package-rooted path.",
  "type": "object",
  "required": [
    "kind",
    "predicate",
    "charge",
    "regime",
    "satisfiable",
    "declaredBy",
    "advanced"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "const": "organizing.organization.telos"
    },
    "predicate": {
      "type": "string",
      "description": "the function the collective is oriented toward — the predicate its perpetual settling aims at (mirrors goal.predicate)"
    },
    "charge": {
      "enum": [
        "absurd",
        "potential",
        "active",
        "stable"
      ],
      "description": "the bilattice standing the telos orients its settling toward (the relating charge bedrock; mirrors goal.charge)"
    },
    "regime": {
      "const": "aperiodic",
      "description": "pinned to the aperiodic regime (κ ≥ ω₁): a telos that could halt is a goal, not a telos. This is the structural distinction the whole carrier turns on"
    },
    "satisfiable": {
      "const": false,
      "description": "the aperiodic dual of goal.satisfied — a telos is structurally NEVER satisfied; its non-arrival is what keeps the operations loop running. A boolean `satisfied` would be a category error here"
    },
    "declaredBy": {
      "type": "string",
      "description": "who declared this telos — the agent/office that posed it. Required: per the propaganda topology, a telos is declared and auditable, never hidden; an undeclared telos is malformed"
    },
    "advanced": {
      "type": "integer",
      "minimum": 0,
      "description": "the monotone count of operations-loop cycles whose Scott-continuous settling has ADVANCED the telos's aperiodic settling toward (never to) its attractor — the fibers fired so far over the aperiodic base. Replaces goal's boolean `satisfied` with the ≤_k-monotone progress measure the aperiodic regime demands"
    }
  }
} as const;
export type Telos = FromSchema<typeof telos>;
export const telosCarrier = carrierFrom(telos);

export const workRecord = {
  "$id": "organizing/work-record",
  "title": "OrganizingWorkRecord",
  "description": "The schema anchor for organizing.work.* carriers: work facts, agents, tasks, items, assignments, projects, and reports as relating-backed record-state. Rich relating subcarriers are preserved as objects because their law is owned by @emsenn/relating.",
  "type": "object",
  "required": [
    "kind",
    "term",
    "carrier",
    "facts"
  ],
  "additionalProperties": false,
  "properties": {
    "kind": {
      "enum": [
        "organizing.work.agent",
        "organizing.work.task",
        "organizing.work.item",
        "organizing.work.assignment",
        "organizing.work.project",
        "organizing.work.report"
      ]
    },
    "term": {
      "$ref": "#/$defs/Token"
    },
    "capabilities": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Token"
      }
    },
    "goals": {
      "$ref": "#/$defs/CellSet"
    },
    "initial": {
      "$ref": "#/$defs/CellSet"
    },
    "task": {
      "type": "object"
    },
    "work": {
      "oneOf": [
        {
          "type": "object"
        },
        {
          "type": "array",
          "items": {
            "type": "object"
          }
        }
      ]
    },
    "office": {
      "$ref": "#/$defs/Token"
    },
    "assignee": {
      "type": "object"
    },
    "duties": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Token"
      }
    },
    "assignments": {
      "type": "array",
      "items": {
        "type": "object"
      }
    },
    "offices": {
      "type": "array",
      "items": {
        "$ref": "#/$defs/Token"
      }
    },
    "charge": {
      "type": "object"
    },
    "at": {},
    "evidence": {
      "type": "array",
      "items": {}
    },
    "carrier": {
      "$ref": "#/$defs/UtteranceCarrier"
    },
    "facts": {
      "$ref": "#/$defs/CellSet"
    }
  },
  "$defs": {
    "Mark": {
      "type": "object",
      "required": [
        "kind",
        "value"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.mark"
        },
        "value": {}
      }
    },
    "Token": {
      "type": "object",
      "required": [
        "kind",
        "hand",
        "mark"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.token"
        },
        "hand": {
          "const": "left"
        },
        "mark": {
          "$ref": "#/$defs/Mark"
        }
      }
    },
    "Claim": {
      "type": "object",
      "required": [
        "kind",
        "hand",
        "mark"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.claim"
        },
        "hand": {
          "const": "right"
        },
        "mark": {
          "$ref": "#/$defs/Mark"
        }
      }
    },
    "Predicate": {
      "type": "object",
      "required": [
        "kind",
        "claim"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "predication.predicate"
        },
        "claim": {
          "$ref": "#/$defs/Claim"
        }
      }
    },
    "UtteranceCarrier": {
      "type": "object",
      "required": [
        "kind",
        "token",
        "claim"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "utterance.carrier"
        },
        "token": {
          "$ref": "#/$defs/Token"
        },
        "claim": {
          "$ref": "#/$defs/Claim"
        }
      }
    },
    "Cell": {
      "type": "object",
      "required": [
        "subject",
        "predicate",
        "object"
      ],
      "additionalProperties": false,
      "properties": {
        "subject": {
          "$ref": "#/$defs/Token"
        },
        "predicate": {
          "$ref": "#/$defs/Predicate"
        },
        "object": {
          "$ref": "#/$defs/Token"
        }
      }
    },
    "CellSet": {
      "type": "object",
      "required": [
        "kind",
        "cells"
      ],
      "additionalProperties": false,
      "properties": {
        "kind": {
          "const": "predication.cellSet"
        },
        "cells": {
          "type": "array",
          "items": {
            "$ref": "#/$defs/Cell"
          }
        }
      }
    }
  }
} as const;
export type OrganizingWorkRecord = FromSchema<typeof workRecord>;
export const workRecordCarrier = carrierFrom(workRecord);

export type Amount = FromSchema<typeof accountingEntry["$defs"]["Amount"], typeof accountingEntry>;
export type Posting = FromSchema<typeof accountingEntry["$defs"]["Posting"], typeof accountingEntry>;
export type Transaction = FromSchema<typeof accountingEntry["$defs"]["Transaction"], typeof accountingEntry>;
