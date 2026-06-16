<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Aletheia Project Overview

Aletheia is a **wisdom/decision companion mobile app** (85-90% complete, 25/28 features implemented):
- **Decision tracking** with AI-powered Ask Aletheia chat
- **Wisdom library** with 30+ entries and scripture support
- **Counsel circle** for shared decision-making
- **Daily notifications** and decision reminders
- **Multi-language support** (11 languages via i18n)
- **Mobile platforms** (iOS/Android via Capacitor)
- **PostgreSQL backend** with 19 tables

## Instruction File Map

- Primary behavior: [.copilot-instructions.md](.copilot-instructions.md)
- Workspace bridge: [.instructions.md](.instructions.md)
- Agent mode notes: [.agent.md](.agent.md)
- Prompt template: [.prompt.md](.prompt.md)
- Domain knowledge skill: [SKILL.md](SKILL.md)
- i18n process guide: [i18n.instruction.md](i18n.instruction.md)

## Before Starting Any Feature

1. Check **[IMPLEMENTATION_INVENTORY.md](IMPLEMENTATION_INVENTORY.md)** for current status
2. Review **[AGENTS.md](AGENTS.md)** for Next.js guardrails
3. For translations: Follow **[i18n.instruction.md](i18n.instruction.md)** workflow
4. For domain context: Use **[SKILL.md](SKILL.md)** for patterns and key files
