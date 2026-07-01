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
        gapArea: "pronunciation",
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
        gapArea: "fluency",
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

  // ===========================================================================
  // Scenario expansion — issue #47. Brings the library to ≥ 100 scenarios
  // with ≥ 6 per ScenarioCategory. Content covers A0..B1 across pt-PT
  // cultural contexts (Lisboa, Porto, Coimbra, Sintra, Faro, etc.).
  // Unit IDs point at Units that will land in seed-a1/a2/b1.ts; the
  // in-memory SCENARIO_LIBRARY is consumed by tests + UI independent of
  // the DB seed.
  // ===========================================================================

  // ---------- greetings-introductions (4 → 6) ----------
  scenario({
    id: "s-greetings-4-boas-vindas-grupo",
    unitId: "a1-1-viagens",
    category: "greetings-introductions",
    targetLevel: "A1",
    goal: "Dar as boas-vindas a um visitante estrangeiro num evento informal.",
    setting: "Jardim de uma associação em Lisboa, fim de tarde de sexta-feira.",
    roles: {
      learner: "Anfitrião português a receber um convidado.",
      teacher: "Convidado estrangeiro recém-chegado.",
    },
    preTask:
      "Prepara três frases: uma de boas-vindas, uma pergunta sobre a viagem, e um convite para uma bebida.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa uma saudação calorosa mas informal.",
      "O Learner pergunta especificamente como foi a viagem.",
      "O Learner oferece uma bebida ou lanche sem pressionar.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-greetings-5-apresentar-equipa-trabalho",
    unitId: "a2-1-rotina-trabalho",
    category: "greetings-introductions",
    targetLevel: "A2",
    goal: "Apresentar a tua equipa de trabalho a um novo colega.",
    setting: "Escritório em Lisboa, primeira manhã de um colega.",
    roles: {
      learner: "Coordenador de equipa a apresentar três colegas.",
      teacher: "Novo colega estrangeiro, tímido.",
    },
    preTask:
      "Prepara uma estrutura: nome, cargo, e uma curiosidade breve sobre cada colega (passatempo ou projecto recente).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta cada colega com nome + cargo.",
      "O Learner acrescenta uma nota humana (passatempo, projecto).",
      "O Learner pergunta ao novo colega como prefere ser tratado (tu/você).",
    ],
    passingScore: 0.7,
  }),

  // ---------- cafe-restaurant (5 → 12) ----------
  scenario({
    id: "s-cafe-6-reservar-mesa-jantar",
    unitId: "a1-2-alimentacao",
    category: "cafe-restaurant",
    targetLevel: "A1",
    goal: "Reservar uma mesa para o jantar pelo telefone.",
    setting: "Restaurante típico em Alfama, Lisboa, hora de almoço.",
    roles: {
      learner: "Cliente a telefonar para reservar.",
      teacher: "Funcionário do restaurante a anotar a reserva.",
    },
    preTask:
      "Prepara o essencial: dia, hora, número de pessoas, e um pedido especial (cadeira de bebé, por exemplo).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica dia e hora claramente.",
      "O Learner indica o número de pessoas.",
      "O Learner confirma ou ajusta o pedido especial.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-cafe-7-reclamar-conta-errada",
    unitId: "a2-1-rotina-trabalho",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Questionar uma cobrança errada na conta de forma educada.",
    setting: "Mesa de um restaurante em Lisboa, depois do jantar.",
    roles: {
      learner: "Cliente a notar um item duplicado na conta.",
      teacher: "Empregado de mesa simpático mas ocupado.",
    },
    preTask:
      "Prepara a reclamação: identifica o item duplicado, propõe a solução, mantém um tom cordial.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner cumprimenta e explica o problema sem acusar.",
      "O Learner aponta especificamente o item duplicado.",
      "O Learner aceita a correção e agradece.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-8-comunicar-alergia-alimentar",
    unitId: "a2-2-viagens-saude",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Comunicar uma alergia alimentar ao empregado e pedir alternativa segura.",
    setting: "Restaurante em Coimbra, jantar de sábado.",
    roles: {
      learner: "Cliente com alergia grave a frutos secos.",
      teacher: "Empregado atencioso mas sem experiência com alergias.",
    },
    preTask:
      "Prepara uma explicação clara: o alergénio, a gravidade, e uma pergunta sobre ingredientes específicos do prato.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner declara a alergia de forma explícita.",
      "O Learner pergunta sobre ingredientes específicos do prato.",
      "O Learner aceita uma alternativa segura ou recusa o prato com elegância.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-9-recomendar-prato-vinho",
    unitId: "b1-1-gastronomia",
    category: "cafe-restaurant",
    targetLevel: "B1",
    goal: "Pedir uma recomendação ao empregado e justificar uma escolha de prato e vinho.",
    setting: "Taberna típica em Lisboa, hora de almoço.",
    roles: {
      learner: "Cliente indeciso entre dois pratos do menu.",
      teacher: "Empregado conhecedor da casa.",
    },
    preTask:
      "Prepara duas perguntas: uma sobre o prato do dia, outra sobre o vinho. Justifica a escolha final.",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pergunta sobre o prato do dia e o vinho da casa.",
      "O Learner justifica a escolha com uma razão clara (sabor, ocasião, orçamento).",
      "O Learner agradece pela recomendação.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-10-pedir-para-partilhar",
    unitId: "a2-1-rotina-trabalho",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Pedir dois pratos para partilhar com um amigo sem ofender o empregado.",
    setting: "Restaurante moderno no Porto, jantar de sexta.",
    roles: {
      learner: "Cliente a pedir pratos para partilhar.",
      teacher: "Empregado a quem a ideia é unfamiliar.",
    },
    preTask:
      "Prepara uma explicação: porque preferem partilhar, quais os pratos que querem, e como os querem servir.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica que querem partilhar.",
      "O Learner escolhe pratos complementares.",
      "O Learner pede pratos separados ou confirma que chegam ao mesmo tempo.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-11-buscar-menu-vegetariano",
    unitId: "b1-1-gastronomia",
    category: "cafe-restaurant",
    targetLevel: "B1",
    goal: "Pedir opções vegetarianas quando o menu tem pouca escolha.",
    setting: "Restaurante tradicional no Alentejo, domingo de almoço.",
    roles: {
      learner: "Cliente vegetariano a explicar restrições.",
      teacher: "Empregado com pouco conhecimento de cozinha vegetariana.",
    },
    preTask:
      "Prepara uma explicação clara do que come e do que evita, e pergunta se podem adaptar um prato.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica a dieta de forma clara e sem julgamento.",
      "O Learner pergunta sobre adaptações possíveis.",
      "O Learner aceita uma sugestão alternativa ou parte sem azedar.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cafe-12-pagar-conta-dividir",
    unitId: "a2-1-rotina-trabalho",
    category: "cafe-restaurant",
    targetLevel: "A2",
    goal: "Dividir a conta com um amigo e deixar a gorjeta certa.",
    setting: "Café em Lisboa, depois do almoço.",
    roles: {
      learner: "Cliente a pedir a conta e a dividir.",
      teacher: "Empregado a explicar os itens e a gorjeta sugerida.",
    },
    preTask:
      "Prepara como vais pedir para dividir, quanto deixar de gorjeta (5–10 % em Portugal), e como pagar (multibanco, dinheiro).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pede para dividir a conta.",
      "O Learner pergunta sobre a gorjeta ou inclui-a no cálculo.",
      "O Learner escolhe um método de pagamento e despede-se.",
    ],
    passingScore: 0.7,
  }),

  // ---------- shopping-bargaining (3 → 9) ----------
  scenario({
    id: "s-shopping-4-devolver-artigo-receipt",
    unitId: "a2-1-rotina-trabalho",
    category: "shopping-bargaining",
    targetLevel: "A2",
    goal: "Devolver um artigo que não serve, com recibo, dentro do prazo.",
    setting: "Loja de roupa em Lisboa, três dias após a compra.",
    roles: {
      learner: "Cliente a devolver uma camisola.",
      teacher: "Empregado de loja a verificar a política de devolução.",
    },
    preTask:
      "Prepara o recibo, a explicação do motivo, e o que esperas em troca (reembolso ou troca).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta o recibo e o artigo com etiqueta.",
      "O Learner explica o motivo da devolução de forma cortês.",
      "O Learner aceita o reembolso ou a troca.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-shopping-5-comprar-roupa-tamanho",
    unitId: "a1-2-alimentacao",
    category: "shopping-bargaining",
    targetLevel: "A1",
    goal: "Pedir um artigo de roupa num tamanho e cor específicos.",
    setting: "Loja de roupa numa rua comercial do Porto.",
    roles: {
      learner: "Cliente a pedir ajuda para encontrar uma peça.",
      teacher: "Vendedor atencioso a orientar.",
    },
    preTask:
      "Prepara o que queres: tipo de peça, tamanho, cor, e se queres experimentar.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o tipo de peça e o tamanho.",
      "O Learner indica uma cor ou padrão.",
      "O Learner pergunta onde fica o balcão de experimentação.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-shopping-6-mercearia-peso",
    unitId: "a1-2-alimentacao",
    category: "shopping-bargaining",
    targetLevel: "A1",
    goal: "Comprar queijos e enchidos a peso numa mercearia tradicional.",
    setting: "Balcão de uma mercearia em Sintra.",
    roles: {
      learner: "Cliente a pedir quantidades específicas.",
      teacher: "Merceeiro simpático a cortar e pesar.",
    },
    preTask:
      "Prepara o que queres (queijo, enchido), a quantidade em gramas ou preço, e pergunta por recomendações.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o produto e a quantidade.",
      "O Learner aceita ou rejeita a recomendação.",
      "O Learner pergunta o preço final.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-shopping-7-negociar-preco-mercado",
    unitId: "b1-1-gastronomia",
    category: "shopping-bargaining",
    targetLevel: "B1",
    goal: "Negociar o preço num mercado de rua sem ofender o vendedor.",
    setting: "Mercado da Ribeira, Lisboa, sábado de manhã.",
    roles: {
      learner: "Cliente a tentar baixar um preço de queijo artesanal.",
      teacher: "Vendedor simpático a defender o preço.",
    },
    preTask:
      "Prepara uma abordagem diplomática: elogia o produto, justifica porque achas caro, propõe um preço razoável.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner elogia o produto antes de questionar o preço.",
      "O Learner propõe um preço razoável, não abusivo.",
      "O Learner aceita a contraproposta ou desiste com elegância.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-shopping-8-comprar-presente-aniversario",
    unitId: "a2-2-viagens-saude",
    category: "shopping-bargaining",
    targetLevel: "A2",
    goal: "Comprar um presente de aniversário dentro de um orçamento.",
    setting: "Loja de decoração na Rua Augusta, Lisboa.",
    roles: {
      learner: "Cliente com um orçamento de 30 € para um presente.",
      teacher: "Vendedor a sugerir opções.",
    },
    preTask:
      "Prepara o orçamento, a pessoa destinatária (idade, gosto), e a ocasião.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o orçamento de forma clara.",
      "O Learner descreve o destinatário para obter sugestões.",
      "O Learner pergunta sobre embrulho antes de pagar.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-shopping-9-troca-defeito",
    unitId: "b1-2-servicos",
    category: "shopping-bargaining",
    targetLevel: "B1",
    goal: "Trocar um artigo com defeito por outro igual ou reembolso.",
    setting: "Loja de electrónica no Centro Colombo, Lisboa.",
    roles: {
      learner: "Cliente a descobrir um defeito no terceiro dia de uso.",
      teacher: "Gerente da loja a avaliar a situação.",
    },
    preTask:
      "Prepara a reclamação: o que tem de errado, desde quando, e o que esperas (troca ou reembolso).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica o defeito com clareza.",
      "O Learner apresenta a garantia ou recibo.",
      "O Learner negoceia troca ou reembolso com cortesia.",
    ],
    passingScore: 0.7,
  }),

  // ---------- directions (3 → 10) ----------
  scenario({
    id: "s-directions-4-estacao-comboio",
    unitId: "a1-1-viagens",
    category: "directions",
    targetLevel: "A1",
    goal: "Pedir direções para a estação de comboios mais próxima.",
    setting: "Praça central de Coimbra, início da tarde.",
    roles: {
      learner: "Turista com mapa na mão.",
      teacher: "Transeunte simpático a indicar o caminho.",
    },
    preTask:
      "Prepara a pergunta: ponto de referência conhecido e modo de transporte preferencial (a pé, táxi, autocarro).",
    expectedTurns: 3,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o destino claramente.",
      "O Learner repete ou confirma a direção.",
      "O Learner agradece ao transeunte.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-directions-5-seguir-instrucoes-transeunte",
    unitId: "a1-1-viagens",
    category: "directions",
    targetLevel: "A1",
    goal: "Seguir instruções detalhadas de um transeunte para chegar a um destino.",
    setting: "Bairro de Alfama, Lisboa.",
    roles: {
      learner: "Turista perdido depois de uma indicação.",
      teacher: "Senhora local paciente a dar detalhes.",
    },
    preTask:
      "Prepara como pedir clarificações se não percebes um termo (à esquerda, em frente, virar).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner confirma cada passo (à esquerda, em frente).",
      "O Learner pede clarificação quando uma indicação não é clara.",
      "O Learner agradece no fim.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-directions-6-autocarro-metro-destino",
    unitId: "a2-2-viagens-saude",
    category: "directions",
    targetLevel: "A2",
    goal: "Perguntar qual o autocarro ou metro para um destino e quanto tempo demora.",
    setting: "Estação de metro do Marquês, Lisboa.",
    roles: {
      learner: "Visitante a planear uma viagem ao centro comercial Colombo.",
      teacher: "Funcionário da estação de metro.",
    },
    preTask:
      "Prepara a pergunta: destino, preferência (mais rápido ou mais barato), e hora desejada.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o destino e o tipo de transporte preferencial.",
      "O Learner pergunta a duração e o preço.",
      "O Learner agradece e despede-se.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-directions-7-taxi-endereco",
    unitId: "a1-1-viagens",
    category: "directions",
    targetLevel: "A1",
    goal: "Dar um endereço a um taxista de forma clara.",
    setting: "Paragem de táxis do aeroporto de Lisboa.",
    roles: {
      learner: "Turista a indicar o destino.",
      teacher: "Taxista a confirmar a rota.",
    },
    preTask:
      "Prepara o endereço completo: rua, número, código postal, e ponto de referência.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica a rua e o número.",
      "O Learner acrescenta um ponto de referência se necessário.",
      "O Learner confirma a rota e o tempo estimado.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-directions-8-cidade-desconhecida-mapa",
    unitId: "a2-2-viagens-saude",
    category: "directions",
    targetLevel: "A2",
    goal: "Encontrar a tua posição num mapa e pedir direções para um ponto de interesse.",
    setting: "Centro histórico do Porto, mapa na mão.",
    roles: {
      learner: "Visitante a tentar chegar a uma livraria famosa.",
      teacher: "Local a olhar o mapa e a indicar o caminho.",
    },
    preTask:
      "Prepara como mostrar o mapa e descrever o ponto de interesse em termos gerais.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner mostra onde está no mapa.",
      "O Learner descreve o destino por categoria (livraria, museu, restaurante).",
      "O Learner repete a direção em voz alta.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-directions-9-explicar-caminho-zona-desconhecida",
    unitId: "b1-2-servicos",
    category: "directions",
    targetLevel: "B1",
    goal: "Explicar o caminho para alguém numa zona que tu conheces bem mas ele não.",
    setting: "Rua típica de Coimbra, perto da Universidade.",
    roles: {
      learner: "Residente local a explicar o caminho.",
      teacher: "Visitante com um destino específico.",
    },
    preTask:
      "Prepara como articular: pontos de referência visíveis, ruas principais, e opções alternativas.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner usa pontos de referência visíveis.",
      "O Learner oferece uma alternativa se o caminho principal não for claro.",
      "O Learner confirma que o visitante percebeu.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-directions-10-pedir-emergencia-ambulancia",
    unitId: "a2-2-viagens-saude",
    category: "directions",
    targetLevel: "A2",
    goal: "Dar indicações claras para uma emergência e pedir uma ambulância.",
    setting: "Rua de Lisboa, situação de emergência.",
    roles: {
      learner: "Transeunte a reportar uma emergência.",
      teacher: "Operador de emergência 112.",
    },
    preTask:
      "Prepara o essencial: localização exacta (rua, número, ponto de referência), tipo de emergência, e número de pessoas envolvidas.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica a localização de forma exacta.",
      "O Learner descreve a emergência claramente.",
      "O Learner responde a perguntas de follow-up sem hesitar.",
    ],
    passingScore: 0.7,
  }),

  // ---------- doctor (3 → 9) ----------
  scenario({
    id: "s-doctor-4-marcar-consulta-geral",
    unitId: "a1-1-viagens",
    category: "doctor",
    targetLevel: "A1",
    goal: "Marcar uma consulta de medicina geral e descrever o motivo.",
    setting: "Receção de um centro de saúde em Lisboa.",
    roles: {
      learner: "Utente a marcar a primeira consulta.",
      teacher: "Rececionista a verificar disponibilidade.",
    },
    preTask:
      "Prepara: nome completo, número de utente (se tens), preferência de dia, e motivo da consulta.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o nome e o número de utente.",
      "O Learner indica a preferência de dia ou período.",
      "O Learner descreve brevemente o motivo.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-doctor-5-descrever-sintomas-simples",
    unitId: "a1-1-viagens",
    category: "doctor",
    targetLevel: "A1",
    goal: "Descrever sintomas simples ao médico e responder a perguntas.",
    setting: "Consultório de clínica geral em Coimbra.",
    roles: {
      learner: "Paciente com gripe sazonal.",
      teacher: "Médico a fazer perguntas de rotina.",
    },
    preTask:
      "Prepara: sintomas (febre, tosse, dor de cabeça), desde quando, e medicação que já tomaste.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner descreve pelo menos três sintomas.",
      "O Learner indica a duração dos sintomas.",
      "O Learner confirma ou nega a toma de medicação prévia.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-doctor-6-comprar-medicamento-farmacia",
    unitId: "a1-1-viagens",
    category: "doctor",
    targetLevel: "A1",
    goal: "Comprar um medicamento na farmácia e perguntar a posologia.",
    setting: "Balcão de farmácia em Sintra.",
    roles: {
      learner: "Cliente com uma receita para um antibiótico.",
      teacher: "Farmacêutico a explicar a toma.",
    },
    preTask:
      "Prepara: o nome do medicamento, a receita, e perguntas sobre como tomar (com comida, quantas vezes por dia).",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta a receita ou pede o medicamento pelo nome.",
      "O Learner pergunta a frequência da toma.",
      "O Learner pergunta sobre efeitos secundários ou interações.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-doctor-7-explicar-alergia-medica",
    unitId: "a2-2-viagens-saude",
    category: "doctor",
    targetLevel: "A2",
    goal: "Explicar uma alergia medicamentosa grave a um novo médico.",
    setting: "Consulta de especialidade em Lisboa.",
    roles: {
      learner: "Paciente a explicar uma reacção alérgica passada.",
      teacher: "Médico a registar a alergia.",
    },
    preTask:
      "Prepara: o medicamento, o tipo de reacção (erupção, dificuldade em respirar), quando aconteceu, e o tratamento recebido.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner nomeia o medicamento.",
      "O Learner descreve a reacção e a sua gravidade.",
      "O Learner indica o tratamento recebido.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-doctor-8-seguir-recomendacoes-medicas",
    unitId: "a2-2-viagens-saude",
    category: "doctor",
    targetLevel: "A2",
    goal: "Pedir clarificação sobre uma recomendação médica e o plano de follow-up.",
    setting: "Fim de uma consulta em Lisboa.",
    roles: {
      learner: "Paciente a pedir detalhes sobre a medicação e o seguimento.",
      teacher: "Médico a explicar a receita e os exames marcados.",
    },
    preTask:
      "Prepara perguntas específicas: duração do tratamento, quando voltar, sinais de alerta.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pergunta a duração do tratamento.",
      "O Learner confirma a marcação de follow-up.",
      "O Learner pergunta sobre sinais de alerta que justifiquem ida às urgências.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-doctor-9-exames-resultados",
    unitId: "b1-2-servicos",
    category: "doctor",
    targetLevel: "B1",
    goal: "Discutir resultados de exames com o médico e decidir próximos passos.",
    setting: "Consulta de retorno em Lisboa.",
    roles: {
      learner: "Paciente com resultados de análises que não percebe.",
      teacher: "Médico a explicar os valores e as implicações.",
    },
    preTask:
      "Prepara: os exames que fizeste, perguntas sobre valores anormais, e como ajustar o estilo de vida.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pede explicação dos valores fora do normal.",
      "O Learner pergunta sobre mudanças no estilo de vida.",
      "O Learner confirma o plano (medicação, follow-up, próximo exame).",
    ],
    passingScore: 0.7,
  }),

  // ---------- bank-post-office (2 → 8) ----------
  scenario({
    id: "s-bank-3-abrir-conta-bancaria",
    unitId: "a2-1-rotina-trabalho",
    category: "bank-post-office",
    targetLevel: "A2",
    goal: "Perguntar sobre a abertura de conta e os documentos necessários.",
    setting: "Balcão de um banco em Lisboa.",
    roles: {
      learner: "Recém-chegado a abrir a primeira conta em Portugal.",
      teacher: "Gerente bancário a explicar o processo.",
    },
    preTask:
      "Prepara: tipo de conta que queres (ordenado, poupança), documentos que tens (passaporte, NIF), e perguntas sobre custos mensais.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner pergunta sobre os tipos de conta.",
      "O Learner indica os documentos que tem disponíveis.",
      "O Learner pergunta sobre comissões e custos mensais.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-bank-4-usar-multibanco",
    unitId: "a1-1-viagens",
    category: "bank-post-office",
    targetLevel: "A1",
    goal: "Pedir ajuda para usar o Multibanco e levantar dinheiro.",
    setting: "Caixa Multibanco na rua, Lisboa.",
    roles: {
      learner: "Turista com cartão estrangeiro.",
      teacher: "Transeunte local a explicar como funciona.",
    },
    preTask:
      "Prepara: que operação queres fazer (levantar, transferir), e quanto dinheiro.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica o que quer fazer.",
      "O Learner segue as instruções do transeunte.",
      "O Learner recolhe o cartão e o dinheiro.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-bank-5-pagar-fornecedor-multibanco",
    unitId: "a2-1-rotina-trabalho",
    category: "bank-post-office",
    targetLevel: "A2",
    goal: "Pagar uma factura de serviço (água, electricidade) por Multibanco.",
    setting: "Multibanco numa estação de correios em Sintra.",
    roles: {
      learner: "Cliente a pagar uma factura.",
      teacher: "Atendente dos CTT a explicar o processo.",
    },
    preTask:
      "Prepara: a factura com a entidade, referência e valor; cartão Multibanco; e PIN.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica a factura a pagar (entidade, referência).",
      "O Learner confirma o valor.",
      "O Learner recolhe o recibo.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-bank-6-enviar-encomenda-ctt",
    unitId: "b1-2-servicos",
    category: "bank-post-office",
    targetLevel: "B1",
    goal: "Enviar uma encomenda internacional nos CTT com seguro.",
    setting: "Balcão dos CTT em Coimbra.",
    roles: {
      learner: "Cliente a enviar uma encomenda para um país europeu.",
      teacher: "Atendente a explicar as opções.",
    },
    preTask:
      "Prepara: destino, peso aproximado, valor declarado, e forma de envio (expressa ou normal).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica destino e peso.",
      "O Learner pergunta sobre seguro e prazo de entrega.",
      "O Learner paga e guarda o recibo.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-bank-7-levantamento-sem-cartão",
    unitId: "a2-1-rotina-trabalho",
    category: "bank-post-office",
    targetLevel: "A2",
    goal: "Pedir um levantamento sem cartão multibanco no balcão do banco.",
    setting: "Balcão de um banco em Lisboa, cartão perdido.",
    roles: {
      learner: "Cliente sem cartão multibanco a precisar de dinheiro.",
      teacher: "Funcionário do balcão a verificar identidade.",
    },
    preTask:
      "Prepara: documento de identificação, número da conta, e o valor que precisas levantar.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta identificação válida.",
      "O Learner indica o número da conta.",
      "O Learner indica o valor e confirma o levantamento.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-bank-8-credito-habitacao",
    unitId: "b1-2-servicos",
    category: "bank-post-office",
    targetLevel: "B1",
    goal: "Pedir uma reunião sobre crédito à habitação e preparar perguntas.",
    setting: "Agência bancária em Lisboa.",
    roles: {
      learner: "Cliente a comprar primeira casa, a preparar uma reunião.",
      teacher: "Gestor de cliente a explicar o produto.",
    },
    preTask:
      "Prepara: valor do imóvel, entrada, prazo desejado, e perguntas sobre taxa fixa vs variável.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o cenário financeiro (valor, entrada).",
      "O Learner pergunta sobre taxa fixa vs variável.",
      "O Learner pergunta sobre comissões e seguros obrigatórios.",
    ],
    passingScore: 0.7,
  }),

  // ---------- job-interview (2 → 9) ----------
  scenario({
    id: "s-job-3-responder-entrevista-primeiro-emprego",
    unitId: "b1-1-gastronomia",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Responder a perguntas típicas de uma entrevista de primeiro emprego.",
    setting: "Sala de reuniões de uma startup em Lisboa.",
    roles: {
      learner: "Candidato a um estágio.",
      teacher: "Recrutador a conduzir a entrevista.",
    },
    preTask:
      "Prepara três respostas: apresentação (30 segundos), ponto forte, e porque queres esta empresa.",
    expectedTurns: 8,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner faz uma apresentação clara e concisa.",
      "O Learner articula um ponto forte com um exemplo.",
      "O Learner pergunta algo inteligente sobre a empresa.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-4-negociar-salario-condicoes",
    unitId: "b1-1-gastronomia",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Negociar condições salariais e de início de funções.",
    setting: "Escritório do responsável de RH, Lisboa.",
    roles: {
      learner: "Candidato com uma oferta em mão.",
      teacher: "Responsável de RH a conduzir a negociação.",
    },
    preTask:
      "Prepara o teu salário mínimo aceitável, benefícios não-salariais (férias, formação), e data de início desejada.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o salário mínimo aceitável.",
      "O Learner propõe benefícios não-salariais.",
      "O Learner confirma a data de início ou propõe alternativa.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-5-explicar-experiencia-anterior",
    unitId: "a2-1-rotina-trabalho",
    category: "job-interview",
    targetLevel: "A2",
    goal: "Explicar a tua experiência anterior e porque queres mudar de área.",
    setting: "Entrevista para uma posição nova num sector diferente.",
    roles: {
      learner: "Candidato com 3 anos de experiência noutra área.",
      teacher: "Recrutador a questionar a mudança.",
    },
    preTask:
      "Prepara três marcos da tua carreira anterior e como te preparam para a nova função.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner resume a experiência anterior de forma clara.",
      "O Learner explica porque quer mudar de área.",
      "O Learner liga a experiência passada à nova função.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-6-falar-ponto-fraco",
    unitId: "b1-2-servicos",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Falar de um ponto fraco sem destruir a candidatura.",
    setting: "Entrevista para uma posição de gestão, Lisboa.",
    roles: {
      learner: "Candidato a uma posição de chefia.",
      teacher: "Recrutador a fazer perguntas difíceis.",
    },
    preTask:
      "Prepara um ponto fraco real e como o estás a trabalhar (formação, prática, mentoria).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner nomeia um ponto fraco verdadeiro.",
      "O Learner explica o que está a fazer para o melhorar.",
      "O Learner mantém-se positivo e orientado para a acção.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-7-trabalho-equipa-conflito",
    unitId: "b1-2-servicos",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Descrever como resolveste um conflito numa equipa de trabalho.",
    setting: "Entrevista para uma posição de gestão de projectos.",
    roles: {
      learner: "Candidato a explicar uma situação de conflito.",
      teacher: "Recrutador a fazer perguntas comportamentais.",
    },
    preTask:
      "Prepara uma situação concreta: o conflito, o teu papel, as acções, e o resultado.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner descreve a situação de forma concisa.",
      "O Learner identifica o seu papel e o dos outros.",
      "O Learner explica o resultado e o que aprendeu.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-8-entrevista-remoto-videoconferencia",
    unitId: "b1-2-servicos",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Conduzir uma entrevista de emprego por videochamada com profissionalismo.",
    setting: "Videochamada entre Lisboa e Berlim, primeiro round.",
    roles: {
      learner: "Candidato numa entrevista remota.",
      teacher: "Recrutador a conduzir a entrevista à distância.",
    },
    preTask:
      "Prepara: fundo neutro, iluminação, áudio testado, e respostas para perguntas técnicas.",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner cumprimenta de forma profissional no início.",
      "O Learner responde a perguntas técnicas com detalhe.",
      "O Learner pergunta sobre o próximo passo.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-job-9-carta-motivacao",
    unitId: "b1-2-servicos",
    category: "job-interview",
    targetLevel: "B1",
    goal: "Apresentar uma carta de motivação e falar dela numa entrevista.",
    setting: "Entrevista presencial em Coimbra.",
    roles: {
      learner: "Candidato a explicar a sua carta de motivação.",
      teacher: "Recrutador a aprofundar o que escreveu.",
    },
    preTask:
      "Prepara os três pilares da tua carta: porque esta empresa, porque esta função, e o que trazes de único.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica porque esta empresa em particular.",
      "O Learner explica porque esta função.",
      "O Learner articula o que traz de único.",
    ],
    passingScore: 0.7,
  }),

  // ---------- travelling (4 → 11) ----------
  scenario({
    id: "s-travel-5-check-in-aeroporto-bagagem",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Fazer check-in no balcão do aeroporto e despachar uma mala.",
    setting: "Balcão de check-in no aeroporto de Lisboa.",
    roles: {
      learner: "Passageiro a fazer check-in.",
      teacher: "Funcionário da companhia aérea.",
    },
    preTask:
      "Prepara: passaporte, reserva, e decisão sobre bagagem de porão (sim/não).",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta o passaporte e a reserva.",
      "O Learner confirma a bagagem de porão.",
      "O Learner escolhe o lugar ou aceita a atribuição.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-6-taxi-aeroporto-hotel",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Apanhar um táxi do aeroporto até ao hotel.",
    setting: "Paragem de táxis do aeroporto de Faro.",
    roles: {
      learner: "Turista a indicar o hotel.",
      teacher: "Taxista a perguntar o destino.",
    },
    preTask:
      "Prepara: nome do hotel, endereço (se souberes), e preferência (rota mais rápida vs mais barata).",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o hotel ou o destino.",
      "O Learner confirma a tarifa antes de iniciar a viagem.",
      "O Learner paga ou pergunta como pagar.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-7-checkin-hotel-pernoite",
    unitId: "a1-1-viagens",
    category: "travelling",
    targetLevel: "A1",
    goal: "Fazer check-in num hotel e perguntar sobre pequeno-almoço e wifi.",
    setting: "Receção de um hotel em Cascais.",
    roles: {
      learner: "Hóspede a fazer check-in.",
      teacher: "Rececionista do hotel.",
    },
    preTask:
      "Prepara: nome da reserva, tipo de quarto, e perguntas sobre pequeno-almoço, wifi, e hora de check-out.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta a reserva.",
      "O Learner pergunta sobre pequeno-almoço e wifi.",
      "O Learner confirma a hora de check-out.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-travel-8-perder-comboio-reorganizar",
    unitId: "a2-2-viagens-saude",
    category: "travelling",
    targetLevel: "A2",
    goal: "Pedir ajuda depois de perder o comboio e reorganizar a viagem.",
    setting: "Bilheteira de uma estação de comboios em Portugal.",
    roles: {
      learner: "Passageiro a perder o último comboio do dia.",
      teacher: "Funcionário da bilheteira a verificar opções.",
    },
    preTask:
      "Prepara: a tua rota original, a tua flexibilidade de tempo, e o teu orçamento para alternativa (autocarro, táxi).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner explica a situação (comboio perdido, nova rota).",
      "O Learner pergunta sobre alternativas (próximo comboio, autocarro).",
      "O Learner decide e paga a nova opção.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-travel-9-alugar-carro-balcao",
    unitId: "a2-2-viagens-saude",
    category: "travelling",
    targetLevel: "A2",
    goal: "Alugar um carro no balcão de uma agência, incluindo seguro e extras.",
    setting: "Balcão de aluguer de carros no aeroporto de Lisboa.",
    roles: {
      learner: "Cliente a alugar um carro para uma semana.",
      teacher: "Funcionário da agência a explicar opções.",
    },
    preTask:
      "Prepara: tipo de carro (compacto, SUV), número de dias, e perguntas sobre seguro, GPS, e segundo condutor.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o tipo de carro e a duração.",
      "O Learner pergunta sobre cobertura de seguro.",
      "O Learner aceita ou recusa extras (GPS, segundo condutor).",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-travel-10-reclamar-bagagem-extraviada",
    unitId: "b1-2-servicos",
    category: "travelling",
    targetLevel: "B1",
    goal: "Reportar uma mala extraviada no balcão de reclamações do aeroporto.",
    setting: "Balcão de bagagens perdidas no aeroporto de Lisboa.",
    roles: {
      learner: "Passageiro cuja mala não apareceu na cinta.",
      teacher: "Funcionário do balcão a registar o caso.",
    },
    preTask:
      "Prepara: o cartão de embarque, a descrição da mala (cor, tamanho, marca), e o conteúdo essencial.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner apresenta o cartão de embarque.",
      "O Learner descreve a mala com detalhe suficiente.",
      "O Learner pergunta sobre o prazo de entrega e como será contactado.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-travel-11-imigração-fronteira-aerea",
    unitId: "b1-2-servicos",
    category: "travelling",
    targetLevel: "B1",
    goal: "Responder a perguntas de um agente de imigração na chegada a Portugal.",
    setting: "Controlo de passaportes no aeroporto de Lisboa.",
    roles: {
      learner: "Viajante internacional na fila de imigração.",
      teacher: "Agente de fronteira português.",
    },
    preTask:
      "Prepara: propósito da visita (turismo, trabalho), duração da estadia, onde vais ficar, e quanto dinheiro trazes.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica o propósito da visita.",
      "O Learner indica a duração da estadia e o alojamento.",
      "O Learner responde a perguntas sobre fundos de forma tranquilizadora.",
    ],
    passingScore: 0.7,
  }),

  // ---------- social-plans (2 → 10) ----------
  scenario({
    id: "s-social-3-propor-plano-fim-de-semana",
    unitId: "a1-2-alimentacao",
    category: "social-plans",
    targetLevel: "A1",
    goal: "Propor e combinar um plano para o fim de semana.",
    setting: "Conversa entre amigos num café em Lisboa.",
    roles: {
      learner: "Pessoa a propor um plano.",
      teacher: "Amigo a reagir e a combinar.",
    },
    preTask:
      "Prepara uma sugestão: o quê (passeio, jantar, filme), quando (sábado, domingo), e onde.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner propõe uma actividade concreta.",
      "O Learner sugere um dia e uma hora.",
      "O Learner confirma o plano final.",
    ],
    passingScore: 0.6,
  }),

  scenario({
    id: "s-social-4-organizar-jantar-aniversario",
    unitId: "b1-2-servicos",
    category: "social-plans",
    targetLevel: "B1",
    goal: "Organizar um jantar de aniversário e convidar amigos por telefone.",
    setting: "Conversa por telefone com um amigo próximo.",
    roles: {
      learner: "Anfitrião a organizar o jantar.",
      teacher: "Amigo convidado a confirmar.",
    },
    preTask:
      "Prepara: data, hora, local (casa ou restaurante), número de convidados, e contribuição esperada (prato, bebida, dinheiro).",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner indica data, hora e local.",
      "O Learner explica o tipo de contribuição esperada.",
      "O Learner confirma o convidado e pergunta restrições alimentares.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-5-recusar-convite-amigavelmente",
    unitId: "a2-1-rotina-trabalho",
    category: "social-plans",
    targetLevel: "A2",
    goal: "Recusar um convite social de forma amigável sem fechar portas.",
    setting: "Conversa por telefone com um amigo que te convidou para um evento.",
    roles: {
      learner: "Pessoa a recusar com elegância.",
      teacher: "Amigo a insistir e depois aceitar.",
    },
    preTask:
      "Prepara uma razão verdadeira (cansaço, outro compromisso), uma alternativa (próxima semana), e mantém o tom caloroso.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner agradece o convite antes de recusar.",
      "O Learner dá uma razão breve e verdadeira.",
      "O Learner propõe uma alternativa.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-6-convidar-parte-desconhecida",
    unitId: "b1-1-gastronomia",
    category: "social-plans",
    targetLevel: "B1",
    goal: "Convidar uma pessoa que conheceste recentemente para um evento social sem parecer intrusivo.",
    setting: "Café, depois de uma conversa interessante com alguém que conheceste num evento profissional.",
    roles: {
      learner: "Pessoa a convidar uma nova conhecida.",
      teacher: "Convidada a reagir e a decidir.",
    },
    preTask:
      "Prepara uma abordagem suave: elogia a conversa anterior, propõe um encontro de grupo (mais leve que um jantar a dois), e respeita um 'não'.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner elogia a conversa anterior.",
      "O Learner propõe um encontro de grupo leve.",
      "O Learner aceita a decisão da outra pessoa sem pressão.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-7-despedir-se-grupo-noite",
    unitId: "a2-1-rotina-trabalho",
    category: "social-plans",
    targetLevel: "A2",
    goal: "Despedir-se de um grupo de pessoas no fim de uma noite social.",
    setting: "Saída de um bar em Lisboa, fim de noite.",
    roles: {
      learner: "Pessoa a despedir-se do grupo.",
      teacher: "Vários amigos do grupo a reagir.",
    },
    preTask:
      "Prepara uma despedida calorosa mas breve: agradecimento pelo convite, planos vagos para a próxima, e um abraço ou aperto de mão adequado.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner despede-se de cada pessoa pelo nome.",
      "O Learner menciona o próximo encontro (vago, sem pressão).",
      "O Learner mantém o tom caloroso.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-8-organizar-grupo-estudo",
    unitId: "b1-2-servicos",
    category: "social-plans",
    targetLevel: "B1",
    goal: "Organizar um grupo de estudo regular com colegas de curso.",
    setting: "Mensagem de grupo numa aplicação de chat.",
    roles: {
      learner: "Pessoa a coordenar o grupo.",
      teacher: "Três colegas a reagir e a propor alternativas.",
    },
    preTask:
      "Prepara: dia, hora, local (biblioteca, café), e frequência (semanal, quinzenal).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner propõe um horário concreto.",
      "O Learner responde às alternativas dos colegas.",
      "O Learner confirma o primeiro encontro.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-9-despedir-grupo-praia",
    unitId: "a1-1-viagens",
    category: "social-plans",
    targetLevel: "A1",
    goal: "Combinar um dia de praia com um grupo de amigos e combinar logística.",
    setting: "Mensagem de grupo, Lisboa, sexta à noite.",
    roles: {
      learner: "Pessoa a organizar o encontro.",
      teacher: "Três amigos a reagir e a combinar.",
    },
    preTask:
      "Prepara: dia, praia (Cascais, Caparica, Guincho), quem leva o quê (comida, toalha, bola).",
    expectedTurns: 7,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner propõe o dia e a praia.",
      "O Learner distribui tarefas (comida, bebida, transporte).",
      "O Learner confirma o ponto de encontro e a hora.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-social-10-fazer-amizade-cafe",
    unitId: "a2-1-rotina-trabalho",
    category: "social-plans",
    targetLevel: "A2",
    goal: "Estabelecer uma nova amizade num café depois de uma primeira conversa.",
    setting: "Mesa de um café em Lisboa, fim de tarde.",
    roles: {
      learner: "Pessoa a aprofundar uma conversa recente.",
      teacher: "Conhecido recente a reagir.",
    },
    preTask:
      "Prepara: pergunta aberta sobre um interesse partilhado, sugestão de continuar a conversa, e troca de contactos.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner faz uma pergunta aberta sobre um interesse.",
      "O Learner propõe um próximo encontro concreto.",
      "O Learner troca contactos (email, telemóvel) de forma natural.",
    ],
    passingScore: 0.7,
  }),

  // ---------- cultural-norms (2 → 10) — Lisbon/Porto focus per acceptance ----------
  scenario({
    id: "s-cultural-3-cumprimento-social-portugues",
    unitId: "b1-1-gastronomia",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Reagir de forma adequada a um cumprimento social português (dois beijinhos, aperto de mão, ou saudação verbal).",
    setting: "Receção numa casa portuguesa, apresentação de um amigo.",
    roles: {
      learner: "Convidado estrangeiro a reagir ao cumprimento.",
      teacher: "Anfitrião português a cumprimentar.",
    },
    preTask:
      "Prepara: observação do estilo do anfitrião (beijinho vs. aperto de mão), reciprocidade, e resposta verbal calorosa.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner observa e imita o estilo do anfitrião.",
      "O Learner devolve o cumprimento de forma adequada.",
      "O Learner responde com uma saudação verbal calorosa.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-4-pontualidade-jantar-lisboa",
    unitId: "b1-1-gastronomia",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Comentar de forma diplomática a pontualidade portuguesa num jantar em Lisboa.",
    setting: "Jantar em casa de amigos portugueses, 20 minutos depois da hora marcada.",
    roles: {
      learner: "Convidado estrangeiro a reagir ao atraso dos anfitriões.",
      teacher: "Anfitrião a desculpar-se pelo atraso.",
    },
    preTask:
      "Prepara: como reagir com bom humor sem julgamento, perguntar como ajudar, e mostrar que não há problema.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner reage com bom humor ou leveza ao atraso.",
      "O Learner oferece-se para ajudar sem ser insistente.",
      "O Learner mostra que está confortável e não magoado.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-5-confraternizacao-pao-queijo",
    unitId: "a2-1-rotina-trabalho",
    category: "cultural-norms",
    targetLevel: "A2",
    goal: "Aceitar e oferecer comida típica portuguesa durante uma visita social (pastéis de nata, queijo, bolinhos).",
    setting: "Sala de estar de uma casa em Sintra, visita informal.",
    roles: {
      learner: "Convidado a aceitar e oferecer comida.",
      teacher: "Anfitriã portuguesa a insistir.",
    },
    preTask:
      "Prepara como aceitar com um 'obrigado, sim por favor', como recusar gentilmente se não quiseres mais, e como elogiar a comida.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner aceita pelo menos uma vez com entusiasmo.",
      "O Learner elogia a comida ou a anfitriã.",
      "O Learner sabe recusar gentilmente quando já não quer.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-6-fado-lisboa-clube",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Comentar uma actuação de fado num clube de Lisboa com entendimento cultural.",
    setting: "Clube de fado em Alfama, depois de uma actuação.",
    roles: {
      learner: "Convidado estrangeiro a comentar o espectáculo.",
      teacher: "Anfitrião português conhecedor da tradição.",
    },
    preTask:
      "Prepara: o que é o fado (música portuguesa, melancolia, saudade), porque é importante, e como é a experiência.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner articula o que sentiu durante o espectáculo.",
      "O Learner demonstra alguma compreensão do género musical.",
      "O Learner agradece pela recomendação.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-7-vinho-do-porto-confraria",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Participar numa prova de vinhos do Porto com etiqueta adequada.",
    setting: "Adega em Vila Nova de Gaia, prova guiada.",
    roles: {
      learner: "Convidado a aprender sobre vinho do Porto.",
      teacher: "Guia da adega a explicar.",
    },
    preTask:
      "Prepara: tipos de vinho do Porto (tawny, ruby, vintage, branco), como servir e provar, e perguntas sobre a região.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner identifica pelo menos dois tipos de vinho do Porto.",
      "O Learner articula uma opinião sobre o sabor.",
      "O Learner pergunta sobre a história ou a região.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-8-conviver-mercado-bairro",
    unitId: "a2-1-rotina-trabalho",
    category: "cultural-norms",
    targetLevel: "A2",
    goal: "Convidar um vizinho português para café depois de o conhecer no mercado do bairro.",
    setting: "Mercado de bairro, Lisboa, sábado de manhã.",
    roles: {
      learner: "Vizinho novo no bairro a convidar.",
      teacher: "Vizinho português a reagir.",
    },
    preTask:
      "Prepara: elogia o bairro, identifica o café do bairro, e propõe um encontro curto.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner elogia o bairro de forma específica.",
      "O Learner propõe o café do bairro.",
      "O Learner marca um dia concreto.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-9-pasteis-belem-lisboa",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Conduzir um amigo a provar pastéis de Belém na loja histórica, com comentários cultos.",
    setting: "Fábrica dos Pastéis de Belém, Lisboa.",
    roles: {
      learner: "Residente a explicar a tradição.",
      teacher: "Visitante a provar pela primeira vez.",
    },
    preTask:
      "Prepara: a história da receita (convento dos Jerónimos, segredos), a forma tradicional de comer (com canela e açúcar em pó), e o contraste com os pastéis de nata.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner conta a história dos pastéis com detalhe.",
      "O Learner explica a forma tradicional de comer.",
      "O Learner compara com outras versões portuguesas.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-10-queijo-porto-confraria",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Participar numa prova de queijos do Porto e identificar queijos típicos.",
    setting: "Queijaria tradicional no Porto.",
    roles: {
      learner: "Visitante a provar queijos regionais.",
      teacher: "Queijeira a explicar os produtos.",
    },
    preTask:
      "Prepara: queijos do Porto e do Norte (queijo da Serra da Estrela, Terrincho, Castelo Branco), como provar, e harmonização com vinho.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner identifica pelo menos três queijos diferentes.",
      "O Learner articula uma opinião sobre textura e sabor.",
      "O Learner pergunta sobre harmonização com vinho.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-11-comentar-pontualidade-amigo-porto",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Reagir com bom humor a um atraso de um amigo português sem magoar.",
    setting: "Café no Porto, 25 minutos depois da hora marcada.",
    roles: {
      learner: "Amigo estrangeiro à espera.",
      teacher: "Amigo português a chegar atrasado.",
    },
    preTask:
      "Prepara uma resposta leve que reconheça a norma cultural portuguesa sem magoar.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner reage com humor sem sarcasmo.",
      "O Learner pergunta pelo motivo do atraso de forma amigável.",
      "O Learner avança para a conversa sem ressentimento.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-12-explicar-tradicao-santos",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Explicar a tradição dos santos populares (Santo António, São João, São Pedro) a um amigo estrangeiro.",
    setting: "Jantar de amigos, Lisboa, junho.",
    roles: {
      learner: "Português a explicar a tradição.",
      teacher: "Estrangeiro curioso.",
    },
    preTask:
      "Prepara: os três santos (António em Lisboa, João no Porto, Pedro no Algarve), as datas (12, 13, 24 de junho), as tradições (sardinha, manjerico, casamentos improvisados).",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner identifica os três santos e as suas cidades.",
      "O Learner explica pelo menos duas tradições.",
      "O Learner convida o amigo para o próximo evento.",
    ],
    passingScore: 0.7,
  }),

  // ---------- 4 more to hit 100 total (cultural-norms boost) ----------
  scenario({
    id: "s-cultural-13-celebrar-natal-tradicoes",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Explicar as tradições de Natal em Portugal (Ceia, Missa do Galo, Bolo Rei) a um amigo estrangeiro.",
    setting: "Café em Lisboa, início de dezembro.",
    roles: {
      learner: "Português a explicar a tradição.",
      teacher: "Estrangeiro a perguntar.",
    },
    preTask:
      "Prepara: a Ceia de Natal (bacalhau, peru, rabanadas), a Missa do Galo, o Bolo Rei, e as diferenças com outros países.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner descreve a Ceia de Natal.",
      "O Learner explica a tradição da Missa do Galo.",
      "O Learner menciona o Bolo Rei e outros doces típicos.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-14-conviver-casa-portuguesa",
    unitId: "a2-1-rotina-trabalho",
    category: "cultural-norms",
    targetLevel: "A2",
    goal: "Visitar uma casa portuguesa pela primeira vez e reagir aos costumes (sapatos à porta, café após a refeição).",
    setting: "Entrada de uma casa portuguesa em Cascais.",
    roles: {
      learner: "Convidado estrangeiro a entrar na casa.",
      teacher: "Anfitrião português a receber.",
    },
    preTask:
      "Prepara: tirar os sapatos à porta, aceitar um café ou água, elogiar a casa, e mostrar interesse sem tocar em coisas.",
    expectedTurns: 5,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner tira os sapatos ao entrar (ou pergunta).",
      "O Learner aceita a hospitalidade (café, água, snack).",
      "O Learner elogia a casa e agradece o convite.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-15-falar-sobre-clima-convencionalismos",
    unitId: "a2-1-rotina-trabalho",
    category: "cultural-norms",
    targetLevel: "A2",
    goal: "Participar numa conversa sobre o clima (tópico de convenção social em Portugal) sem clichés.",
    setting: "Encontro social, Lisboa, sala de estar.",
    roles: {
      learner: "Convidado a participar na conversa.",
      teacher: "Português a puxar conversa sobre o tempo.",
    },
    preTask:
      "Prepara: como comentar o clima de forma específica (chuva em Lisboa, calor no Alentejo, nevoeiro na Serra), sem cair em clichés de turista.",
    expectedTurns: 4,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner comenta o clima com detalhe (região, estação).",
      "O Learner evita clichés de turista.",
      "O Learner faz uma comparação entre regiões ou países.",
    ],
    passingScore: 0.7,
  }),

  scenario({
    id: "s-cultural-16-aniversario-surpresa",
    unitId: "b1-2-servicos",
    category: "cultural-norms",
    targetLevel: "B1",
    goal: "Organizar uma festa de aniversário surpresa para um amigo português, conhecendo os costumes locais.",
    setting: "Casa do amigo em Lisboa, sábado à noite.",
    roles: {
      learner: "Amigo organizador da surpresa.",
      teacher: "Companheiro de organização a discutir o plano.",
    },
    preTask:
      "Prepara: o local (casa do próprio ou restaurante), lista de convidados (não esquecer ninguém), bolo (com padaria local), e o momento da surpresa.",
    expectedTurns: 6,
    vocabularyRefs: [],
    grammarRefs: [],
    remedialAnchorRefs: [],
    successCriteria: [
      "O Learner coordena a logística com os outros.",
      "O Learner confirma a lista de convidados.",
      "O Learner planeia o momento exacto da surpresa.",
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
