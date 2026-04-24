# LoRA Forge — Go-to-Market Plan

## 1. Positioning

**One-line pitch:** LoRA Forge is the fastest way to fine-tune a personal Stable Diffusion FLUX LoRA from your own photos — drop in 10–30 images, hit launch, and ship a custom model in under an hour.

**Category:** Self-serve LoRA fine-tuning tool for Stable Diffusion FLUX.

**Why now:**
- FLUX-dev is the new default open-weights image model, and creators want their face / brand / product *in* it.
- Replicate ships new training endpoints faster than UIs can wrap them. Most creators are still pasting JSON into a CLI.
- "Personal LoRAs" are exploding on TikTok and X — creators want avatars, musicians want album-cover models, brands want product shots.

**Differentiators vs. the field:**
| Tool | Onboarding | Bring-your-own keys | Live job log | Visual job history |
|---|---|---|---|---|
| Replicate playground | Raw JSON | Yes | Streaming | No |
| Astria.ai | Forms | Hidden | Polled | Yes |
| Civitai trainer | Heavy form | Hidden | Limited | Yes |
| **LoRA Forge** | **Drag-drop + 4 fields** | **Yes (own Replicate token)** | **Streaming logs** | **Glass dashboard** |

## 2. Target Audiences (in priority order)

1. **Indie AI artists / "promptcrafters"** — already on Replicate, want a nicer UI, value the live console.
2. **Content creators with a personal brand** (musicians, streamers, lifestyle creators) — want a face LoRA for thumbnails, merch, social.
3. **Small e-commerce / DTC brands** — want a product LoRA for ad creative variants.
4. **Agencies & freelance designers** — train per-client LoRAs and bill the GPU pass-through.

## 3. Pricing & Business Model (proposed)

We are bring-your-own-Replicate-key today, which means **zero GPU cost on us**. Three sane paths:

- **Free, BYO key (today's state)** — open-source / freemium top-of-funnel. Cap at e.g. 5 jobs / month.
- **Pro: $19/mo** — unlimited jobs, no Replicate token required (we mark up GPU ~30%), private dashboards, dataset re-use.
- **Studio: $99/mo** — team seats, named LoRAs, API access, priority queue, white-label embed.

Defer billing decisions until after first 100 active users; learn what they hit limits on first.

## 4. Launch Plan (T-0 → T+30 days)

### Pre-launch (T-7)
- Finalize landing page hero (already in place — glass aesthetic, ambient orbs).
- Record 60-second screen capture: drop 12 photos → launch → cut to finished generated images.
- Stage 6 sample LoRAs trained on creative-commons faces to seed the gallery.
- Set up `@loraforge` on X and TikTok.
- Write 3 launch posts: Show HN, Product Hunt, r/StableDiffusion.

### Launch day (T-0)
- 09:00 PT: Product Hunt + Show HN simultaneous.
- 10:00 PT: X thread with the 60-sec demo + before/after grid.
- 12:00 PT: r/StableDiffusion + r/aiArt cross-post (no link spam, lead with the demo video).
- 15:00 PT: Reply-bomb top comments on PH for the next 4 hours.

### Week 1
- Daily: pick the best 3 user-trained LoRAs and post the outputs (with permission) on X.
- Day 3: write a teardown blog: "How we built a streaming-log LoRA trainer in a weekend" (devs love stack porn).
- Day 5: ship the most-requested feature from launch feedback (likely: "let me try the LoRA right after training").

### Week 2–4
- Outbound to 25 mid-tier creators (50K–500K followers) offering free training in exchange for one post.
- Sponsor the StableDiffusion subreddit's weekly thread.
- Begin "LoRA of the Week" rotation on the homepage.

## 5. Content & SEO Engine

Keywords with real intent and weak SERPs to own:
- *"flux lora trainer ui"*
- *"how to train a flux lora from photos"*
- *"replicate flux dev lora tutorial"*
- *"best flux lora training settings"*

Cadence: 2 posts/week, each one ending with a CTA to launch a job in LoRA Forge.

Templates that compound:
- "Best FLUX LoRA settings for [faces / products / anime / pets]"
- "Comparing FLUX LoRA at rank 4 vs 8 vs 16 vs 32"
- "How many photos do you actually need to train a LoRA?" (with our gallery as evidence)

## 6. Success Metrics (first 90 days)

| Metric | 30 days | 60 days | 90 days |
|---|---|---|---|
| Sign-ups | 500 | 2,000 | 6,000 |
| Jobs launched | 200 | 1,200 | 4,500 |
| Successful trainings | 150 | 1,000 | 4,000 |
| WAU | 80 | 350 | 1,200 |
| Paid conversions (when live) | — | 20 | 120 |
| GitHub stars (if open-sourced) | 200 | 600 | 1,500 |

**North-star metric:** *Successful trainings per week.* Everything else is downstream.

## 7. Risk Watchlist

- **Replicate price changes** — we're a thin wrapper; monitor monthly.
- **FLUX licensing churn** — Black Forest Labs has tweaked terms before. Make the trainer model id swappable.
- **Abuse (CSAM / non-consensual likeness)** — must have a clear AUP before going broad. Add automated NSFW gate on the input set before launch wave 2.
- **GPU outages on Replicate** — surface their status page in our UI; don't eat the blame for their downtime.

## 8. Immediate Next Steps (this week)

1. Ship a public landing page above the app explaining what it is.
2. Add an Acceptable Use Policy modal on first job launch.
3. Wire up basic product analytics (page views, jobs launched, jobs succeeded).
4. Draft the launch demo video script.
5. Pick a launch date and lock the Product Hunt slot.
