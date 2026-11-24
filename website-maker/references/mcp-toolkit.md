# MCP toolkit for building sites

MCP servers give the AI direct tools: a real browser to look at what it built, current
framework docs, the payment provider in test mode, the database, the deploy platform.
They make builds more accurate and save tokens (no guessing APIs, no pasting large
pages). Suggest them when the situation calls for one — never install anything yourself.

## When to suggest

- After the user picks an option (Part B), suggest the MCPs that option needs, in one
  message: what, why (one line), install command, safe configuration.
- Later, only if a new need appears (e.g. payments added).
- Skip anything already available in the session (an existing browser tool, docs tool).
- Official vendor servers only; tell the user to confirm commands in vendor docs.
- Test/sandbox keys and read-only or dev projects; never live payment secrets.
- If declined, continue with the fallback.

Install basics: Claude Code `claude mcp add <name> -- <command>` (local) or
`claude mcp add --transport http <name> <url>` (remote); Claude.ai: Settings →
Connectors → custom connector (remote URLs only). Check with `/mcp`.

## Servers worth suggesting

| Situation | MCP | Why | Install (verify in docs) | Fallback |
|---|---|---|---|---|
| Any build (visual QA) | **Playwright MCP** | open the site, screenshot at 360/768/1280/1920, click flows, read console | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | built-in browser tool, or the user sends screenshots |
| Performance and console checks | **Chrome DevTools MCP** | performance traces (LCP/CLS/INP), network, console errors | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest` | `npx lighthouse <url>` CLI |
| Framework/library code (Astro, Next.js, Express, Prisma, Tailwind…) | **Context7** | current docs for the exact version, fewer outdated APIs | `claude mcp add context7 -- npx -y @upstash/context7-mcp` | web fetch of official docs |
| User has Figma designs | **Figma MCP** (official) | read frames, variables, components → exact tokens and layout | Figma desktop app → enable MCP server (local `http://127.0.0.1:3845/mcp`) or remote `https://mcp.figma.com/mcp` | exported images + specs from the user |
| React + shadcn/ui stack | **shadcn MCP** | browse and add registry components correctly | `npx shadcn@latest mcp init --client claude` | shadcn CLI |
| Stripe payments (option 3–4) | **Stripe MCP** (official) | create products/prices/coupons in test mode, check webhooks and events | remote `https://mcp.stripe.com` or `npx -y @stripe/mcp --tools=all --api-key=<restricted TEST key>` | Stripe CLI (`stripe listen`, `stripe trigger`) |
| Supabase backend | **Supabase MCP** | schema, migrations, RLS policies, advisors on a dev project | `claude mcp add supabase -- npx -y @supabase/mcp-server-supabase@latest --project-ref=<dev-ref>` (+ token) | SQL migrations by hand |
| Firebase backend | **Firebase MCP** | project setup, rules, data on a dev project | `claude mcp add firebase -- npx -y firebase-tools@latest mcp` | Firebase CLI |
| SQL database (Postgres/MySQL/SQLite) | **DBHub** | inspect schema, run safe queries during development | `npx -y @bytebase/dbhub --transport stdio --dsn "<dev dsn>"` | migrations + seed scripts |
| Shopify store | **Shopify Dev MCP** | Shopify docs and GraphQL schema for themes/apps | `claude mcp add shopify-dev -- npx -y @shopify/dev-mcp@latest` | Shopify docs |
| Deploy to Vercel / Netlify / Cloudflare | **Vercel MCP** (`https://mcp.vercel.com`), **Netlify MCP** (`npx -y @netlify/mcp`), **Cloudflare** remote MCP servers | deployments, env vars, logs, domains | per vendor docs | platform CLI |
| Code on GitHub | **GitHub MCP** | issues, PRs, Actions for CI/CD | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/` | git + gh CLI |
| Production monitoring (option 4) | **Sentry MCP** | errors after launch | `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` | logs |
| Market research in Part A (many competitor sites) | **Firecrawl MCP** or **Exa MCP** | crawl/search many sites cheaply and in clean markdown | `claude mcp add firecrawl -e FIRECRAWL_API_KEY=… -- npx -y firecrawl-mcp`; Exa remote `https://mcp.exa.ai/mcp` | built-in web search/fetch |

## Message template

```
Do wybranej opcji przydadzą się te narzędzia (MCP). Instalacja jest po Twojej stronie,
a bez nich też zbuduję stronę, tylko wolniej:

1. Playwright MCP: sam obejrzę stronę na telefonie i komputerze i poprawię to, co źle wygląda.
   claude mcp add playwright -- npx -y @playwright/mcp@latest
2. Stripe MCP w trybie testowym: skonfiguruję produkty, kody i webhooki bez ręcznego klikania.
   claude mcp add --transport http stripe https://mcp.stripe.com

Napisz „gotowe” albo „bez MCP”.
```
