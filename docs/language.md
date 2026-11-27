# The design language

How an app built on patchbay looks and behaves: the principles, the foundations it draws with, the
rules every screen keeps, and the patterns for editing a live graph. The component pages say what
each part is and takes ([`components.md`](components.md), [`graph.md`](graph.md),
[`tokens.md`](tokens.md)); these pages say when to use which, and how they fit together.

patchbay's model is the standard. An app takes its look from a brand
([`tokens.md`](tokens.md#writing-a-brand)) and keeps its own data, protocol and words; where
patchbay has a behaviour, the app takes it rather than keeping one of its own.

## Reading these pages

- **Rules are numbered**, F1… on [`foundations.md`](foundations.md) and U1… on
  [`ux-rules.md`](ux-rules.md), so other pages, reviews and beads can cite them. The patterns cite
  the rules they follow.
- **Each rule says who keeps it.** **Built:** names the components that keep it, linking to their
  docs, which say how. **The app's:** the app keeps it, as patchbay cannot (the words of its
  domain, its keys, its commit model). **Not yet:** the rule stands, and the code does not follow
  it yet; the bead named (`pb-…`) holds the change.
- **The facts live once.** A rule states what holds and links to the page that gives the props,
  sizes and tokens; it never repeats them.

## The source

These pages call what an app's graph answers to **the source**: a running system the app talks
to, or a document it saves. patchbay never knows which, and draws both the same way.

## The pages

| Page | What it holds |
|---|---|
| [`foundations.md`](foundations.md) | What each colour, tone, type size, space, radius, shadow and duration is for; density and touch, widths, themes and brands, glyphs |
| [`ux-rules.md`](ux-rules.md) | The rules every screen keeps: focus and keyboard, Escape, words, states, feedback, confirmation and undo, pending and queued and refused, the view and the canvas, right-to-left, forced colours, reduced motion |
| [`patterns.md`](patterns.md) | Editing a live graph: the two commit models, adding, placing, connecting, inspecting, editing text, saving or queuing, refusals, following the view, going to a node, read-only, empty and offline, narrow and phone |

Storybook's Foundations and Patterns pages (`src/patterns/`) show each foundation and pattern live,
built from the components' own stories, and link back to the section they show.

## Principles

### 1. Draw the truth, and the asking apart from it

The canvas draws what [the source](#the-source) holds. What the person asked for and is not true
yet is drawn as asking, a request pending or a change queued, never as its result
([ux-rules: live, pending, queued, refused](ux-rules.md#live-pending-queued-refused)).

### 2. Never by colour alone

A state is a word, a shape or a mark as well as a colour
([F13](foundations.md#tones)), and forced-colours mode keeps every edge and state
([U73](ux-rules.md#forced-colours)).

### 3. Every action from the keyboard, every target by touch

Focus is always visible, every action has a keyboard path, and every target is large enough on a
touch screen ([U1, U2](ux-rules.md#focus-and-keyboard); [density and
touch](foundations.md#density-and-touch)). A gesture only a pointer can make (a double-click, a
wire drag) has a keyboard path beside it.

### 4. Say why, in words, where it happened

A refusal, a failure or a silence carries its reason in words, where the person asked: a node's
`line`, a field's `error`, a banner's or a toast's text. No fact lives only in a tooltip
([U47](ux-rules.md#feedback)).

### 5. Unknown is not broken

A value the app or patchbay does not know (a tone, a state, a kind) is drawn neutrally by its own
word, never as a failure ([`components.md`](components.md#rules-every-component-keeps), rule 2;
[F7](foundations.md#tones)), so a source newer than the app still draws.

### 6. Calm

Nothing moves without a reason ([motion](foundations.md#motion)); reduced motion stops what moves
for show and keeps what carries information ([reduced motion](ux-rules.md#reduced-motion)); news
waits for the person ([U45](ux-rules.md#feedback)); and nothing asks "are you sure?" about an edit
the person can take back ([U48](ux-rules.md#confirmation-and-undo)).

### 7. Components draw; the app decides

patchbay is a library, not a framework: code the app calls, not code that calls the app. It draws
and handles interaction; each app keeps what gives the drawing its meaning.

| patchbay owns | Each app owns |
|---|---|
| Design tokens, the light and dark themes, and the brand mechanism | Its brand, its protocol client and its data types |
| Primitives, composites and graph components that draw what they are given | Its graph store, and turning its data into patchbay's props |
| `AppShell`: the layout of a graph-editing app and the sizes it keeps | Its editing model: applying each change at once, or queuing changes until a save ([patterns](patterns.md#two-commit-models)) |
| UI-only hooks: theme, shortcuts, toasts, kept preferences, live values | Graph layout, routing, its keys, and every word about its own domain |
| The words patchbay needs by default, which the app can replace | |

Data comes in as props and what the person does goes out as callbacks
([`components.md`](components.md#rules-every-component-keeps), rule 1). The app renders React
Flow; patchbay supplies node and edge types, tools and hooks beside it ([`graph.md`](graph.md)).
Transport, commit model, port typing and lifecycle differ from one app to the next, and a framework
would have to own them all.

### 8. One look, many brands

One structure and one set of interactions. A brand changes the accent, the state hues its domain
needs, density and type, and says why for each override ([`tokens.md`](tokens.md#writing-a-brand));
layout, behaviour and the words for each role stay patchbay's.
