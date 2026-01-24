# Domain Pitfalls: Figma Plugin + AI Vision

**Domain:** Screenshot-to-Figma conversion with Claude vision API
**Researched:** 2026-01-24
**Confidence:** MEDIUM (based on training data — external verification unavailable)

---

## Critical Pitfalls

Mistakes that cause rewrites, user abandonment, or fundamental breakage.

---

### Pitfall 1: Figma Plugin Sandbox Blocking Network Requests

**What goes wrong:** Figma plugins run in a sandboxed iframe. The main plugin code (the "sandbox" thread) has NO access to browser APIs like `fetch()`. Developers write their API calls, and they silently fail or throw cryptic errors. The plugin appears to work in development but fails when published.

**Why it happens:** Figma splits plugin execution into two contexts:
1. **Sandbox (main)** — Access to Figma API, but no network, no DOM
2. **UI (iframe)** — Access to network, DOM, but no Figma API

Developers unfamiliar with this architecture put API calls in the wrong context.

**Consequences:**
- Plugin silently fails to call Claude API
- Users enter API key but nothing happens
- Debugging is confusing (no clear error)

**Prevention:**
- **Architecture rule:** ALL network calls (Claude API) must happen in the UI iframe
- **Communication pattern:** Use `figma.ui.postMessage()` and `figma.ui.onmessage` to shuttle data between contexts
- **Phase assignment:** Establish this architecture in Phase 1, before any Claude integration

**Warning signs:**
- `fetch is not defined` errors
- API calls working in browser console but not in plugin
- Plugin works differently in dev mode vs. published

**Detection:** Test early with a simple API call to verify the architecture works end-to-end.

**Phase mapping:** Phase 1 (Plugin Foundation) — must be correct from the start

---

### Pitfall 2: Claude Vision "Pixel Accurate" Overconfidence

**What goes wrong:** Developers expect Claude vision to return exact pixel values (e.g., "padding: 16px", "color: #3B82F6"). Claude returns approximate values, semantic descriptions, or inconsistent formats. The plugin produces designs that are "close" but noticeably off — wrong spacing, slightly different colors.

**Why it happens:**
- Vision models describe what they see, not measure it precisely
- Pixel values depend on image resolution, scaling, compression artifacts
- Claude may describe "blue button" rather than "#3B82F6"
- Different prompts yield different output formats

**Consequences:**
- Output doesn't match "pixel-accurate" promise
- User trust erodes quickly — "this just makes rough approximations"
- Colors especially are wrong (vision models are not colorimeters)

**Prevention:**
1. **Constrain the problem:** Map Claude's output to Shadcn's fixed design tokens rather than arbitrary pixel values. Claude identifies "medium spacing" -> plugin uses Shadcn's `p-4`. Less precision needed.
2. **Post-process colors:** Use a color extraction library on the original image to get exact hex values, then use Claude for element identification only.
3. **Structured output:** Use Claude's JSON mode with a strict schema that forces specific token values, not arbitrary numbers.
4. **Set correct expectations:** "Shadcn-accurate" (matches design system) rather than "pixel-perfect" (matches screenshot exactly).

**Warning signs:**
- Spacing varies between generations of the same screenshot
- Colors are "close but not quite"
- Prompt engineering consuming excessive time trying to get exact values

**Detection:** Generate the same screenshot 5 times — if results vary significantly, precision is unreliable.

**Phase mapping:** Phase 2 (Claude Integration) — define the output schema and constraints before building generation

---

### Pitfall 3: API Key Security Exposure

**What goes wrong:** The BYOK (Bring Your Own Key) model requires users to enter their Anthropic API key. Developers store the key insecurely (localStorage, plaintext in plugin storage) or expose it in network requests that could be intercepted. Key leaks, user gets charged, trust destroyed.

**Why it happens:**
- Figma plugin storage (`figma.clientStorage`) is convenient but not encrypted
- Developers assume "it's just a plugin" and don't think about key security
- UI iframe uses HTTPS but key still visible in network inspector

**Consequences:**
- User API key exposed or stolen
- Anthropic charges on user's account from malicious use
- Plugin gets bad reputation, removed from community

**Prevention:**
1. **Use `figma.clientStorage.setAsync()`** — It's the right storage mechanism, isolated per-plugin
2. **Never log the key** — Remove any console.log statements in production
3. **HTTPS only** — Anthropic API is HTTPS, but verify plugin makes no HTTP calls
4. **Warn users** — Explain in UI that keys are stored locally, suggest revoking if they uninstall
5. **Clear on uninstall** — Provide a "clear stored key" option

**Warning signs:**
- API key visible in browser dev tools without effort
- Key passed as URL parameter instead of header
- Key persists after user expects it cleared

**Detection:** Open browser dev tools while using the plugin, search for API key string — it should not appear in any logs, URL, or accessible storage without effort.

**Phase mapping:** Phase 1 (Plugin Foundation) — implement secure storage from day one

---

### Pitfall 4: Component Mapping Ambiguity

**What goes wrong:** Claude identifies "a button" but the plugin doesn't know which Shadcn Button variant to use. Claude says "card with header" but is it a Card with CardHeader, or a custom layout? Mapping between AI output and specific components is ambiguous, leading to wrong components or excessive code complexity.

**Why it happens:**
- Shadcn has multiple components that could render similar UI
- Visual similarity doesn't equal component equivalence
- Claude describes appearance, not implementation

**Consequences:**
- Wrong components chosen (Button when it should be Link)
- Excessive conditional logic trying to disambiguate
- Output looks right but semantically incorrect
- Maintenance nightmare as edge cases accumulate

**Prevention:**
1. **Define explicit mapping rules:** Create a decision tree — "if clickable AND looks like button AND has icon -> IconButton, else Button"
2. **Limit component set:** Don't try to map to ALL Shadcn components. Start with 10-15 core components, expand only when needed.
3. **Two-pass approach:** First pass identifies element types (button, input, card), second pass selects specific variants based on attributes.
4. **Confidence scoring:** Claude returns confidence for each element. Low confidence = default/safe component choice.

**Warning signs:**
- Frequent wrong component selections in testing
- Mapping logic becomes giant switch statement
- Same screenshot generates different components on re-run

**Detection:** Test with 20 diverse screenshots, track component accuracy rate. Below 80% = mapping logic needs work.

**Phase mapping:** Phase 3 (Figma Generation) — build mapping after Claude integration proves stable

---

### Pitfall 5: Figma Node Creation Performance

**What goes wrong:** The plugin creates Figma nodes one at a time using the Plugin API. For complex screenshots (50+ elements), this takes 10+ seconds. Users think the plugin froze. No progress feedback, UI unresponsive.

**Why it happens:**
- Each `figma.createFrame()`, `figma.createText()` etc. is synchronous and relatively slow
- Complex layouts require many nested nodes
- No batching mechanism in Figma Plugin API
- Plugin UI freezes because sandbox has no async node creation

**Consequences:**
- Users cancel mid-generation
- Plugin appears broken for complex screenshots
- Poor UX undermines good AI accuracy

**Prevention:**
1. **Progress indicators:** Show "Creating element 5 of 47" style feedback
2. **Batch structure:** Build the full node tree structure in memory first, then create in Figma — fewer intermediate layouts
3. **Yield to UI:** Use `await new Promise(resolve => setTimeout(resolve, 0))` between batches to keep UI responsive
4. **Simplify output:** Offer a "simplified" mode that creates fewer, larger components for speed
5. **Set expectations:** Tell users "Complex screenshots may take 15-30 seconds"

**Warning signs:**
- Plugin hangs on complex screenshots
- Users report "frozen" experiences
- No progress indicator during generation

**Detection:** Time node creation for screenshots with 10, 25, 50, 100 elements. Chart the curve. If non-linear (getting slower per element), there's a structural issue.

**Phase mapping:** Phase 3 (Figma Generation) — must be addressed during node creation implementation

---

## Moderate Pitfalls

Mistakes that cause delays, technical debt, or degraded quality.

---

### Pitfall 6: Prompt Engineering Rabbit Hole

**What goes wrong:** Developers spend weeks tweaking Claude prompts trying to get "perfect" output. Each fix for one case breaks another. Prompts become 2000+ tokens of instructions, cost per analysis increases, and results are still inconsistent.

**Why it happens:**
- Vision model output is inherently variable
- Natural instinct to "just fix the prompt"
- No clear success criteria defined upfront
- Testing on same 5 screenshots over and over

**Consequences:**
- Weeks lost on diminishing returns
- Prompts become unmaintainable
- High token costs per analysis
- Still doesn't work for edge cases

**Prevention:**
1. **Time-box prompt work:** Max 2 days of prompt engineering, then architectural solutions
2. **Define success metrics:** "85% component accuracy on test suite of 50 screenshots"
3. **Structured output > prose output:** JSON schema constraints more reliable than instructions
4. **Post-processing layer:** Handle variability in code, not in prompts
5. **Version prompts:** Track prompt versions with test results

**Warning signs:**
- Prompt is over 1000 tokens
- "Just one more tweak" becomes pattern
- Different team members have different "better" prompts
- Same screenshot gives different results

**Detection:** If prompt file has more than 10 revisions without measurable improvement, stop.

**Phase mapping:** Phase 2 (Claude Integration) — set time limits and metrics before starting

---

### Pitfall 7: Image Resolution and Format Surprises

**What goes wrong:** Users upload images in various formats (PNG, JPEG, WEBP, screenshots from retina displays at 2x or 3x). Claude's analysis varies based on image quality, resolution, and compression. High-res screenshots get downscaled, losing detail. Retina screenshots have dimensions that don't match CSS pixels.

**Why it happens:**
- Screenshots from different devices have different DPIs
- Claude has image size limits (tokens scale with resolution)
- JPEG compression creates artifacts Claude might misinterpret
- Users don't know what format works best

**Consequences:**
- Inconsistent results based on source image
- Retina screenshots produce Figma designs at 2x intended size
- Compressed images have fuzzy edges Claude misreads
- Cost unpredictable (larger images = more tokens)

**Prevention:**
1. **Normalize input:** Resize images to standard max dimension (e.g., 1500px) before sending to Claude
2. **Detect retina:** Check if image dimensions are unusually large relative to aspect ratio, offer to scale
3. **Prefer PNG:** Recommend/convert to PNG to avoid compression artifacts
4. **Show preview:** Before analysis, show user what Claude will see (the processed image)
5. **Document limits:** "Best results with screenshots under 1500x1000, PNG format"

**Warning signs:**
- "This worked on my Mac but not my colleague's" (different DPIs)
- Sizes in Figma are 2x what they should be
- Cost per analysis varies wildly

**Detection:** Test same UI at 1x, 2x, and 3x DPI. Compare results.

**Phase mapping:** Phase 1 (Plugin Foundation) — image handling pipeline before Claude integration

---

### Pitfall 8: Shadcn Component Version/Theme Drift

**What goes wrong:** Shadcn components are copied into projects, not installed as npm packages. The "bundled" components in the plugin were copied at a point in time. Over months, Shadcn evolves, user expectations change, but plugin components are static. Components look outdated or don't match what users expect.

**Why it happens:**
- Shadcn's model is copy-paste, not package updates
- Plugin needs self-contained components (can't npm install at runtime)
- Design trends evolve faster than plugin updates
- No automatic upgrade path

**Consequences:**
- Components look dated after 6-12 months
- User says "this doesn't look like Shadcn" (because Shadcn changed)
- Styling expectations drift from plugin's bundled version
- Maintenance burden to update frozen components

**Prevention:**
1. **Version lock explicitly:** Document "this plugin uses Shadcn components as of v0.x.x / January 2026"
2. **Focus on primitives:** Bundle foundational components (Button, Card, Input) that change rarely, not bleeding-edge ones
3. **Update schedule:** Plan quarterly reviews of Shadcn changes, update bundled components as needed
4. **Theming layer:** Keep styling tokens (colors, radii) in a theme file that can be updated separately from component structure
5. **Communicate:** "Generates designs using Shadcn-style components" not "uses Shadcn components" (slight hedge)

**Warning signs:**
- User complaints that output "doesn't look like my Shadcn"
- Visual comparison shows drift from current Shadcn examples
- Hard-coded styles scattered across components

**Detection:** Every 3 months, compare bundled components to current Shadcn. Note differences.

**Phase mapping:** Phase 4 (Component Bundling) — establish update strategy from the start

---

### Pitfall 9: Layout/Nesting Depth Explosion

**What goes wrong:** Claude identifies nested layouts (card > header > row > icon + text), and the plugin creates deeply nested Figma frames. Figma handles nesting fine, but users trying to edit the result find an unusable mess of frames-within-frames. Moving one element requires understanding the whole hierarchy.

**Why it happens:**
- AI describes semantic structure (which is deeply nested)
- Naive mapping: one AI element = one Figma frame
- No flattening or simplification logic
- Developers don't test editability, only visual output

**Consequences:**
- Output looks right but is unusable to edit
- Users frustrated: "I can't select anything"
- Defeats purpose of "editable Figma design"

**Prevention:**
1. **Flatten where possible:** If a frame only contains one child, merge them
2. **Auto-layout intelligence:** Use Figma auto-layout to eliminate redundant containers
3. **Max depth rule:** If nesting exceeds 5 levels, restructure
4. **Test editability:** Include "can user easily move this button?" in acceptance criteria
5. **Named layers:** Every frame has a semantic name, not "Frame 47"

**Warning signs:**
- Layers panel shows 10+ levels deep for simple UI
- Selecting elements requires many clicks
- "I can see it but I can't select it" feedback

**Detection:** Generate a medium-complexity screenshot, attempt to edit 5 elements, time how long it takes.

**Phase mapping:** Phase 3 (Figma Generation) — build flattening into node creation logic

---

### Pitfall 10: Claude API Error Handling Gap

**What goes wrong:** Claude API returns errors (rate limits, invalid API key, content policy, timeout), but plugin shows generic "something went wrong." Users don't know if their key is wrong, they hit rate limits, or the image was rejected. No actionable feedback.

**Why it happens:**
- Happy path works in dev, error paths untested
- Anthropic error responses have specific structure that needs parsing
- Developers assume API "just works"
- Different errors need different user guidance

**Consequences:**
- Users can't self-diagnose problems
- Support burden increases
- Users blame plugin for Anthropic issues
- Rate-limited users keep retrying, making it worse

**Prevention:**
1. **Map all error codes:**
   - 401: "Invalid API key — check your key in settings"
   - 429: "Rate limited — wait a minute and try again"
   - 400 (content_policy): "Image couldn't be processed — try a different screenshot"
   - 500: "Claude service issue — try again shortly"
2. **Timeout handling:** Set reasonable timeout (30s), show "Taking longer than expected, still working..."
3. **Retry logic:** Auto-retry once on 5xx errors, not on 4xx
4. **Logging:** Optional verbose mode for debugging

**Warning signs:**
- Users report "it just says error"
- Same error appears for different problems
- Support tickets about API issues

**Detection:** Intentionally trigger each error type, verify user sees helpful message.

**Phase mapping:** Phase 2 (Claude Integration) — error handling before feature completion

---

## Minor Pitfalls

Mistakes that cause annoyance but are recoverable.

---

### Pitfall 11: Figma Font Substitution

**What goes wrong:** Claude identifies a font (e.g., "Inter", "SF Pro"). Plugin tries to use it, but Figma can't access the font (user doesn't have it installed, or font name format is wrong). Figma substitutes a default font, breaking the visual fidelity.

**Why it happens:**
- Font availability is system/user specific
- Font names have variations ("Inter", "Inter Regular", "Inter-Regular")
- Figma plugin can't install fonts

**Prevention:**
1. **Use safe fonts:** Default to fonts available in all Figma instances (Roboto, Inter if common)
2. **Font fallback chain:** Try identified font, then similar web font, then safe fallback
3. **Warn user:** "Font X not available, using Y instead"
4. **Don't over-identify:** If uncertain, use generic "sans-serif" -> plugin's default

**Phase mapping:** Phase 3 (Figma Generation) — minor, handle during text node creation

---

### Pitfall 12: Plugin UI Responsive Breakage

**What goes wrong:** Plugin UI is designed for one size, but users resize the plugin panel. Buttons get cut off, text overflows, layout breaks. Not critical, but looks unprofessional.

**Why it happens:**
- Figma plugin panel is resizable
- Developers test at one size only
- No responsive design considerations

**Prevention:**
1. **Set minimum size:** `figma.ui.resize(400, 500)` with reasonable minimums
2. **Test at multiple sizes:** Small, medium, large panel
3. **Scroll when needed:** Content should scroll, not overflow
4. **Simple layout:** Avoid complex multi-column layouts that break on resize

**Phase mapping:** Phase 1 (Plugin Foundation) — minor polish, not blocking

---

### Pitfall 13: Color Space Confusion

**What goes wrong:** Claude returns colors in one format (hex), plugin interprets in another context, Figma uses RGBA internally. Colors are "close" but not exact due to color space conversions, or alpha channel gets lost.

**Why it happens:**
- Different tools use different color representations
- sRGB vs display P3 differences
- Alpha channel handling varies
- Hex parsing edge cases ("#FFF" vs "#FFFFFF")

**Prevention:**
1. **Normalize to RGBA:** Convert all colors to RGBA immediately on receipt
2. **Figma expects 0-1:** Figma's color API uses 0-1 scale, not 0-255
3. **Preserve alpha:** Track opacity separately if Claude identifies it
4. **Test with exact colors:** Include known colors in test suite, verify exact match

**Phase mapping:** Phase 3 (Figma Generation) — minor, part of styling implementation

---

## Phase-Specific Warnings Summary

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: Foundation | Sandbox architecture wrong | Establish UI/sandbox split immediately, test network from UI |
| Phase 1: Foundation | API key insecurity | Use figma.clientStorage, never log key |
| Phase 2: Claude Integration | "Pixel accurate" overconfidence | Map to design tokens, not pixel values |
| Phase 2: Claude Integration | Prompt engineering rabbit hole | Time-box, define metrics, use structured output |
| Phase 2: Claude Integration | Error handling gaps | Map all error codes to user-friendly messages |
| Phase 3: Figma Generation | Component mapping ambiguity | Build explicit decision tree, limit component set |
| Phase 3: Figma Generation | Node creation performance | Batch creation, progress indicators, yield to UI |
| Phase 3: Figma Generation | Layout nesting explosion | Flatten logic, max depth rules, test editability |
| Phase 4: Component Bundling | Shadcn version drift | Version lock, update schedule, focus on primitives |

---

## Verification Notes

**Confidence level for this document: MEDIUM**

These pitfalls are based on:
- Training data knowledge of Figma Plugin API architecture (HIGH confidence — well documented)
- Training data knowledge of Claude vision capabilities and limitations (MEDIUM confidence — may have evolved)
- Training data knowledge of Shadcn component patterns (MEDIUM confidence — shadcn evolves rapidly)
- General software engineering patterns for BYOK, API integration, and performance (HIGH confidence — stable patterns)

**Recommended verification:**
- [ ] Verify current Figma Plugin API sandbox model against official docs
- [ ] Verify Claude vision API limitations against current Anthropic documentation
- [ ] Test image resolution handling with actual Claude API calls
- [ ] Review current Shadcn component versions and structure

---

## Sources

- Figma Plugin API documentation (training data, verify at figma.com/plugin-docs)
- Anthropic Claude documentation (training data, verify at docs.anthropic.com)
- Shadcn/ui documentation (training data, verify at ui.shadcn.com)

*External verification was unavailable during research. All findings should be validated against current official documentation before implementation.*
