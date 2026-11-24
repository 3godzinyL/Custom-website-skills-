# MCP toolkit for design work

Design is judged by eye. MCP servers let the AI see what it built at several widths,
read existing designs exactly, and use current framework docs, which saves tokens and
guesswork. Suggest once, when the need appears; never install anything yourself; skip
what the session already has.

Install basics: Claude Code `claude mcp add <name> -- <command>` or
`claude mcp add --transport http <name> <url>`; Claude.ai: Settings → Connectors →
custom connector (remote only). Verify commands in vendor docs.

| Situation | MCP | Why | Install (verify) | Fallback |
|---|---|---|---|---|
| Screenshots of demos and pages at 390/1440 px, before/after | **Playwright MCP** | real browser, set viewport, screenshot, click menus | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | built-in browser tool; user screenshots |
| Layout shift, font loading, performance of the redesign | **Chrome DevTools MCP** | performance traces (LCP, CLS), network, console | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest` | `npx lighthouse <url>` |
| Designs or brand system exist in Figma | **Figma MCP** (official) | read frames, variables, components → exact tokens | Figma desktop → enable MCP (`http://127.0.0.1:3845/mcp`) or remote `https://mcp.figma.com/mcp` | exported PNG/SVG + specs |
| React with shadcn/ui | **shadcn MCP** | add and theme registry components correctly | `npx shadcn@latest mcp init --client claude` | shadcn CLI |
| Framework/CSS specifics (Tailwind v4, Astro, Next.js) | **Context7** | current docs, correct syntax | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | official docs via fetch |
| Looking at reference sites for inspiration | **Firecrawl/Exa MCP** or Playwright | capture structure/screenshots of references | see vendor docs | built-in fetch/search |

Message template:
```
Do przygotowania i sprawdzenia demo przyda się Playwright MCP. Sam zrobię zrzuty
każdego demo na telefonie i komputerze i poprawię błędy, zanim je zobaczysz:
claude mcp add playwright -- npx -y @playwright/mcp@latest
Bez niego też zrobię dema, ale sprawdzę je dokładniej tylko w kodzie. Napisz „gotowe” albo „bez MCP”.
```
