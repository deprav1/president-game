# Style Guide: Varonia

## Core Formula

Varonia is a Reigns-like satirical political card game about power, balance, and bad decisions in a fictional country.

Short positioning:

> Reigns-like political satire about a fictional country.

Expanded positioning:

> The player becomes president of fictional Varonia and tries to balance oligarchs, security forces, the people, and the collective West. Every decision moves influence scales, creates crises, opens branches, and can lead to one of several endings.

Do not position the game as real political analysis, historical accuracy, news coverage, or a simulator of a real state.

## Genre And Mood

The game should feel like:

> Reigns in a post-Soviet presidential bunker: expensive, cold, absurd, and faintly frightening.

Main style name:

> Imperial minimalism / decay.

Tone keywords:

- Political satire.
- Deadpan absurdity.
- Imperial decay.
- State grandeur with a crack in it.
- Dry bureaucratic horror.
- Dark minimalism with sinister notes.

## Visual Style

The visual standard is based on the advisor portraits and image-generation briefs.

Core visual prompt:

> Flat vector art, pure pitch black background filling the entire frame edge-to-edge, no border, no frame, deadpan minimalism, gold accents, imperial decay, sarcastic political satire, cinematic single light source, high contrast.

For newer advisor portraits:

> Semi-realistic painterly digital illustration, cinematic dramatic chiaroscuro lighting, pitch-black background filling the entire frame edge to edge, single character centered, head-and-torso framing facing the viewer, desaturated dark color palette with gold and jewel-tone accents, oppressive imperial decay, deadpan sinister political-satire mood, atmospheric thematic props dissolving into the dark background. No text, no captions.

Visual principles:

- Pure black or near-black backgrounds.
- Gold as the primary premium/state accent.
- Oxblood and dark red for crisis, danger, violence, and alarm.
- Large central object or figure with negative space.
- Minimal details, strong silhouette, high contrast.
- No random text, pseudo-letters, captions, or UI-like artifacts inside generated images.
- No bright, cheerful, toy-like, meme-like, or generic mobile-game look.

## Color System

Primary colors used in the game:

- Gold: `#d4af37`
- Gold hover/light: `#e8d48a`
- Felt red: `#6b0000`
- Dark felt red: `#450000`
- Crisis dark: `#120000`
- Crisis red: `#c0392b`
- Wood/black: `#060606`
- Light text: `#e8e0d4`
- Muted text: `#5a5045`
- Brass: `#9a7a1e`
- Ink: `#080808`
- Panel black: `rgba(8, 8, 8, 0.92)`

Faction colors can appear in icons and status states, but the overall interface should remain black, gold, and crisis red.

## Typography

The type system:

- `Playfair Display`: only for the Varonia logo and rare brand moments.
- `Inter`: main UI, readable text, card body, buttons, headings.
- `JetBrains Mono`: dossier labels, chips, technical captions, archival/status text.

Typography rules:

- Russian card text and dialogs must stay readable on mobile.
- Avoid decorative fonts for small labels.
- Use uppercase labels sparingly, mostly for dossier/status flavor.
- Minimum practical UI text size is 11px.
- Avoid italic text as a general style.

## UI Direction

The interface should feel like a secret state dossier or presidential control panel, not a cheerful casual game.

UI motifs:

- Secret dossier.
- Presidential decree.
- Archive card.
- Security briefing.
- State TV report.
- Bunker console.
- Gold seal, thin border, black panel.

Interaction feel:

- Cards enter calmly and decisively.
- Crisis states pulse or shake with restraint.
- Stat changes can flash.
- Victory can use a gold shine.
- Avoid noisy, comic, or excessive animations.

## Content Rules

Language:

- All card text and dialogs are in Russian.

World:

- Varonia is fictional.
- It is a satirical political analogue of modern Russia.
- Satire should use recognizable institutions, patterns, and dilemmas without needing to directly retell news.

Writing tone:

- Dry, sharp, bureaucratic, and absurd.
- Slightly satirical but still realistic and dramatic.
- Evil jokes and recognizable references are allowed.
- Direct profanity is not part of the tone.

Good card-text energy:

> Совет безопасности предлагает объявить стабильность стратегическим ресурсом. Добывать её будут из населения.

## Advisor Voice Rules

Each advisor should sound stable across the deck.

- Arkady Zubov: dry finance language, IMF terms, key rate, reserves, budget panic.
- General Valery Gromov: military command tone, shells, contracts, parades, budget and blood.
- Elena Vlasova: press-office concern, stability cliches, destructive narratives, smooth reversals.
- Nikolai Senin: paranoia, NATO/CIA conspiracies, foreign agents, sovereignty, hybrid war.
- Ambassador Sarah Hartley: diplomatic pressure, sanctions, investigations, firm but polite.
- Patriarch Varsonofy: archaic church tone, traditional values, spiritual enemies, blessing weapons.
- Yulia Streltsova: human-rights activism from exile, investigations, corruption, irony.
- Boris Usmanov: cynical business language, investment, friends, yachts, transactional pressure.

## Asset Rules

- New images should be stored as `.webp` in `public/images/`.
- Source generation can start as PNG, then run the optimization script.
- Recommended sizes:
  - Portraits: 1024x1024
  - Backgrounds: 1920x1080
  - Endings and objects: 1024x1024
  - Icons: 512x512
- Social preview should use a black/gold eagle-forward composition with the Varonia name clearly visible.
- Loading splash can use an eagle on black with a gold border and dossier-like loading text.

## Verification Checklist

After major visual or gameplay changes, check:

- Onboarding.
- Normal card.
- Swipe/tap decision.
- Crisis state.
- Defeat.
- VPN revive.
- Election.
- Victory.
- Restart.

## Source References

- `README.md`: core game description and content rules.
- `docs/content-generation-brief.md`: image-generation style prompt and asset targets.
- `docs/optimization-plan.md`: "imperial minimalism / decay" principles.
- `docs/advisor_voices.md`: advisor tone bible.
- `docs/telegram-launch-kit.md`: public positioning for Telegram.
- `src/App.css`: implemented design tokens, colors, typography, layout, and animation language.
- `generate-portraits.cjs`: original portrait prompt style.
- `scripts/gen-new-advisors.cjs`: newer advisor portrait prompt style.
