import type { Scenario, ScenarioCategory, Level } from "./types";

export type ScenarioCompletion = {
  scenarioId: string;
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  turnsTaken: number;
  completedAt: number;
};

export type ScenarioProgress = {
  scenarioId: string;
  completedAt?: number;
  bestStars: 0 | 1 | 2 | 3;
  attempts: number;
};

export const SCENARIO_LIBRARY_VERSION = 1;

type ScenarioDraft = Omit<Scenario, "id" | "unitId" | "targetLevel"> & {
  id: string;
  unitId: string;
  targetLevel: Level;
};

function scenario(draft: ScenarioDraft): Scenario {
  return draft;
}

export const SCENARIO_LIBRARY: ReadonlyArray<Scenario> = [
  scenario({
    id: "s-greetings-1-cafe-entrar",
    unitId: "a0-1-alfabeto-saudacoes",
    category: "greetings-introductions",
    targetLevel: "A0",
    goal: "Entrar num café, saudar e pedir uma bebida em três falas.",
    setting: "Balcão de um café em Lisboa, manhã de sábado.",
    roles: {
      learner: "Cliente estrangeiro a entrar pela primeira vez.",
      teacher: "Empregado de balcão simpático.",
    },
    preTask:
      "Planeia a tua entrada: que horas são? Que saudação é apropriada? Que bebida queres?",
    expectedTurns: 3,
    vocabularyRefs: ["a0-1-v-bom-dia", "a0-1-v-por-favor", "a0-1-v-obrigado"],
    grammarRefs: ["a0-1-g-artigo"],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa uma saudação adequada à hora.",
      "O Learner diz ‘por favor’ ao pedir.",
      "O Learner agradece antes de sair.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-greetings-2-apresentar-grupo",
    unitId: "a0-2-numeros-apresentacoes",
    category: "greetings-introductions",
    targetLevel: "A0",
    goal: "Apresentar-te a três pessoas novas num grupo, dando nome e idade.",
    setting: "Encontro de intercâmbio numa associação em Coimbra.",
    roles: {
      learner: "Recém-chegado a um grupo de conversação.",
      teacher: "Três participantes portugueses que se apresentam primeiro.",
    },
    preTask:
      "Prepara uma apresentação de 10 segundos: nome, idade, e de onde vieste. Conta até vinte em voz alta uma vez antes de começar.",
    expectedTurns: 6,
    vocabularyRefs: ["a0-2-v-chamar", "a0-2-v-ter"],
    grammarRefs: ["a0-2-g-apresentar"],
    remedialAnchorRefs: [
      {
        toUnitId: "a0-1-alfabeto-saudacoes",
        reason: "phoneme-confusion",
        note: "Voltar ao alfabeto se o Learner hesitar a soletrar o nome.",
      },
    ],
    successCriteria: [
      "O Learner cumprimenta cada pessoa de forma adequada.",
      "O Learner usa ‘chamo-me…’ e ‘tenho … anos’ em todas as apresentações.",
      "O Learner responde com ‘prazer’ quando apresentado.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-greetings-3-despedida-formal",
    unitId: "a1-1-viagens",
    category: "greetings-introductions",
    targetLevel: "A1",
    goal: "Despedir-te de forma adequada num contexto profissional.",
    setting: "Fim de uma reunião numa empresa em Lisboa.",
    roles: {
      learner: "Estagiário estrangeiro a terminar o primeiro dia.",
      teacher: "Responsável de equipa português.",
    },
    preTask:
      "Prepara duas frases de despedida: uma formal (‘até segunda-feira’) e uma com agradecimento.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa uma fórmula de despedida adequada ao contexto profissional.",
      "O Learner agradece pela receção do dia.",
      "O Learner confirma o próximo encontro (dia ou hora).",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-greetings-4-self-intro-host-family",
    unitId: "a1-4-familia",
    category: "greetings-introductions",
    targetLevel: "A1",
    goal: "Apresentar-te à família de acolhimento e falar sobre ti.",
    setting: "Sala de estar de uma casa em Sintra, primeiro dia.",
    roles: {
      learner: "Estudante em programa de mobilidade.",
      teacher: "Mãe da família de acolhimento.",
    },
    preTask:
      "Prepara três frases sobre ti: de onde vieste, o que estudas, e o que gostas de fazer ao fim de semana.",
    expectedTurns: 8,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa ‘chamo-me…’ ao apresentar-se.",
      "O Learner menciona pelo menos dois factos pessoais.",
      "O Learner responde a uma pergunta simples sobre preferências.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-cafe-1-pedir-basico",
    unitId: "a0-3-cafe-pedidos",
    category: "cafe-restaurant",
    targetLevel: "A0",
    goal: "Pedir uma bebida e um doce, perguntar o preço e pagar.",
    setting: "Café tradicional em Lisboa, hora do lanche.",
    roles: {
      learner: "Cliente a pedir pela primeira vez em português.",
      teacher: "Empregado paciente que confirma o pedido.",
    },
    preTask:
      "Lê o menu em silêncio. Decide o que pedes. Prepara a pergunta ‘quanto é?’ antes de pedir a conta.",
    expectedTurns: 5,
    vocabularyRefs: ["a0-3-v-pastel-nata", "a0-3-v-agua", "a0-3-v-cafe"],
    grammarRefs: ["a0-3-g-condicional-pedir"],
    remedialAnchorRefs: [
      {
        toUnitId: "a0-1-alfabeto-saudacoes",
        reason: "vocabulary-decay",
        note: "Voltar a ‘bom dia / por favor / obrigado’ se o Learner esquecer as cortesias.",
      },
    ],
    successCriteria: [
      "O Learner cumprimenta o empregado ao entrar.",
      "O Learner usa ‘queria’ para fazer o pedido.",
      "O Learner confirma o preço antes de pagar.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-2-reserva-pequeno-almoco",
    unitId: "a1-1-viagens",
    category: "cafe-restaurant",
    targetLevel: "A1",
    goal: "Reservar uma mesa para o pequeno-almoço e perguntar o horário.",
    setting: "Receção de uma pastelaria no Porto.",
    roles: {
      learner: "Turista a planear o dia seguinte.",
      teacher: "Rececionista da pastelaria.",
    },
    preTask:
      "Decide: quantas pessoas, que horas queres, e se queres sentar dentro ou na esplanada.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner cumprimenta a rececionista.",
      "O Learner indica o número de pessoas e a hora.",
      "O Learner confirma a reserva repetindo os dados.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-3-reclamacao-conta",
    unitId: "a2-1-compras",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Questionar uma cobrança errada na conta de forma educada.",
    setting: "Mesa de um restaurante em Lisboa, depois do jantar.",
    roles: {
      learner: "Cliente que acha a conta alta demais.",
      teacher: "Empregado que verifica o pedido.",
    },
    preTask:
      "Relê o pedido que fizeste. Identifica o item que não pediste. Prepara uma pergunta educada: ‘desculpe, mas eu não pedi isto’.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner abre com ‘desculpe’ em vez de reclamar diretamente.",
      "O Learner refere-se ao item específico em disputa.",
      "O Learner aceita ou recusa a correção proposta.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-4-pedir-recomendacao",
    unitId: "a1-2-mercearia",
    category: "cafe-restaurant",
    targetLevel: "A1",
    goal: "Pedir uma recomendação ao empregado e justificar uma escolha.",
    setting: "Taberna típica em Lisboa, hora de almoço.",
    roles: {
      learner: "Cliente indeciso entre dois pratos.",
      teacher: "Empregado que conhece bem a ementa.",
    },
    preTask:
      "Lê a ementa. Escolhe dois pratos que te interessam. Prepara a pergunta ‘o que recomenda?’",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pergunta uma recomendação.",
      "O Learner refere pelo menos uma preferência (‘gosto de…’).",
      "O Learner faz o pedido final.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-cafe-5-alergia-restaurante",
    unitId: "a2-2-restaurante",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Comunicar uma alergia alimentar ao empregado e pedir alternativa segura.",
    setting: "Restaurante em Coimbra, jantar de sábado.",
    roles: {
      learner: "Cliente com alergia a frutos secos.",
      teacher: "Empregado que consulta a cozinha.",
    },
    preTask:
      "Prepara a frase ‘sou alérgico a…’ e uma pergunta sobre ingredientes (‘tem …?’).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner afirma a alergia de forma clara.",
      "O Learner pergunta sobre ingredientes específicos.",
      "O Learner agradece ou pede alternativa antes de fechar o pedido.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-shopping-1-comprar-roupa",
    unitId: "a1-3-roupa",
    category: "shopping-bargaining",
    targetLevel: "A1",
    goal: "Pedir um artigo de roupa num tamanho e cor específicos.",
    setting: "Loja de roupa numa rua comercial do Porto.",
    roles: {
      learner: "Cliente que quer uma camisola.",
      teacher: "Vendedor atencioso.",
    },
    preTask:
      "Decide: que peça, que cor, e que tamanho. Prepara a pergunta ‘tem isto em…?’",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica a peça que pretende.",
      "O Learner pergunta por uma cor ou tamanho.",
      "O Learner pergunta o preço antes de decidir.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-shopping-2-provar-devolver",
    unitId: "a2-1-compras",
    category: "shopping-bargaining",
    targetLevel: "A2",
    goal: "Experimentar roupa e devolver um artigo que não serve.",
    setting: "Cabina de prova de uma loja em Lisboa.",
    roles: {
      learner: "Cliente que precisa de outro tamanho.",
      teacher: "Vendedor que ajuda na troca.",
    },
    preTask:
      "Prepara: ‘posso experimentar?’ e ‘tem noutro tamanho?’. Prepara também como pedir a devolução (‘queria devolver’).",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pede para experimentar de forma educada.",
      "O Learner justifica porque precisa de outro tamanho.",
      "O Learner devolve o artigo com uma frase completa.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-shopping-3-mercearia-peso",
    unitId: "a1-2-mercearia",
    category: "shopping-bargaining",
    targetLevel: "A1",
    goal: "Comprar queijos e enchidos a peso numa mercearia tradicional.",
    setting: "Balcão de uma mercearia em Sintra.",
    roles: {
      learner: "Cliente que quer meio quilo de queijo e um quarto de enchidos.",
      teacher: "Merceiro que pesa e embrulha.",
    },
    preTask:
      "Prepara: ‘queria meio quilo de…’ e ‘quanto custa?’. Lembra-te do verbo ‘embrulhar’.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica a quantidade com ‘meio quilo’ ou ‘duzentas gramas’.",
      "O Learner pergunta o preço.",
      "O Learner confirma antes de pagar.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-directions-1-pedir-rua",
    unitId: "a0-2-numeros-apresentacoes",
    category: "directions",
    targetLevel: "A0",
    goal: "Perguntar onde fica uma rua específica.",
    setting: "Praça central de Lisboa, início da tarde.",
    roles: {
      learner: "Turista com um mapa na mão.",
      teacher: "Passante português prestável.",
    },
    preTask:
      "Decide a rua que procuras. Prepara: ‘com licença, onde fica a Rua…?’ e ‘é longe?’",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa ‘com licença’ para chamar a atenção.",
      "O Learner nomeia o destino claramente.",
      "O Learner agradece no final.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-directions-2-seguir-indicacoes",
    unitId: "a1-5-rotinas",
    category: "directions",
    targetLevel: "A1",
    goal: "Seguir instruções de um transeunte para chegar a um destino.",
    setting: "Bairro de Alfama, Lisboa.",
    roles: {
      learner: "Visitante perdido.",
      teacher: "Senhora local que conhece bem o bairro.",
    },
    preTask:
      "Prepara: ‘estou a procurar…’ e ‘pode repetir?’ (para confirmar a indicação).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica o que procura.",
      "O Learner confirma as instruções com ‘então é…’ ou ‘entendi’.",
      "O Learner agradece e despede-se.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-directions-3-transporte-publico",
    unitId: "a2-2-restaurante",
    category: "directions",
    targetLevel: "A2",
    goal: "Perguntar qual o autocarro ou metro para um destino e quanto tempo demora.",
    setting: "Estação de metro do Marquês, Lisboa.",
    roles: {
      learner: "Residente novo com destino a um encontro.",
      teacher: "Funcionário da estação.",
    },
    preTask:
      "Prepara: ‘qual é o metro para…?’ e ‘quantas estações são?’ e ‘demora muito?’",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pergunta a linha ou o número do transporte.",
      "O Learner pergunta a duração ou o número de paragens.",
      "O Learner agradece antes de ir.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-doctor-1-marcar-consulta",
    unitId: "a1-2-saude",
    category: "doctor",
    targetLevel: "A1",
    goal: "Marcar uma consulta de medicina geral e descrever o motivo.",
    setting: "Receção de um centro de saúde em Lisboa.",
    roles: {
      learner: "Paciente novo com sintomas ligeiros.",
      teacher: "Rececionista do centro de saúde.",
    },
    preTask:
      "Prepara: ‘queria marcar uma consulta’ e uma frase simples sobre o motivo (‘tenho dor de…’).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner cumprimenta a rececionista.",
      "O Learner indica que quer marcar consulta.",
      "O Learner descreve o motivo com pelo menos uma parte do corpo ou sintoma.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-doctor-2-descrever-sintomas",
    unitId: "a1-2-saude",
    category: "doctor",
    targetLevel: "A1",
    goal: "Descrever sintomas ao médico e responder a perguntas simples.",
    setting: "Consultório de clínica geral em Coimbra.",
    roles: {
      learner: "Paciente com gripe.",
      teacher: "Médico de família.",
    },
    preTask:
      "Prepara: ‘tenho dor de…’ ‘há … dias’ e ‘sim’ / ‘não’. Lembra-te de ‘febre’, ‘tosse’, ‘cansaço’.",
    expectedTurns: 8,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner refere pelo menos dois sintomas.",
      "O Learner indica há quanto tempo está doente.",
      "O Learner aceita ou questiona a receita proposta.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-doctor-3-farmacia",
    unitId: "a1-2-saude",
    category: "doctor",
    targetLevel: "A1",
    goal: "Comprar um medicamento na farmácia e perguntar a posologia.",
    setting: "Balcão de farmácia em Sintra.",
    roles: {
      learner: "Cliente com receita médica.",
      teacher: "Farmacêutico que explica a toma.",
    },
    preTask:
      "Prepara: ‘tenho uma receita para…’ e ‘como se toma?’ e ‘de quantas em quantas horas?’",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner entrega a receita e refere o nome do medicamento.",
      "O Learner pergunta a posologia.",
      "O Learner confirma a indicação antes de sair.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-bank-1-abrir-conta",
    unitId: "a2-3-banco",
    category: "bank-post-office",
    targetLevel: "A2",
    goal: "Perguntar sobre a abertura de conta e os documentos necessários.",
    setting: "Balcão de um banco em Lisboa.",
    roles: {
      learner: "Recém-chegado a Portugal.",
      teacher: "Funcionário bancário.",
    },
    preTask:
      "Prepara: ‘queria abrir uma conta’ e ‘que documentos preciso?’ e ‘quanto custa?’",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o tipo de conta (à ordem / a prazo).",
      "O Learner pergunta os documentos necessários.",
      "O Learner pergunta o custo ou comissão.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-bank-2-multibanco",
    unitId: "a2-3-banco",
    category: "bank-post-office",
    targetLevel: "A2",
    goal: "Pedir ajuda para usar o Multibanco e levantar dinheiro.",
    setting: "Caixa Multibanco na rua, Lisboa.",
    roles: {
      learner: "Utilizador estrangeiro com cartão estrangeiro.",
      teacher: "Passante que ajuda.",
    },
    preTask:
      "Prepara: ‘pode ajudar-me?’ e ‘como faço para…?’ e ‘quanto posso levantar?’",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pede ajuda de forma educada.",
      "O Learner descreve a operação que quer fazer.",
      "O Learner agradece depois de conseguir.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-job-1-entrevista-primeira",
    unitId: "b1-1-emprego",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Responder a perguntas típicas de uma entrevista de primeiro emprego.",
    setting: "Sala de reuniões de uma startup em Lisboa.",
    roles: {
      learner: "Candidato a estágio.",
      teacher: "Recrutador da empresa.",
    },
    preTask:
      "Prepara respostas para: ‘fale sobre si’, ‘porque se candidatou?’ e ‘quais são os seus pontos fortes?’",
    expectedTurns: 10,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner faz uma apresentação pessoal coerente.",
      "O Learner responde com um motivo para a candidatura.",
      "O Learner refere pelo menos uma qualidade ou experiência.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-2-negociar-salario",
    unitId: "b1-1-emprego",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Negociar condições salariais e de início de funções.",
    setting: "Escritório do responsável de RH, Lisboa.",
    roles: {
      learner: "Candidato com proposta de emprego.",
      teacher: "Responsável de recursos humanos.",
    },
    preTask:
      "Prepara: ‘gostaria de negociar o salário’ e ‘é possível começar em…?’ Lembra-te de ‘benefícios’ e ‘horário flexível’.",
    expectedTurns: 8,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner refere o valor atual da proposta antes de negociar.",
      "O Learner justifica o valor que propõe.",
      "O Learner pergunta sobre benefícios ou horário.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-travel-1-aeroporto-checkin",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Fazer check-in no balcão do aeroporto e despachar uma mala.",
    setting: "Balcão de check-in no aeroporto de Lisboa.",
    roles: {
      learner: "Passageiro com uma mala para despachar.",
      teacher: "Funcionário da companhia aérea.",
    },
    preTask:
      "Prepara: ‘bom dia, queria fazer check-in’ e ‘tenho uma mala para despachar’ e ‘janela ou corredor?’",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner cumprimenta e identifica o destino.",
      "O Learner indica que quer despachar mala.",
      "O Learner escolhe lugar (janela ou corredor).",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-2-taxi-aeroporto",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Apanhar um táxi do aeroporto até ao hotel.",
    setting: "Paragem de táxis do aeroporto de Faro.",
    roles: {
      learner: "Turista recém-chegado.",
      teacher: "Motorista de táxi.",
    },
    preTask:
      "Prepara: ‘preciso de um táxi para…’ e ‘quanto custa?’ e ‘aceita cartão?’",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o destino pelo nome.",
      "O Learner pergunta o preço antes de entrar.",
      "O Learner pergunta o método de pagamento.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-3-hotel-checkin",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Fazer check-in num hotel e perguntar sobre pequeno-almoço e wifi.",
    setting: "Receção de um hotel em Cascais.",
    roles: {
      learner: "Hóspede com reserva.",
      teacher: "Rececionista do hotel.",
    },
    preTask:
      "Prepara: ‘tenho uma reserva em nome de…’ e ‘a que horas é o pequeno-almoço?’ e ‘tem wifi?’",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica que tem reserva e dá o nome.",
      "O Learner pergunta o horário do pequeno-almoço.",
      "O Learner pergunta sobre o acesso à internet.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-4-perdido-estrangeiro",
    unitId: "a2-2-restaurante",
    category: "travelling",
    targetLevel: "A2",
    goal: "Pedir ajuda depois de perder o comboio e reorganizar a viagem.",
    setting: "Bilheteira de uma estação de comboios em Portugal.",
    roles: {
      learner: "Viajante que perdeu a ligação.",
      teacher: "Funcionário da bilheteira.",
    },
    preTask:
      "Prepara: ‘perdi o comboio das…’ e ‘qual é o próximo?’ e ‘quanto custa a alteração?’",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica o que aconteceu em duas frases.",
      "O Learner pergunta a próxima opção.",
      "O Learner confirma o custo da alteração antes de aceitar.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-1-planos-fim-de-semana",
    unitId: "a2-4-sociais",
    category: "social-plans",
    targetLevel: "A2",
    goal: "Propor e combinar um plano para o fim de semana.",
    setting: "Conversa entre amigos num café em Lisboa.",
    roles: {
      learner: "Amigo recém-chegado a Lisboa.",
      teacher: "Amigo português com várias sugestões.",
    },
    preTask:
      "Prepara: ‘o que vais fazer no sábado?’ e ‘posso ir?’ e ‘a que horas?’",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner sugere uma atividade.",
      "O Learner confirma o dia e a hora.",
      "O Learner pergunta onde encontrar.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-social-2-aniversario-convites",
    unitId: "b1-2-sociais",
    category: "social-plans",
    targetLevel: "B1",
    goal: "Organizar um jantar de aniversário e convidar amigos.",
    setting: "Conversa por telefone com um amigo.",
    roles: {
      learner: "Anfitrião a organizar o evento.",
      teacher: "Amigo convidado.",
    },
    preTask:
      "Prepara: ‘estou a organizar um jantar de aniversário’ e ‘podes vir?’ e ‘trago alguma coisa?’",
    expectedTurns: 8,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica o motivo do encontro.",
      "O Learner indica data, hora e local.",
      "O Learner pergunta se o convidado traz algo.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-1-cumprimento-beijo",
    unitId: "a1-1-viagens",
    category: "cultural-norms",
    targetLevel: "A1",
    goal: "Reagir de forma adequada a um cumprimento social português.",
    setting: "Receção numa casa portuguesa, apresentação de um amigo.",
    roles: {
      learner: "Convidado estrangeiro.",
      teacher: "Anfitriã portuguesa.",
    },
    preTask:
      "Lembra-te: em Portugal é comum dar dois beijos na face como cumprimento. Prepara como responder a ‘muito gosto’.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner responde a um cumprimento de forma natural.",
      "O Learner agradece o convite.",
      "O Learner pergunta algo à anfitriã.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-cultural-2-hora-pontualidade",
    unitId: "b1-3-cultura",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Comentar de forma diplomática a pontualidade portuguesa num jantar.",
    setting: "Jantar em casa de amigos portugueses.",
    roles: {
      learner: "Convidado estrangeiro a chegar 10 minutos depois da hora marcada.",
      teacher: "Anfitrião português que não estranha o atraso.",
    },
    preTask:
      "Prepara como pedir desculpa pelo atraso e aceita a reacção do anfitrião sem estragar o ambiente.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pede desculpa pelo atraso de forma simpática.",
      "O Learner aceita uma observação cultural sem entrar em conflito.",
      "O Learner muda de assunto para um tópico neutro.",
    ],
    passingScore: 0.7,
  }),
];

export const SCENARIO_CATEGORIES: ReadonlyArray<{
  value: ScenarioCategory;
  label: string;
  description: string;
}> = [
  {
    value: "greetings-introductions",
    label: "Greetings & introductions",
    description: "Saudar, apresentar-se, despedir.",
  },
  {
    value: "cafe-restaurant",
    label: "Café & restaurant",
    description: "Pedir, reclamar, reservar.",
  },
  {
    value: "shopping-bargaining",
    label: "Shopping & bargaining",
    description: "Comprar, devolver, experimentar.",
  },
  {
    value: "directions",
    label: "Directions",
    description: "Pedir e seguir indicações.",
  },
  {
    value: "doctor",
    label: "Doctor & pharmacy",
    description: "Marcar consulta, descrever sintomas.",
  },
  {
    value: "bank-post-office",
    label: "Bank & post office",
    description: "Contas, Multibanco, CTT.",
  },
  {
    value: "job-interview",
    label: "Job interview",
    description: "Entrevistas e negociação.",
  },
  {
    value: "travelling",
    label: "Travelling",
    description: "Aeroporto, táxi, hotel, comboio.",
  },
  {
    value: "social-plans",
    label: "Social plans",
    description: "Planos com amigos, convites.",
  },
  {
    value: "cultural-norms",
    label: "Cultural norms",
    description: "Etiqueta social portuguesa.",
  },
];

export function getScenarioById(id: string): Scenario | undefined {
  return SCENARIO_LIBRARY.find((s) => s.id === id);
}

export function scenariosForCategory(category: ScenarioCategory): ReadonlyArray<Scenario> {
  return SCENARIO_LIBRARY.filter((s) => s.category === category);
}

export function scenariosForLevel(level: Level): ReadonlyArray<Scenario> {
  return SCENARIO_LIBRARY.filter((s) => s.targetLevel === level);
}

export function assertScenarioLibraryInvariants(): void {
  const seen = new Set<string>();
  for (const scenario of SCENARIO_LIBRARY) {
    if (seen.has(scenario.id)) {
      throw new Error(`Duplicate scenario id: ${scenario.id}`);
    }
    seen.add(scenario.id);
    if (scenario.expectedTurns < 2) {
      throw new Error(`Scenario ${scenario.id} must allow ≥ 2 turns`);
    }
    if (scenario.passingScore < 0 || scenario.passingScore > 1) {
      throw new Error(`Scenario ${scenario.id} passingScore out of range [0,1]`);
    }
    if (scenario.successCriteria.length === 0) {
      throw new Error(`Scenario ${scenario.id} has no success criteria`);
    }
  }
  if (SCENARIO_LIBRARY.length < 30) {
    throw new Error(
      `Scenario library must have ≥ 30 scenarios per FR-CP-4; found ${SCENARIO_LIBRARY.length}`,
    );
  }
}

export type ScenarioStarBreakdown = {
  passed: boolean;
  stars: 0 | 1 | 2 | 3;
  reasons: ReadonlyArray<string>;
};

export function scoreScenario(
  scenario: Scenario,
  criteriaMet: ReadonlyArray<boolean>,
): ScenarioStarBreakdown {
  const total = scenario.successCriteria.length;
  if (criteriaMet.length !== total) {
    throw new Error(
      `criteriaMet length (${criteriaMet.length}) must match scenario.successCriteria (${total})`,
    );
  }
  const met = criteriaMet.filter(Boolean).length;
  const ratio = total === 0 ? 0 : met / total;
  const passed = ratio >= scenario.passingScore;
  let stars: 0 | 1 | 2 | 3 = 0;
  if (passed) {
    if (ratio >= 1) stars = 3;
    else if (ratio >= (1 + scenario.passingScore) / 2) stars = 2;
    else stars = 1;
  }
  return {
    passed,
    stars,
    reasons: scenario.successCriteria.map((criterion, i) =>
      criteriaMet[i] ? `✓ ${criterion}` : `✗ ${criterion}`,
    ),
  };
}
