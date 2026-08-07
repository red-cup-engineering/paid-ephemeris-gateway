# Category-Theoretic Node Package Modularization Rules

The keywords **MUST**, **SHOULD**, and **MAY** are normative.

## 1. Package = Category

A package **MUST** be treated as a category.

The package root **MUST** define the package's public callable surface.

The package root **MUST NOT** be treated as a namespace bag.

## 2. Modules = Objects or Subcategories

A top-level module **MUST** correspond to a real object, subcategory, or theoretical boundary.

A top-level module **MUST NOT** exist only for naming convenience, import shortening, or loose grouping.

## 3. Nesting = Containment

If `B` is defined inside `A`, `B` **MUST** be placed at `A/B`.

Implementations **MUST NOT** flatten contained structures for shorter imports.

Import paths **SHOULD** preserve the containment relation they expose.

## 4. Exports = Commitments

A public export **MUST** be one of the following:

- an object or carrier
- a morphism
- a domain or codomain surface
- an apex, extremum, closure, limit, or related universal construction
- a representation boundary
- a lawful finite vocabulary

A symbol **MUST NOT** be exported publicly unless it satisfies one of these roles.

## 5. Functions = Morphisms

Every exported function **MUST** have a domain.

Every exported function **MUST** have a codomain.

Every exported function **MUST** have a stated law, preservation condition, role, or transformation meaning.

If a function cannot be described as a morphism, it **MUST** remain private.

## 6. Constructors Admit; Readers Derive

Constructors **MUST** admit minimal principled objects.

Public input APIs **MUST NOT** require callers to declare derived structure as if it were primitive.

Readers **SHOULD** derive downstream structure from admitted objects.

Derived structure **SHOULD** be computed rather than accepted as authoritative input.

## 7. Keep the Base Object Opaque

Core code **MUST NOT** inspect carriers such as `Mark` as ordinary JavaScript data.

Only representation boundaries **MAY** inspect carrier payloads.

A representation boundary that inspects a payload **MUST** do so only to prove membership, admission, or rejection.

## 8. Boundaries Are Not Ontology

Transport forms such as JSON, CLI text, HTTP bodies, files, HTML, RDF, and similar representations **MUST** be treated as transport witnesses.

Transport forms **MUST NOT** be treated as category objects.

Representation boundaries **MAY** translate, witness, admit, reject, encode, or decode.

Representation boundaries **MUST NOT** define the ontology of the package.

## 9. Root Import = Universal Call Surface

The TypeScript root import **MUST** expose the same universal call surface expected by shell, API, and MCP users.

If shell, API, and MCP users call a JSON-resource morphism, root TypeScript importers **SHOULD** see the same carrier-domain and carrier-codomain morphism.

Rich internal structure **MUST** live on explicit subpaths.

## 10. Internal Barrels Are Not Contracts

Internal barrel modules **MAY** export broadly within a package.

Internal barrel modules **MUST NOT** be treated as public contracts.

External symbols **MUST** be promoted only to real categorical surfaces.

A public module **MUST NOT** export everything merely because the symbols are locally convenient.

## 11. Moves Need Domain/Codomain Evidence

A symbol **MUST NOT** be moved only for naming taste, shorter imports, or perceived tidiness.

A symbol **MAY** be moved only when its domain, codomain, and containment relation identify the target module.

A move **SHOULD** make the package's categorical structure clearer.

## 12. Tests State Laws

Tests for public surfaces **MUST** state categorical claims.

A test **SHOULD** read as one of the following forms:

- this morphism preserves `X`
- this boundary refuses `Y`
- this constructor admits `Z`
- this reader derives `B` from `A`
- this representation witnesses `C`
- this closure, limit, apex, or extremum satisfies its stated role

Tests **MUST NOT** merely assert incidental implementation behavior when a public law is at stake.

## 13. Dependencies Follow Construction

Imports **SHOULD** flow in the following direction:

```text
base objects
-> morphisms
-> closures / limits
-> geometry
-> analysis
-> codecs / adapters
```

A lower construction layer **MUST NOT** depend on a higher derived layer unless the dependency is explicitly justified as a boundary.

Codecs and adapters **MUST NOT** define base objects.

Analysis **MUST NOT** define the primitive carriers it analyzes.

## 14. Correctness Beats Compatibility During Realignment

During categorical realignment, correctness **MUST** take precedence over backward compatibility.

If an old export preserves a false boundary, maintainers **MAY** deprecate it.

If deprecation is insufficient, maintainers **MAY** break compatibility.

A breaking change **MUST** be accompanied by tests or documentation stating the new law, boundary, or containment relation.

## 15. Docs Include the Category Map

Every package **MUST** document its category map.

The category map **MUST** relate package, module, and submodule paths to their corresponding category, object, morphism, boundary, vocabulary, or construction role.

Contributors **SHOULD** be able to determine placement from the documented category map.

Contributors **MUST NOT** invent local house style when the category map already determines placement.

## 16. No Free Data in Core

Core modules **MUST NOT** introduce free JavaScript data as mathematical structure.

Objects **MUST** be represented by named carriers, classes, finite vocabularies, or witnessed boundary values.

Plain JavaScript objects, arrays, strings, numbers, booleans, and maps **MUST NOT** be treated as category objects merely because they are convenient runtime shapes.

Free runtime values **MAY** appear inside a base opaque carrier such as `Mark`.

Free runtime values **MAY** appear at representation boundaries before they are admitted, rejected, encoded, decoded, or witnessed.

After admission, core code **MUST** work over carriers and morphisms, not over ambient JavaScript data.

## 17. Codecs Are the Only Free-Data Gates

Free data **MUST** enter or leave the package through a proper codec, adapter, executable boundary, or explicitly named representation boundary.

A codec **MUST** witness what representation it accepts.

A codec **MUST** reject values that do not inhabit its representation carrier.

A codec **MUST NOT** silently coerce arbitrary data into a mathematical carrier.

Parsing **MUST** be followed by representation membership checking before the parsed value is used as structure.

Serialization **MUST** prove the source carrier can inhabit the target representation before writing it.

## 18. Classes Are Carriers

Public classes **MUST** represent carriers or carrier witnesses.

A class **MUST** have a stated categorical role: object, carrier, witness, obstruction, finite vocabulary element, boundary value, or universal construction.

A class **MUST NOT** exist only to bundle implementation fields.

Class instances **SHOULD** be immutable when they represent carrier values.

Constructors **MUST** enforce the minimal invariants required for the carrier.

Constructors **MUST NOT** inspect opaque base payloads except to enforce carrier-level presence or identity rules.

## 19. Morphisms Normalize to the Base Morphism

Every public morphism **MUST** be explainable as a transformation from, into, over, or downstream of the package's base morphism.

For a package whose base object is `Mark` and base morphism is `articulate`, every public morphism **MUST** have a normalization story back to:

```text
Mark
-> Utterance
-> articulate
```

A morphism **MUST** state whether it:

- admits Marks into a carrier;
- articulates an admitted carrier;
- derives structure from articulation;
- transports structure along a categorical map;
- closes, settles, or computes a universal construction;
- reads derived structure;
- witnesses a representation boundary.

A function that cannot be normalized to the base object and base morphism **MUST** remain private or move to a boundary package.

## 20. Derived Structure Is Not Input Authority

Derived structures **MUST NOT** be accepted as authoritative primitive input when they can be computed from admitted carriers.

Subject, predicate, object, charge, reading, rank, spectrum, geometry, and analysis values **SHOULD** be derived from admitted carriers unless the module is explicitly a representation boundary for already-derived reads.

When a boundary accepts derived structure, it **MUST** mark that structure as observed representation data, not primitive ontology.

Re-admitting derived structure **MUST** produce a new admission about the prior read, not mutate or replace the original carrier.

## 21. Boundary Text Is Not String Ontology

Decoded text at a CLI, API, MCP, file, or socket boundary **MAY** be represented as a JavaScript `string`.

That `string` **MUST** be treated as a boundary document, not as the payload type of the mathematical carrier.

Core code **MUST NOT** infer that the base object is textual because one boundary uses decoded text.

## 22. Finite Vocabularies Must Be Witnessed

Finite vocabularies **MUST** be represented by named finite carriers or literal unions with constructors/witnesses.

Boundary strings **MUST NOT** be cast into finite vocabulary members.

A boundary value **MUST** pass through a vocabulary witness before it is used as an order name, charge name, action name, mode, projection, or similar finite term.

Invalid vocabulary values **MUST** be rejected at the boundary.

## 23. Obstructions Are First-Class

Failed carrier membership, failed identity, failed comparison, failed typing, failed closure, and failed boundary admission **SHOULD** be represented as obstructions when the failure is mathematical.

Operational failures **MAY** throw errors at executable or codec boundaries.

Core mathematical disagreement **MUST NOT** be collapsed into boolean false when a witness/obstruction judgment is the relevant categorical result.

## 24. Import Graphs Must Not Smuggle Ontology

A lower module **MUST NOT** import a higher module to obtain a convenient runtime representation.

A representation boundary **MUST NOT** be imported by core code to decide what core objects are.

A public morphism **MUST NOT** depend on an adapter, executable, transport, or host environment unless its domain explicitly includes that boundary.

## 25. Tests Must Guard Against Free Data Regression

Tests **SHOULD** include regression claims that arbitrary base payloads are not inspected by core code.

Tests **SHOULD** include boundary claims that non-member representation values are rejected.

Tests **SHOULD** include morphism claims showing how public functions normalize to the base object and base morphism.

Tests **MUST** be added when a previously free-data path is replaced by a carrier, codec, witness, or obstruction.
