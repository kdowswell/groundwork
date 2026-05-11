---
id: field-first
title: Field-First Design for Hostile Operating Conditions
category: design
sources:
  - name: Nielsen Norman Group — Touch Target Sizes
    url: https://www.nngroup.com/articles/touch-target-size/
  - name: Industrial UX patterns (Human Factors and Ergonomics Society)
    url: https://www.hfes.org/
  - name: Apple Human Interface Guidelines — Accessibility
    url: https://developer.apple.com/design/human-interface-guidelines/accessibility
  - name: Material Design — Accessibility
    url: https://m3.material.io/foundations/accessible-design/overview
applies_when:
  scope: [new_build, epic, feature]
  scale: [solo, team, enterprise]
  stage: [ideation, discovery, refinement, build]
  domains: [field_operations, healthcare, manufacturing, logistics, public_safety, utilities, agriculture, construction, any_production]
tags: [design, accessibility, mobile, field-ux, hostile-conditions]
---

# Field-First Design for Hostile Operating Conditions

## Principle
A product whose primary operating context is the field — not the desk — must be designed for that context from the first interaction onward. Hostile conditions (gloves, sun, rain, noise, divided attention, intermittent connectivity) are not edge cases; they are the default. UI affordances, workflow length, modality choice, and information density all change when the user is wearing PPE on a job site rather than sitting at a 27-inch monitor.

## When This Matters
- Workers, technicians, drivers, healthcare staff, or first responders use the product on a phone or tablet in the course of physical work
- The primary task is *capture* (incident reports, inspections, observations) rather than analysis
- Connectivity is unreliable (low signal, basements, remote sites, in-vehicle)
- Personal protective equipment (gloves, hard hats with face shields, hearing protection) is part of the user's normal state
- Workflows compete with safety attention — the user cannot stop watching their physical environment to look at a screen

## When This Doesn't Matter
- Office-based knowledge workers using the product at a desk
- Consumer apps used in casual contexts (transit, home, café)
- Read-only dashboards consumed by analysts
- Batch / asynchronous tools where the user has time and attention to spare

## Questions the Agent Should Ask
- Where will the user physically be when they use this? Indoors, outdoors, vehicle, ladder, trench?
- What are they wearing on their hands? Gloves? Bare hands in the cold?
- What's the lighting situation? Direct sunlight? Low-light night shifts? Mixed?
- How divided is their attention? Are they responsible for their own physical safety while using the product?
- What's the worst-case connectivity? No signal for hours? Intermittent? Always-on but slow?
- How many seconds can they realistically spend on a single screen before context-switching back to the physical task?
- Will they be wearing hearing protection that affects audio feedback? Talking to someone simultaneously?
- Is the device personal or shared? Can they leave it open mid-task?

## What Good Looks Like
- **Voice-primary capture** when the alternative is typing on a small screen with gloved hands. Typing is *optional*, never required for the critical path.
- **Touch targets sized for gloved use** — at minimum 64×64dp; preferably 88×88dp for primary actions in capture flows. (Standard iOS/Android guidance assumes ungloved fingers and is too small for field UX.)
- **High-contrast, large-text defaults** for outdoor sunlight legibility. No light-gray-on-white anywhere in the capture flow.
- **Maximum 3 taps from app launch to capture beginning.** Often the user has only seconds before they need to look back at their physical environment.
- **Aggressive offline-first.** Every capture path must work fully offline; sync happens when connectivity returns. Lost data because the user was in a basement is unacceptable.
- **Persistent local state.** App force-quit, device reboot, battery swap — captured-but-not-yet-submitted work survives all of these.
- **Visible queue / pending work.** The user always knows how many submissions are waiting to sync, so a lost or replaced device doesn't silently drop pending captures.
- **Tactile / audio confirmation** of critical actions. Visual-only confirmation is invisible in bright sun and overlooked when attention is elsewhere.
- **Minimal modal interruptions.** Pop-ups requiring a response interrupt physical task flow and are a common cause of dropped captures.

## What Goes Wrong When You Skip This
- The product looks great in demos and is unusable in the field. Adoption craters during pilot.
- Workers find workarounds — paper forms in pockets, voice memos in their personal phones — that defeat the audit / data-capture purpose entirely.
- Touch targets sized for ungloved fingers cause mis-taps that drop or duplicate submissions.
- Office-style UI (small fonts, low contrast, multi-step forms) is illegible in direct sun and forces workers to find shade, which they often can't.
- Connectivity assumptions ("we'll just retry on the API call") cause silent data loss the field workers don't notice until weeks later, when a regulator asks for a report that never made it back to the office.
- Adding "field mode" later, after the desktop UX is built, is dramatically harder than building field-first from day one. The desktop assumptions get baked into the data model, the auth flow, the offline behavior, and the workflow length.

## Further Reading
- Nielsen Norman Group's research on touch target sizing for accessibility — the gloved-finger threshold is well-established but routinely violated.
- Apple Human Interface Guidelines on accessibility cover dynamic type, contrast, and motor accommodations that translate directly to field-UX needs.
- Industrial UX patterns from human factors research treat hostile-conditions design as a discipline, not a special case. Worth reading before you build for any field-deployed user.
- The product's own field shadow-shifts are the highest-signal feedback. No amount of usability lab work substitutes for watching a real lineman use the app in real weather while wearing real gloves.
