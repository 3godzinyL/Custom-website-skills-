# MCP toolkit for strategy work

Strategy depends on evidence: what competitors actually have, what people search for,
how the site performs. MCP servers fetch that evidence directly and in compact form,
which is more accurate and cheaper in tokens than many manual page fetches. Suggest them
when the task calls for it; never install anything yourself.

## When to suggest

- Mode A (audit): after identifying the niche, before benchmarking — research and
  analytics MCPs.
- Mode B (blueprint): before the niche analysis — research MCPs; for the maker handoff,
  list build-time MCPs in SITE-BRIEF §14.
- One message, each with what / why / install / safe use. Skip what the session already
  has (built-in web search and fetch are often enough for 3–5 competitors).
- Official vendor servers; confirm commands in vendor docs; read-only access to
  analytics; paid APIs only with the user's consent (they cost money per request).
- If declined, use built-in web search/fetch and the references, and say the research
  depth is lower.

Install basics: Claude Code `claude mcp add <name> -- <command>` or
`claude mcp add --transport http <name> <url>`; Claude.ai: Settings → Connectors →
custom connector (remote only). Check with `/mcp`.

## Servers worth suggesting

| Situation | MCP | Why | Install (verify in docs) | Fallback |
|---|---|---|---|---|
| Benchmark many competitor sites | **Firecrawl MCP** | crawl/scrape sites into clean markdown, map site structure | `claude mcp add firecrawl -e FIRECRAWL_API_KEY=… -- npx -y firecrawl-mcp` | built-in fetch per page |
| Find leaders, trends, research | **Exa MCP** or **Brave Search MCP** | semantic web search / independent index | Exa remote `https://mcp.exa.ai/mcp`; Brave: `claude mcp add brave -e BRAVE_API_KEY=… -- npx -y @brave/brave-search-mcp-server` | built-in web search |
| See competitors and the audited site as users do | **Playwright MCP** | screenshots on mobile/desktop, click flows (checkout, booking) | `claude mcp add playwright -- npx -y @playwright/mcp@latest` | built-in browser tool or user screenshots |
| Speed and UX quality of the audited site | **Chrome DevTools MCP** | performance traces, console errors, network | `claude mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest` | `npx lighthouse <url>`, PageSpeed Insights |
| Keyword volumes, SERP data, competitor rankings | **DataForSEO MCP** (paid API), or **Ahrefs / Semrush** official MCP servers for subscribers | real search demand instead of guesses | DataForSEO: `npx -y dataforseo-mcp-server` with credentials; Ahrefs/Semrush: per vendor docs and plan | Google autocomplete, "People also ask", Search Console |
| Real traffic and conversion data (Mode A) | **Google Analytics MCP** (official, Python/pipx) | top pages, sources, conversions, drop-offs | per Google's `analytics-mcp` docs (needs pipx/Python) | the owner exports reports or shares screenshots |
| Search Console data | community MCP servers or exports | queries, CTR, indexing issues | only well-reviewed servers, read-only | the owner exports CSV from Search Console |
| Owner's Figma or brand files | **Figma MCP** | existing brand system for the blueprint | Figma desktop MCP or remote `https://mcp.figma.com/mcp` | exported images |

## Message template

```
Żeby analiza branży opierała się na faktach, a nie na domysłach, przydadzą się:

1. Firecrawl MCP: przejrzę strony 8 konkurentów w całości, a nie tylko ich strony główne
   (płatne API, koszt zależy od liczby stron).
   claude mcp add firecrawl -e FIRECRAWL_API_KEY=<klucz> -- npx -y firecrawl-mcp
2. Playwright MCP: zrobię zrzuty Twojej strony i konkurencji na telefonie i komputerze.
   claude mcp add playwright -- npx -y @playwright/mcp@latest

Bez nich też zrobię analizę, tylko na mniejszej próbce. Napisz „gotowe” albo „bez MCP”.
```
