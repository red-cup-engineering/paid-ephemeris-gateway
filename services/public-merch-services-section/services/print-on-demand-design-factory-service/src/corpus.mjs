// The first Fine Print Mercantile design corpus: original typography/meme
// designs across six evergreen, IP-clean niches. Every phrase here is
// written fresh for this corpus -- no quoted trademarked lines, no fictional
// character names, no real private individuals, nothing hateful. "products"
// names which POD product types the design is meant to be placed on
// (fulfilled by resizing/re-centering the same SVG in Printify's per-product
// editor, not a separate art file per product).

export const NICHES = [
  "programmer-humor",
  "cat-humor",
  "gym-humor",
  "teacher-humor",
  "plant-parent",
  "gamer-humor",
];

function d(spec) {
  return spec;
}

export const CORPUS = [
  // ---- programmer-humor ----
  d({
    id: "prog-01-worked-on-my-machine",
    niche: "programmer-humor",
    phrase: "It Worked On My Machine",
    subphrase: "ship it anyway",
    layout: "stacked-bold",
    colorway: "mono-black",
    title: "It Worked On My Machine Funny Programmer T-Shirt",
    description:
      "The oldest excuse in software, printed bold. For the developer who has said this in a standup and meant it unironically. Soft unisex tee, original typographic design.",
    tags: ["programmer shirt", "coding humor", "developer gift", "software joke", "it worked", "tech humor tee", "coder gift", "sysadmin shirt", "engineer tee"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "prog-02-bugs-in-the-code",
    niche: "programmer-humor",
    phrase: "99 Bugs In The Code",
    subphrase: "fix one, ship two",
    layout: "two-line-contrast",
    colorway: "accent-mint",
    title: "99 Bugs In The Code Funny Coder T-Shirt",
    description:
      "A software campfire song nobody asked to sing. High-contrast two-line design for anyone whose sprint never actually ends.",
    tags: ["bugs shirt", "coding humor", "programmer gift", "software engineer tee", "debugging joke", "developer shirt", "tech gift", "qa humor"],
    products: ["shirt", "mug", "poster"],
  }),
  d({
    id: "prog-03-commit-and-pray",
    niche: "programmer-humor",
    phrase: "Commit And Pray",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Commit And Pray Minimalist Developer T-Shirt",
    description:
      "The ancient ritual performed before every production deploy. Clean, minimal caption-style type for the dev who ships on faith and CI.",
    tags: ["commit and pray", "git humor", "deploy joke", "programmer tee", "developer gift", "minimalist tech shirt", "devops humor"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "prog-04-ctrl-z-my-life",
    niche: "programmer-humor",
    phrase: "Ctrl Z My Life Choices",
    subphrase: "undo everything",
    layout: "badge-circle",
    colorway: "accent-orange",
    title: "Ctrl Z My Life Choices Funny Programmer Badge T-Shirt",
    description:
      "Every keyboard shortcut should work on real life. Circular badge design, great as a shirt print or a sticker on a laptop lid.",
    tags: ["ctrl z shirt", "undo joke", "programmer humor", "keyboard shortcut tee", "coder gift", "funny tech shirt", "laptop sticker"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "prog-05-not-a-bug-a-feature",
    niche: "programmer-humor",
    phrase: "Not A Bug A Feature",
    subphrase: "trust the process",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "Not A Bug A Feature Arched Programmer T-Shirt",
    description:
      "The most confident sentence in software engineering, arched like a badge. For the dev who reframes instead of apologizing.",
    tags: ["not a bug", "its a feature", "programmer shirt", "software humor", "developer gift", "coding tee", "engineer joke"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "prog-06-semicolon-survivor",
    niche: "programmer-humor",
    phrase: "Semicolon Survivor",
    subphrase: "one missing, one existential crisis",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Semicolon Survivor Funny Coder T-Shirt",
    description:
      "One tiny punctuation mark, one entire evening lost. A bold badge of honor for anyone who has debugged their way to a missing semicolon.",
    tags: ["semicolon joke", "syntax error shirt", "programmer humor", "coding tee", "developer gift", "debugging joke", "tech humor"],
    products: ["shirt", "mug", "sticker"],
  }),

  // ---- cat-humor ----
  d({
    id: "cat-01-staff-of-the-house-cat",
    niche: "cat-humor",
    phrase: "Staff Of The House Cat",
    subphrase: "reporting for duty",
    layout: "badge-circle",
    colorway: "mono-black",
    title: "Staff Of The House Cat Funny Cat Owner T-Shirt",
    description:
      "Know your place. A circular badge for the humans who work for a cat and have made peace with it.",
    tags: ["cat owner shirt", "funny cat tee", "cat humor", "cat lover gift", "crazy cat person", "pet parent shirt", "cat mom", "cat dad"],
    products: ["shirt", "sticker", "poster"],
  }),
  d({
    id: "cat-02-stare-pet-repeat",
    niche: "cat-humor",
    phrase: "Stare Pet Repeat",
    subphrase: "the daily cat loop",
    layout: "stacked-bold",
    colorway: "accent-orange",
    title: "Stare Pet Repeat Funny Cat Lover T-Shirt",
    description:
      "The entire relationship, summarized. Bold three-word loop for anyone who has been silently stared at until they comply.",
    tags: ["cat lover shirt", "funny cat tee", "cat humor", "cat gift", "pet parent tee", "cat person shirt"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "cat-03-owned-by-a-cat",
    niche: "cat-humor",
    phrase: "Owned By A Cat",
    subphrase: "since the day it decided",
    layout: "two-line-contrast",
    colorway: "accent-mint",
    title: "Owned By A Cat Funny T-Shirt",
    description:
      "A statement of fact, not opinion. High-contrast lettering for anyone who knows exactly who runs the house.",
    tags: ["cat owner shirt", "funny cat gift", "cat humor tee", "crazy cat lady", "cat dad shirt", "cat mom shirt", "pet humor"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "cat-04-3am-zoomies-committee",
    niche: "cat-humor",
    phrase: "3AM Zoomies Committee",
    subphrase: "meeting now in session",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "3AM Zoomies Committee Funny Cat T-Shirt",
    description:
      "Every cat household knows this meeting. An arched badge design for the sleep-deprived and the deeply amused.",
    tags: ["cat zoomies", "funny cat shirt", "cat humor", "cat lover gift", "3am cat", "crazy cat tee"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "cat-05-slightly-feral-mostly-loved",
    niche: "cat-humor",
    phrase: "Slightly Feral, Mostly Loved",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Slightly Feral Mostly Loved Minimalist Cat T-Shirt",
    description:
      "Applies to the cat. Also applies to its owner some mornings. Clean minimal type for a quieter kind of cat shirt.",
    tags: ["cat lover shirt", "funny cat quote", "minimalist cat tee", "cat humor", "cat gift idea"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "cat-06-cat-tax-collector",
    niche: "cat-humor",
    phrase: "Cat Tax Collector",
    subphrase: "payment due: pets",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Cat Tax Collector Funny Cat Owner T-Shirt",
    description:
      "The toll booth by the door. Bold type for the human who pays every single time, gladly.",
    tags: ["cat tax", "funny cat shirt", "cat lover tee", "cat humor gift", "cat person shirt"],
    products: ["shirt", "mug", "sticker"],
  }),

  // ---- gym-humor ----
  d({
    id: "gym-01-one-more-set-then-tacos",
    niche: "gym-humor",
    phrase: "One More Set Then Tacos",
    layout: "stacked-bold",
    colorway: "accent-orange",
    title: "One More Set Then Tacos Funny Gym T-Shirt",
    description:
      "The only post-workout motivation that has ever actually worked. Bold gym-floor type for lifters who are honest about the real reward.",
    tags: ["gym shirt funny", "workout humor", "gym motivation tee", "lifting shirt", "fitness humor", "gym gift", "taco lover shirt"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "gym-02-sore-today-strong-tomorrow",
    niche: "gym-humor",
    phrase: "Sore Today Strong Tomorrow",
    subphrase: "repeat forever",
    layout: "two-line-contrast",
    colorway: "mono-black",
    title: "Sore Today Strong Tomorrow Gym T-Shirt",
    description:
      "The whole training cycle in five words. High-contrast lettering for the gym bag and the wash cycle both.",
    tags: ["gym shirt", "workout motivation", "fitness tee", "lifting humor", "strength training shirt", "gym gift"],
    products: ["shirt", "mug", "poster"],
  }),
  d({
    id: "gym-03-cardio-is-a-rumor",
    niche: "gym-humor",
    phrase: "Cardio Is A Rumor I Heard",
    subphrase: "lifting only, thanks",
    layout: "badge-circle",
    colorway: "accent-mint",
    title: "Cardio Is A Rumor I Heard Funny Lifting T-Shirt",
    description:
      "For the lifters who treat the treadmill as a coat rack. Circular badge design with a strong opinion.",
    tags: ["gym humor shirt", "funny lifting tee", "cardio joke", "powerlifting shirt", "gym gift", "strength shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "gym-04-leg-day-survivor",
    niche: "gym-humor",
    phrase: "Leg Day Survivor",
    subphrase: "walking optional",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "Leg Day Survivor Funny Gym T-Shirt",
    description:
      "Wear the proof. An arched badge for everyone taking the stairs backward this week.",
    tags: ["leg day shirt", "funny gym tee", "workout humor", "squat day joke", "fitness gift", "lifting shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "gym-05-gains-over-excuses",
    niche: "gym-humor",
    phrase: "Gains Over Excuses",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Gains Over Excuses Minimalist Gym T-Shirt",
    description:
      "Simple, clean, and said in the mirror before every set. Minimalist type for a no-nonsense gym shirt.",
    tags: ["gym motivation shirt", "minimalist fitness tee", "gains shirt", "workout quote", "lifting gift"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "gym-06-protein-shake-philosopher",
    niche: "gym-humor",
    phrase: "Protein Shake Philosopher",
    subphrase: "deep thoughts, post-workout",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Protein Shake Philosopher Funny Gym T-Shirt",
    description:
      "The best ideas arrive between the last rep and the parking lot. Bold type for the thinkers of the weight room.",
    tags: ["gym humor shirt", "protein shake joke", "funny lifting tee", "workout gift", "gym quote shirt"],
    products: ["shirt", "mug", "sticker"],
  }),

  // ---- teacher-humor ----
  d({
    id: "teach-01-coffee-and-chaos",
    niche: "teacher-humor",
    phrase: "Teachers Run On Coffee And Chaos",
    layout: "stacked-bold",
    colorway: "accent-orange",
    title: "Teachers Run On Coffee And Chaos Funny Teacher T-Shirt",
    description:
      "The truest job description never printed on a contract. Bold type for the teacher's lounge and beyond.",
    tags: ["teacher shirt funny", "teacher gift", "teacher humor tee", "coffee lover teacher", "classroom shirt", "teacher appreciation", "school humor"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "teach-02-i-teach-therefore-i-photocopy",
    niche: "teacher-humor",
    phrase: "I Teach Therefore I Photocopy",
    subphrase: "endlessly",
    layout: "two-line-contrast",
    colorway: "mono-black",
    title: "I Teach Therefore I Photocopy Funny Teacher T-Shirt",
    description:
      "A philosophy degree in classroom logistics. High-contrast lettering for the copier line regulars.",
    tags: ["teacher shirt", "funny teacher tee", "teacher humor", "photocopy joke", "classroom gift", "school shirt"],
    products: ["shirt", "mug", "poster"],
  }),
  d({
    id: "teach-03-patience-level-teacher",
    niche: "teacher-humor",
    phrase: "Patience Level: Teacher",
    subphrase: "maximum, mostly",
    layout: "badge-circle",
    colorway: "accent-mint",
    title: "Patience Level Teacher Funny Badge T-Shirt",
    description:
      "A patience meter that resets every September. Circular badge for the profession that trains it best.",
    tags: ["teacher shirt funny", "teacher gift idea", "patience joke", "teacher humor", "classroom tee", "school gift"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "teach-04-survived-another-fire-drill",
    niche: "teacher-humor",
    phrase: "Survived Another Fire Drill",
    subphrase: "no fire, still tired",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "Survived Another Fire Drill Funny Teacher T-Shirt",
    description:
      "The bravest badge in the building. Arched type for the teacher who has counted heads outside more times than lessons taught.",
    tags: ["teacher humor shirt", "fire drill joke", "funny teacher gift", "classroom tee", "school staff shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "teach-05-grading-papers-send-help",
    niche: "teacher-humor",
    phrase: "Grading Papers Send Help",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Grading Papers Send Help Minimalist Teacher T-Shirt",
    description:
      "A quiet cry from the weekend stack. Minimalist caption-style type for a low-key teacher shirt.",
    tags: ["teacher shirt", "grading joke", "teacher gift", "minimalist teacher tee", "teacher humor"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "teach-06-made-a-kid-love-learning",
    niche: "teacher-humor",
    phrase: "Made A Kid Love Learning Today",
    subphrase: "best part of the job",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Made A Kid Love Learning Today Teacher T-Shirt",
    description:
      "The version of the job that never makes the meme, printed anyway. Bold type for the actual best days.",
    tags: ["teacher shirt", "teacher appreciation gift", "teacher humor tee", "classroom shirt", "teacher quote"],
    products: ["shirt", "mug", "sticker"],
  }),

  // ---- plant-parent ----
  d({
    id: "plant-01-plant-parent-on-duty",
    niche: "plant-parent",
    phrase: "Plant Parent On Duty",
    subphrase: "mist, water, repeat",
    layout: "stacked-bold",
    colorway: "accent-mint",
    title: "Plant Parent On Duty Funny Plant Lover T-Shirt",
    description:
      "The daily rounds, printed on a shirt. Bold botanical type for the windowsill jungle keepers.",
    tags: ["plant lover shirt", "plant mom", "plant dad", "plant parent tee", "funny plant shirt", "houseplant gift", "gardener shirt"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "plant-02-talk-to-your-plants",
    niche: "plant-parent",
    phrase: "Talk To Your Plants, They Listen",
    layout: "two-line-contrast",
    colorway: "mono-black",
    title: "Talk To Your Plants They Listen Funny T-Shirt",
    description:
      "Whether or not it's true, it feels true. High-contrast type for the plant shelf whisperers.",
    tags: ["plant lover shirt", "funny plant tee", "houseplant gift", "plant mom shirt", "gardening humor"],
    products: ["shirt", "mug", "poster"],
  }),
  d({
    id: "plant-03-dirt-under-my-nails",
    niche: "plant-parent",
    phrase: "Dirt Under My Nails On Purpose",
    subphrase: "it's called gardening",
    layout: "badge-circle",
    colorway: "accent-orange",
    title: "Dirt Under My Nails On Purpose Gardener T-Shirt",
    description:
      "A defense nobody asked for and everybody needed. Circular badge design for the intentionally dirty-handed.",
    tags: ["gardener shirt", "plant lover tee", "gardening humor", "funny plant shirt", "plant gift idea"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "plant-04-more-plants-less-problems",
    niche: "plant-parent",
    phrase: "More Plants Less Problems",
    subphrase: "the leaf life",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "More Plants Less Problems Arched Plant Lover T-Shirt",
    description:
      "A whole life philosophy, arched like a badge. For anyone whose collection outgrew the windowsill months ago.",
    tags: ["plant lover shirt", "houseplant tee", "plant humor", "plant parent gift", "urban jungle shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "plant-05-succulent-and-stubborn",
    niche: "plant-parent",
    phrase: "Succulent And Stubborn",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Succulent And Stubborn Minimalist Plant T-Shirt",
    description:
      "A fair description of both the plant and its owner. Clean minimal type for a quieter plant shirt.",
    tags: ["succulent shirt", "plant lover tee", "minimalist plant shirt", "plant humor", "plant gift"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "plant-06-watering-can-coffee",
    niche: "plant-parent",
    phrase: "Watering Can In One Hand Coffee In The Other",
    subphrase: "morning ritual",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Watering Can And Coffee Morning Ritual T-Shirt",
    description:
      "Every morning, the same two hands, the same two jobs. Bold type for the plant parents who start the day right.",
    tags: ["plant parent shirt", "plant lover gift", "coffee and plants", "funny plant tee", "gardener shirt"],
    products: ["shirt", "mug", "sticker"],
  }),

  // ---- gamer-humor ----
  d({
    id: "game-01-one-more-round",
    niche: "gamer-humor",
    phrase: "One More Round I Swear",
    layout: "stacked-bold",
    colorway: "accent-orange",
    title: "One More Round I Swear Funny Gamer T-Shirt",
    description:
      "The most broken promise in gaming, worn proudly. Bold type for anyone still awake at 2am for the third time this week.",
    tags: ["gamer shirt funny", "gaming humor tee", "gamer gift", "video game shirt", "pc gamer tee", "console gamer shirt"],
    products: ["shirt", "mug", "sticker", "poster"],
  }),
  d({
    id: "game-02-respawn-and-regroup",
    niche: "gamer-humor",
    phrase: "Respawn And Regroup",
    subphrase: "it's not over yet",
    layout: "two-line-contrast",
    colorway: "mono-black",
    title: "Respawn And Regroup Funny Gamer T-Shirt",
    description:
      "Applies in the game and out of it. High-contrast lettering for the comeback-minded.",
    tags: ["gamer shirt", "gaming humor", "respawn joke", "video game tee", "gamer gift idea"],
    products: ["shirt", "mug", "poster"],
  }),
  d({
    id: "game-03-save-point-reached",
    niche: "gamer-humor",
    phrase: "Save Point Reached",
    subphrase: "you may rest now",
    layout: "badge-circle",
    colorway: "accent-mint",
    title: "Save Point Reached Funny Gamer Badge T-Shirt",
    description:
      "Permission to finally log off, granted by the shirt. Circular badge design for the completionists.",
    tags: ["gamer shirt funny", "save point joke", "gaming tee", "video game gift", "retro gamer shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "game-04-critical-hit-energy",
    niche: "gamer-humor",
    phrase: "Critical Hit Energy",
    subphrase: "roll for it",
    layout: "arc-tag",
    colorway: "accent-navy",
    title: "Critical Hit Energy Tabletop Gamer T-Shirt",
    description:
      "For anyone who has ever narrated their own dice roll out loud. Arched badge design for the tabletop table.",
    tags: ["tabletop gamer shirt", "dice roll joke", "critical hit tee", "board game humor", "rpg gift", "dnd style shirt"],
    products: ["shirt", "sticker"],
  }),
  d({
    id: "game-05-loading-screen-philosopher",
    niche: "gamer-humor",
    phrase: "Loading Screen Philosopher",
    layout: "minimal-caption",
    colorway: "mono-black",
    title: "Loading Screen Philosopher Minimalist Gamer T-Shirt",
    description:
      "The deepest thoughts arrive during the longest loading bars. Minimalist type for a quieter gamer shirt.",
    tags: ["gamer shirt", "loading screen joke", "minimalist gaming tee", "gamer gift", "video game humor"],
    products: ["shirt", "mug"],
  }),
  d({
    id: "game-06-player-two-entered",
    niche: "gamer-humor",
    phrase: "Player Two Has Entered The Chat",
    subphrase: "and they brought snacks",
    layout: "stacked-bold",
    colorway: "mono-white",
    title: "Player Two Has Entered The Chat Funny Gamer T-Shirt",
    description:
      "The best possible interruption. Bold type for co-op regulars and their snack contributions.",
    tags: ["gamer shirt", "player two joke", "co-op gaming tee", "gamer gift", "funny gaming shirt"],
    products: ["shirt", "mug", "sticker"],
  }),
];

export function designsByNiche(niche) {
  return CORPUS.filter((d) => d.niche === niche);
}

export function designById(id) {
  return CORPUS.find((d) => d.id === id);
}
