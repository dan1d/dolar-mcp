# dolar-mcp

**Argentine exchange rates for AI agents.**

[![npm version](https://img.shields.io/npm/v/@dan1d/dolar-mcp)](https://www.npmjs.com/package/@dan1d/dolar-mcp)
[![tests](https://img.shields.io/github/actions/workflow/status/dan1d/dolar-mcp/ci.yml?label=tests)](https://github.com/dan1d/dolar-mcp/actions)
[![npm downloads](https://img.shields.io/npm/dm/@dan1d/dolar-mcp)](https://www.npmjs.com/package/@dan1d/dolar-mcp)
[![license](https://img.shields.io/npm/l/@dan1d/dolar-mcp)](./LICENSE)

MCP server that gives AI agents real-time access to Argentine exchange rates via [DolarAPI](https://dolarapi.com). Dollar blue, oficial, MEP, CCL, crypto — plus currency conversion and spread calculator.

No API key required.

[npm](https://www.npmjs.com/package/@dan1d/dolar-mcp) | [GitHub](https://github.com/dan1d/dolar-mcp)

<a href="https://glama.ai/mcp/servers/dan1d/dolar-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/dan1d/dolar-mcp/badge" alt="dolar-mcp MCP server" />
</a>

---

## Quick Start

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dolar": {
      "command": "npx",
      "args": ["-y", "@dan1d/dolar-mcp"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add dolar -- npx -y @dan1d/dolar-mcp
```

### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "dolar": {
      "command": "npx",
      "args": ["-y", "@dan1d/dolar-mcp"]
    }
  }
}
```

### Windsurf

```json
{
  "mcpServers": {
    "dolar": {
      "command": "npx",
      "args": ["-y", "@dan1d/dolar-mcp"]
    }
  }
}
```

> Once configured, ask your AI assistant things like: *"How much is the dollar blue today?"* or *"Convert 100 USD blue to ARS"* or *"What's the spread between blue and oficial?"*

---

## Available Tools

| Tool | Description |
|------|-------------|
| `get_all_dollars` | Get all dollar exchange rates: blue, oficial, bolsa (MEP), contado con liqui (CCL), cripto, mayorista, and tarjeta. Returns buy/sell prices. |
| `get_dollar` | Get a specific dollar type rate. Types: `blue`, `oficial`, `bolsa`, `contadoconliqui`, `cripto`, `mayorista`, `tarjeta`. |
| `get_all_currencies` | Get all foreign currency exchange rates vs ARS (EUR, BRL, UYU, CLP, etc.). |
| `get_currency` | Get exchange rate for a specific foreign currency vs ARS. |
| `convert` | Convert an amount between ARS and any currency or dollar type. At least one side must be ARS. Supports `use_buy` flag for buy rate. |
| `get_spread` | Calculate the spread (difference) between two dollar types, e.g. blue vs oficial. Returns absolute and percentage spread. |

---

## Example Prompts

- "Dame todas las cotizaciones del dolar"
- "Cuanto sale el dolar blue hoy?"
- "Converti 500 USD blue a pesos"
- "Cual es la brecha entre el oficial y el blue?"
- "Cuanto esta el euro?"
- "Converti 1000 EUR a ARS"

---

## Programmatic Usage

```bash
npm install @dan1d/dolar-mcp
```

```typescript
import { createDolarTools } from "@dan1d/dolar-mcp";

const dolar = createDolarTools();

// Get all dollar rates
const rates = await dolar.tools.get_all_dollars();

// Get blue dollar specifically
const blue = await dolar.tools.get_dollar({ type: "blue" });

// Convert 100 USD blue to ARS
const converted = await dolar.tools.convert({
  amount: 100,
  from: "blue",
});

// Calculate spread between oficial and blue
const spread = await dolar.tools.get_spread({
  type_a: "oficial",
  type_b: "blue",
});
```

---

## Data Source

All data comes from [DolarAPI](https://dolarapi.com), a free public API for Argentine exchange rates. No authentication required. Data is updated in real time.

---

## Part of the LATAM MCP Toolkit

| Server | What it does |
|--------|-------------|
| [CobroYa](https://github.com/dan1d/mercadopago-tool) | Mercado Pago payments — create links, search payments, refunds |
| [MercadoLibre MCP](https://github.com/dan1d/mercadolibre-mcp) | MercadoLibre marketplace — search products, categories, trends |
| **DolarAPI MCP** | Argentine exchange rates — blue, oficial, CCL, crypto, conversion |

---

## License

[MIT](./LICENSE) -- by [dan1d](https://dan1d.dev/)