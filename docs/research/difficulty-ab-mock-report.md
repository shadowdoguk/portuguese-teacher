# Difficulty-control A/B harness report (mock LLM)

- **Generated**: 2026-06-24T11:00:47.556Z
- **Mode**: mock (mocked LLM — production validation needs a live MiniMax LLM; tracked by #42)
- **Branch of origin**: `feat/issue-6-llm-difficulty-pipeline` (PR #43)
- **Utterances scored**: 100
- **Target CEFR level**: A0
- **i+1 target score**: 1.000 (band ±0.600)

This file is the durable artifact of the mock-mode A/B harness run produced
during #6 development. It serves as the **baseline** for the live MiniMax LLM
acceptance run tracked by issue #42 / PR #52: when real MiniMax creds land,
`runAbHarness({ mode: 'live' })` should produce the same shape with the
in-band percentage at or above 75%.

## Headline numbers

| Mode | Mean estimator score | In-band % |
| --- | --- | --- |
| Prompt-only | 2.398 | 0.0% |
| Re-ranked | 0.853 | 33.0% |
| **Δ (re-ranked − prompt-only)** | **−1.545** | **+33.0%** |

## Caveats

- The mock LLM simulates the "alignment drift toward native-level output" pattern
  described in Jin et al. (2026). The estimator therefore scores prompt-only
  output ~2.4 (way above the A0 i+1 band of 0.4–1.6) on average.
- The re-ranked output moves the mean into band but still only achieves 33%
  in-band, well below the ≥75% acceptance threshold from #6. Reaching 75%
  requires the live MiniMax LLM, which is why #42 is the blocker.
- All 100 utterances are in pt-PT per ADR-0003 v1 scope.

## Per-utterance results

| # | Learner input | Notes | Prompt-only utterance | PO score | PO in-band | Re-ranked utterance | RR score | RR in-band | RR defects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## Summary

| Mode | Mean estimator score | In-band % |
| --- | --- | --- |
| Prompt-only | 2.398 | 0.0% |
| Re-ranked | 0.853 | 33.0% |
| **Δ (re-ranked − prompt-only)** | **-1.545** | **33.0%** |

> **Note**: this run used a mock LLM that simulates Jin et al.'s (2026) "alignment drift" toward native-level output. To validate the ≥ 75% in-band target from issue #6 acceptance criteria, run `runAbHarness({ mode: 'live' })` with a real MiniMax LLM. The mock harness exists so CI catches regressions in the re-ranker without burning LLM budget.

## Per-utterance results

| # | Learner input | Notes | Prompt-only utterance | PO score | PO in-band | Re-ranked utterance | RR score | RR in-band | RR defects |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | olá | greeting | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 2 | bom dia | greeting | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 3 | boa tarde | greeting | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Adeus. | 0.000 | ✗ | 0 |
| 4 | boa noite | greeting | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 5 | adeus | greeting | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 6 | até logo | greeting | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 7 | até amanhã | greeting | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 8 | como estás? | greeting | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 9 | como vai? | greeting | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Como te chamas? | 2.000 | ✗ | 0 |
| 10 | tudo bem? | greeting | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 11 | chamo-me Ana | introduction | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 12 | sou o Pedro | introduction | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 13 | sou portuguesa | introduction | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 14 | sou brasileiro | introduction | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 15 | tenho vinte e cinco anos | introduction | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Não. | 0.000 | ✗ | 0 |
| 16 | tenho trinta anos | introduction | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 17 | tenho dezassete anos | introduction | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 18 | moro em Lisboa | introduction | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 19 | moro no Porto | introduction | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 20 | sou de Faro | introduction | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 21 | obrigado | politeness | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Não. | 0.000 | ✗ | 0 |
| 22 | obrigada | politeness | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 23 | muito obrigado | politeness | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Adeus. | 0.000 | ✗ | 0 |
| 24 | de nada | politeness | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Perfeito. Queres pedir um café? | 2.400 | ✗ | 0 |
| 25 | com licença | politeness | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 26 | desculpa | politeness | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 27 | desculpe | politeness | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 28 | por favor | politeness | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 29 | está bem | politeness | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 30 | muito bem | politeness | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 31 | um café, por favor | cafe | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 32 | um café e uma torrada | cafe | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 33 | queria um café | cafe | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 34 | uma água, se faz favor | cafe | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 35 | a conta, por favor | cafe | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 36 | quanto é? | cafe | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Perfeito. Queres pedir um café? | 2.400 | ✗ | 0 |
| 37 | posso pagar com cartão? | cafe | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 38 | mais alguma coisa? | cafe | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Como te chamas? | 2.000 | ✗ | 0 |
| 39 | com licença, o café | cafe | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 40 | está quente | cafe | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | 0 |
| 41 | onde é a farmácia? | directions | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Como te chamas? | 2.000 | ✗ | 0 |
| 42 | como vou para o centro? | directions | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 43 | é longe? | directions | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 44 | é perto? | directions | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 45 | fica aqui perto | directions | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 46 | vire à direita | directions | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 47 | vire à esquerda | directions | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 48 | siga em frente | directions | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 49 | onde fica a estação? | directions | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 50 | perto da praça | directions | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | Bom dia. | 0.000 | ✗ | 0 |
| 51 | tenho dois irmãos | family | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | 0 |
| 52 | tenho uma irmã | family | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
| 53 | a minha mãe é professora | family | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 54 | o meu pai é médico | family | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 55 | sou casado | family | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 56 | sou solteira | family | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 57 | tenho um filho | family | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 58 | tenho uma filha | family | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 59 | a minha família é grande | family | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 60 | os meus avós vivem em Coimbra | family | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 61 | acordo às sete | routine | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 62 | tomo o pequeno-almoço | routine | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 63 | vou para o trabalho | routine | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 64 | almoço ao meio-dia | routine | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 65 | janto às oito | routine | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 66 | vou dormir às onze | routine | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 67 | estudo português | routine | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 68 | leio um livro | routine | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 69 | ouço música | routine | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 70 | vejo televisão | routine | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 71 | um, dois, três | numbers | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 72 | quantos anos tens? | numbers | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 73 | tenho cinco anos | numbers | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 74 | são sete euros | numbers | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 75 | duas pessoas, por favor | numbers | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 76 | três cafés | numbers | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Certo. E onde moras exactamente? | 1.800 | ✗ | 0 |
| 77 | quatro amigos | numbers | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 78 | dez minutos | numbers | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Olá! | 0.000 | ✗ | 0 |
| 79 | cento e vinte | numbers | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 80 | mil euros | numbers | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Bom dia. | 0.000 | ✗ | 0 |
| 81 | o céu é azul | colors | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | Adeus. | 0.000 | ✗ | 0 |
| 82 | a relva é verde | colors | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Olá, bom dia. | 0.000 | ✗ | 0 |
| 83 | o sol é amarelo | colors | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Boa. Podes repetir, por favor? | 1.200 | ✓ | 0 |
| 84 | a noite é escura | colors | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Bom dia. | 0.000 | ✗ | 0 |
| 85 | o carro é vermelho | colors | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Bom dia. | 0.000 | ✗ | 0 |
| 86 | a casa é branca | colors | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 87 | o gato é preto | colors | Com efeito, a problemática hodierna carece de uma apreciação holística e multifacetada. | 2.250 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 88 | a flor é rosa | colors | Há que considerar, however, the inherent ambiguity of linguistic phenomena. | 2.700 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 89 | o mar é azul | colors | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | Perfeito. Conta-me mais sobre isso. | 1.800 | ✗ | 0 |
| 90 | a árvore é verde | colors | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Não. | 0.000 | ✗ | 0 |
| 91 | hoje chove | misc | Urge, pois, uma reavaliação paradigmática das premissas subjacentes. | 2.625 | ✗ | Tudo bem? | 1.500 | ✓ | 0 |
| 92 | está sol | misc | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Muito bem! E o que fazes amanhã? | 0.857 | ✓ | 0 |
| 93 | está frio | misc | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 94 | está calor | misc | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 95 | está vento | misc | Subsequentemente, o aprendente deverá consolidar os conteúdos programáticos. | 2.250 | ✗ | Sim. | 0.000 | ✗ | 0 |
| 96 | ontem fui à praia | misc | A periclitante situação demanda uma intervenção célere e inequívoca. | 2.000 | ✗ | É imprescindível ponderar a transversalidade do fenómeno em questão. | 2.667 | ✗ | 0 |
| 97 | amanhã vou ao cinema | misc | A excelência pedagógica reside na capacidade de transmutar complexidade em clareza. | 2.727 | ✗ | Muito bem. E como te sentes hoje? | 1.286 | ✓ | 0 |
| 98 | gosto de chocolate | misc | A excelência comunicativa pressupõe um domínio cabal das estruturas sintácticas. | 2.400 | ✗ | Bom dia. | 0.000 | ✗ | 0 |
| 99 | não gosto de café | misc | Não obstante, a conjuntura actual exige uma reflexão circunstanciada. | 2.000 | ✗ | Adeus. | 0.000 | ✗ | 0 |
| 100 | quero aprender português | misc | Outrossim, convém salientar que as idiossincrasias do falante nativo se manifestam amiúde. | 2.500 | ✗ | Obrigado. | 0.000 | ✗ | 0 |
