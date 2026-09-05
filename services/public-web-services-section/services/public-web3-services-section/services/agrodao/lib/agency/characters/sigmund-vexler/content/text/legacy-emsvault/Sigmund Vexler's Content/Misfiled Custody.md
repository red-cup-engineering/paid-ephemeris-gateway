
When crypto platforms onboard new users, they present a combination of files, passwords, and phrases—each meant to serve as some piece of the user’s control over their account. These are not just technical artifacts. They're pieces of interface language that carry strong associations.

For example:  
- A “keystore” file is, in Ethereum ecosystems, an encrypted backup of a private key.  
- A “secret phrase” usually means a mnemonic seed that restores an account.  
- A “password” is often just a frontend credential, used to unlock the wallet but not hold authority.

These conventions are learned. Repeated. Inherited. When a user sees these terms, they arrive with assumptions about what they mean.

But as more platforms aim to bridge multiple ecosystems—bringing together EVM, Cosmos, and Hive, or layering Web2 UX on Web3 infrastructure—the meanings behind these terms begin to drift. And when naming drifts while authority structures stay rigid, what emerges is a new kind of failure:

Not lost custody.  
**Misfiled custody.**

---

### Case: The InLeo Onboarding Flow

InLeo is a frontend in the Hive ecosystem. It's designed to make Hive more accessible, more cross-chain aware, and more approachable for users from outside the ecosystem. That ambition is admirable. But it introduces complexity—especially during onboarding.

When a new user signs up with InLeo’s “Keystore” method, they’re presented with three objects:

1. A **master password**, created at the start of the process  
2. A **secret phrase** (12 words), shown as something to copy  
3. A **`keystore.json`** file, offered as a download  
4. A truncated display of the **Hive keys** in JSON format (posting, active, memo, owner)

At no point is the “secret phrase” described as the **Hive master password**, the object from which all keys are derived. It’s simply called a secret phrase.

Meanwhile, the `keystore.json` file is labeled as the "download your keys" option—implying it holds the essential control object. It does not. It appears to be an application-specific key, perhaps used for cross-chain signing or session management, but it has no relevance for restoring Hive access through any other interface.

And the Hive keys themselves? They're displayed inline, but not emphasized, not grouped as a download, and not marked as the source of authority. A user could reasonably assume they were derived from the keystore—or simply decorative.

The result: **all the right parts are present**, but the interface doesn’t teach which one matters.

---

### Interfaces Teach

Interfaces don't just display options. They **teach mental models**.

When objects are grouped together, they appear related.  
When one is labeled “download your keys,” and another is called a “secret,” the language implies hierarchy.  
When the most familiar term—`keystore.json`—is used to describe a file that *isn't* a keystore in the sense most users know, that isn’t a small mistake. It’s a false signal.

No explanation is offered. No disambiguation. The result is a set of objects that **look equivalent** in importance, but differ drastically in function.

So a user who:
- Saves their keystore file  
- Copies the master password  
- Maybe even jots down the secret phrase...

...can still be left holding the wrong item when the frontend breaks. The authority is in one object—but trust was placed in another.

---

### The Metric Behind the Misalignment

This isn’t random. It’s the product of pressure.

Like many platforms, InLeo is optimizing for **onboarding**. User growth. Conversion rates. Successful registration flows.

That’s not cynical—it’s business. Onboarding metrics are how platforms secure partnerships, pitch investors, and prove traction. But when a measure becomes a target, **it ceases to be a good measure**.

Once “users completed onboarding” becomes the definition of success, the interface evolves to minimize any friction that might reduce that number. Clarity becomes a potential source of dropout. Ambiguity becomes a feature—not intentionally, but structurally.

And so the objects in the UI are **designed to be familiar, clickable, complete**—but not necessarily accurate. The keystore metaphor is borrowed. The password field is vague. The true source of authority is underemphasized.

What matters is not that users understand Hive’s model. What matters is that they finish the signup process and feel like they’ve secured something.

This is what **metric capture** looks like in interface design.

---

### Misfiled Custody: Naming the Failure Mode

This is a case of what we call **misfiled custody**.

Not theft.  
Not loss.  
Not even misunderstanding, exactly.

It’s what happens when a user:
- Backs up exactly what the interface told them to  
- Does so in good faith  
- And later finds that what they saved isn’t what grants them access

It’s a failure mode that emerges when **meaning is detached from structure**.

If your interface presents three objects without making clear which one confers authority, then a user who backs up the wrong one hasn’t been careless—they’ve been misled.

---

### Why It Matters

Hive is a self-custody system.  
You are your keys. There is no admin override, no recovery process, no “forgot password” link. Sovereignty is hard-edged and absolute.

But if a user saves an object that feels like custody—but isn’t—they’ve effectively **outsourced their security to a frontend without realizing it**.

That’s the core danger of misfiled custody. It gives users the **impression** of sovereignty while leaving them structurally dependent on the interface that issued their account.

When that interface glitches, or disappears, or changes… what looked like control dissolves.

---

### Clarity is Infrastructure

The answer isn’t better documentation.  
The answer is not “educate the user.”

The answer is: **naming things clearly, and placing them with intention.**  
The order, emphasis, and labeling of control objects **is infrastructure** in crypto systems.

It’s not cosmetic. It determines whether a user walks away with actual access or just a simulation of it.

As ecosystems become more composable, more cross-chain, more layered with abstraction, the risk of misfiled custody grows. The cost of ambiguity rises. And the platforms that endure will be the ones that respect the difference between a smooth flow and a truthful one.

> **In crypto, custody depends on clarity. And clarity starts with what we call things.**
