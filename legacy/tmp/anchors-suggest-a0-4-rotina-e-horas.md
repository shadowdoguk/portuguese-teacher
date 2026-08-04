# Anchors suggest — a0-4-rotina-e-horas

Target Unit: **Rotina diária e horas** (`a0-4-rotina-e-horas`) — level A0, order 4.

Existing anchors on this Unit:

- a0-2-numeros-apresentacoes (vocab, weight 0.7, vocabulary-decay)

## Proposed anchors (synthetic platform-wide gap data)

| toUnitId | gapArea | reason | weight |
| --- | --- | --- | --- |
| a0-1-alfabeto-saudacoes | grammar | grammar-gap | 0.55 |
| a0-2-numeros-apresentacoes | grammar | grammar-gap | 0.55 |
| a0-3-cafe-pedidos | grammar | grammar-gap | 0.55 |
| a0-1-alfabeto-saudacoes | fluency | scenario-struggle | 0.45 |
| a0-2-numeros-apresentacoes | fluency | scenario-struggle | 0.45 |
| a0-3-cafe-pedidos | fluency | scenario-struggle | 0.45 |

Review and copy these into `src/lib/curriculum/seed-a0.ts` to author the anchor.
