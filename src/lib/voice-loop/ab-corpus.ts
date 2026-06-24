import type { Level } from "@/lib/curriculum/types";

export type AbCorpusEntry = {
  id: string;
  learnerInput: string;
  notes: string;
};

export type AbCorpus = {
  targetLevel: Level;
  target: number;
  bandHalfWidth: number;
  entries: ReadonlyArray<AbCorpusEntry>;
};

export const A0_TO_A1_CORPUS: AbCorpus = {
  targetLevel: "A0",
  // i+1 target: at A0 the target sits a notch above zero so the harness can
  // see whether the chosen utterance clears the noise floor (pure A0 words
  // land at score 0; this target demands a small amount of i+1 stretch).
  target: 1.0,
  bandHalfWidth: 0.6,
  entries: buildEntries(),
};

export const A1_TO_A2_CORPUS: AbCorpus = {
  targetLevel: "A1",
  target: 1.5,
  bandHalfWidth: 0.6,
  entries: buildA1ToA2Entries(),
};

export const A2_TO_B1_CORPUS: AbCorpus = {
  targetLevel: "A2",
  target: 2.0,
  bandHalfWidth: 0.7,
  entries: buildA2ToB1Entries(),
};

export const ALL_AB_CORPORA: ReadonlyArray<AbCorpus> = [
  A0_TO_A1_CORPUS,
  A1_TO_A2_CORPUS,
  A2_TO_B1_CORPUS,
];

function buildEntries(): AbCorpusEntry[] {
  const greetings = [
    "olá",
    "bom dia",
    "boa tarde",
    "boa noite",
    "adeus",
    "até logo",
    "até amanhã",
    "como estás?",
    "como vai?",
    "tudo bem?",
  ];
  const introductions = [
    "chamo-me Ana",
    "sou o Pedro",
    "sou portuguesa",
    "sou brasileiro",
    "tenho vinte e cinco anos",
    "tenho trinta anos",
    "tenho dezassete anos",
    "moro em Lisboa",
    "moro no Porto",
    "sou de Faro",
  ];
  const politeness = [
    "obrigado",
    "obrigada",
    "muito obrigado",
    "de nada",
    "com licença",
    "desculpa",
    "desculpe",
    "por favor",
    "está bem",
    "muito bem",
  ];
  const cafe = [
    "um café, por favor",
    "um café e uma torrada",
    "queria um café",
    "uma água, se faz favor",
    "a conta, por favor",
    "quanto é?",
    "posso pagar com cartão?",
    "mais alguma coisa?",
    "com licença, o café",
    "está quente",
  ];
  const directions = [
    "onde é a farmácia?",
    "como vou para o centro?",
    "é longe?",
    "é perto?",
    "fica aqui perto",
    "vire à direita",
    "vire à esquerda",
    "siga em frente",
    "onde fica a estação?",
    "perto da praça",
  ];
  const family = [
    "tenho dois irmãos",
    "tenho uma irmã",
    "a minha mãe é professora",
    "o meu pai é médico",
    "sou casado",
    "sou solteira",
    "tenho um filho",
    "tenho uma filha",
    "a minha família é grande",
    "os meus avós vivem em Coimbra",
  ];
  const routine = [
    "acordo às sete",
    "tomo o pequeno-almoço",
    "vou para o trabalho",
    "almoço ao meio-dia",
    "janto às oito",
    "vou dormir às onze",
    "estudo português",
    "leio um livro",
    "ouço música",
    "vejo televisão",
  ];
  const numbers = [
    "um, dois, três",
    "quantos anos tens?",
    "tenho cinco anos",
    "são sete euros",
    "duas pessoas, por favor",
    "três cafés",
    "quatro amigos",
    "dez minutos",
    "cento e vinte",
    "mil euros",
  ];
  const colors = [
    "o céu é azul",
    "a relva é verde",
    "o sol é amarelo",
    "a noite é escura",
    "o carro é vermelho",
    "a casa é branca",
    "o gato é preto",
    "a flor é rosa",
    "o mar é azul",
    "a árvore é verde",
  ];
  const misc = [
    "hoje chove",
    "está sol",
    "está frio",
    "está calor",
    "está vento",
    "ontem fui à praia",
    "amanhã vou ao cinema",
    "gosto de chocolate",
    "não gosto de café",
    "quero aprender português",
  ];

  return [
    ...greetings.map(label("greeting")),
    ...introductions.map(label("introduction")),
    ...politeness.map(label("politeness")),
    ...cafe.map(label("cafe")),
    ...directions.map(label("directions")),
    ...family.map(label("family")),
    ...routine.map(label("routine")),
    ...numbers.map(label("numbers")),
    ...colors.map(label("colors")),
    ...misc.map(label("misc")),
  ];
}

function buildA1ToA2Entries(): AbCorpusEntry[] {
  const pastTense = [
    "ontem fui ao cinema",
    "comprámos o bilhete ontem",
    "viajámos para o Algarve em Junho",
    "almocei com a minha irmã",
    "jantámos num restaurante em Lisboa",
    "estudei português durante três meses",
    "trabalhei numa empresa no Porto",
    "visitei Sintra no fim de semana",
    "conheci a família dele em Coimbra",
    "recebi uma carta da mãe",
  ];
  const opinions = [
    "gostava de viver em Lisboa",
    "queria aprender mais português",
    "achava que era difícil",
    "preferia ficar em casa",
    "podia ter ido sozinho",
    "devia ter dito a verdade",
    "tinha medo de falar",
    "tinha vergonha de errar",
    "estava contente com o resultado",
    "estava triste por ter partido",
  ];
  const shopping = [
    "comprei uma camisola nova",
    "esta saia custou vinte euros",
    "posso experimentar?",
    "tem outro tamanho?",
    "queria devolver esta peça",
    "aceitam cartão de crédito?",
    "o preço está bem?",
    "posso pagar em dinheiro?",
    "há desconto para estudantes?",
    "a loja fecha às sete",
  ];
  const travel = [
    "perdi o comboio das oito",
    "qual é o próximo?",
    "onde fica a estação?",
    "comprei o bilhete online",
    "posso levar esta mala?",
    "o voo atrasou duas horas",
    "reservei um quarto duplo",
    "a que horas sai o autocarro?",
    "este lugar é muito bonito",
    "estou a adorar Portugal",
  ];
  const appointments = [
    "marquei uma consulta para terça",
    "o médico recebe às dez",
    "preciso de uma receita",
    "posso levantar a medicação?",
    "tenho alergia a frutos secos",
    "estou com febre desde ontem",
    "a dor passou com o remédio",
    "devo voltar na próxima semana",
    "o dentista está disponível?",
    "queria desmarcar a consulta",
  ];
  const weather = [
    "ontem choveu o dia todo",
    "hoje está sol",
    "amanhã vai estar nublado",
    "fazia muito frio em Janeiro",
    "este Verão foi quente",
    "não gosto da chuva",
    "prefiro o calor",
    "a temperatura baixou",
    "caiu granizo na sexta",
    "houve uma tempestade",
  ];
  const familyRoutines = [
    "vivo com os meus pais",
    "a minha irmã estuda em Coimbra",
    "o meu pai trabalha em Lisboa",
    "a minha mãe cozinha muito bem",
    "os meus avós vivem no campo",
    "tenho dois primos em Faro",
    "casámos em 2018",
    "temos um filho de três anos",
    "a família reúne-se ao domingo",
    "celebrámos o aniversário dele",
  ];
  const banking = [
    "fui ao banco levantar dinheiro",
    "usei o multibanco",
    "esqueci-me do pin",
    "o cartão foi bloqueado",
    "abri uma conta à ordem",
    "quero fazer uma transferência",
    "queria depositar este cheque",
    "o balcão fecha às quinze horas",
    "preciso de um extracto",
    "há uma comissão mensal",
  ];
  const culture = [
    "gosto de fado",
    "fui a um concerto de fado",
    "provámos pastéis de nata",
    "a comida portuguesa é deliciosa",
    "beijinhos são típicos em Portugal",
    "comemorámos o Santo António",
    "fui à festa dos Santos Populares",
    "conheci as Marchas Populares",
    "gosto de sardinhas assadas",
    "a arquitectura de Lisboa é linda",
  ];
  const misc = [
    "trabalhei como professor",
    "estudo engenharia",
    "vivo num apartamento T2",
    "aluguei uma casa no campo",
    "limpei a casa toda",
    "arrumei a roupa",
    "passei o aspirador",
    "fiz a cama de manhã",
    "tomei banho antes de sair",
    "deitei-me cedo ontem",
  ];

  return [
    ...pastTense.map(label("past-tense")),
    ...opinions.map(label("opinions")),
    ...shopping.map(label("shopping")),
    ...travel.map(label("travel")),
    ...appointments.map(label("appointments")),
    ...weather.map(label("weather")),
    ...familyRoutines.map(label("family")),
    ...banking.map(label("banking")),
    ...culture.map(label("culture")),
    ...misc.map(label("misc")),
  ];
}

function buildA2ToB1Entries(): AbCorpusEntry[] {
  const argumentation = [
    "embora estivesse cansada, continuei a estudar",
    "contudo, a situação mudou rapidamente",
    "porém, ninguém se manifestou",
    "todavia, era necessário actuar",
    "no entanto, a decisão foi adiada",
    "portanto, temos de reconsiderar",
    "logo, era evidente o problema",
    "assim, terminámos a reunião",
    "deste modo, resolvemos a questão",
    "além disso, faltam recursos",
  ];
  const opinionsAdvanced = [
    "na minha opinião, isso não é justo",
    "do meu ponto de vista, é aceitável",
    "concordo com a tua perspectiva",
    "discordo dessa afirmação",
    "tem razão nessa questão",
    "considero importante reflectir",
    "parece-me que vale a pena tentar",
    "espero que mude de ideias",
    "desejo-lhe boa sorte",
    "preocupa-me esta situação",
  ];
  const professional = [
    "fui chamado para uma entrevista",
    "enviei o currículo por email",
    "o ordenado é compatível com a função",
    "aceitei a proposta de emprego",
    "começo o estágio na próxima semana",
    "tenho benefícios de saúde",
    "o horário é flexível",
    "trabalhei em regime de teletrabalho",
    "a empresa oferece formação",
    "pedi uma carta de recomendação",
  ];
  const civic = [
    "votei nas últimas eleições",
    "paguei os impostos no prazo",
    "recebi uma multa de trânsito",
    "fui à conservatória tratar do bilhete de identidade",
    "tratei do passaporte no consulado",
    "inscrevi-me no centro de emprego",
    "candidatei-me a um programa social",
    "fiz voluntariado numa associação",
    "participei numa manifestação",
    "compareci na audiência do tribunal",
  ];
  const academic = [
    "elaborei um relatório sobre emigração",
    "defendi a tese perante o júri",
    "publiquei um artigo numa revista",
    "investiguei fontes primárias",
    "consultei o dicionário académico",
    "analisei dados estatísticos",
    "elaborei uma apresentação clara",
    "discuti os resultados com a equipa",
    "revisei a bibliografia recomendada",
    "concluí que a hipótese é válida",
  ];
  const cultural = [
    "a literatura portuguesa é riquíssima",
    "Fernando Pessoa é um poeta complexo",
    "Eça de Queirós critica a sociedade",
    "José Saramago ganhou o Nobel",
    "Amália Rodrigues é a rainha do fado",
    "a tradição dos Santos Populares mantém-se",
    "o fado foi património imaterial da humanidade",
    "as touradas são controversas",
    "o 25 de Abril mudou o país",
    "a Revolução dos Cravos é lembrada anualmente",
  ];
  const emotional = [
    "sinto-me muito feliz por estar aqui",
    "estou orgulhoso do meu progresso",
    "tenho saudades da minha terra",
    "fico preocupado quando não respondes",
    "andava ansioso antes da entrevista",
    "estou confiante no resultado",
    "não me sinto seguro com esta decisão",
    "estou desiludido com o serviço",
    "agradeço-lhe a ajuda prestada",
    "lamento profundamente o sucedido",
  ];
  const hypothetical = [
    "se tivesse mais tempo, viajava mais",
    "quando acabar o curso, procuro emprego",
    "caso chova, ficamos em casa",
    "embora pudesse ter ido, decidi ficar",
    "como se fosse a última vez, disfrutei",
    "ainda que duvidasse, tentei",
    "mesmo que discordasse, votei a favor",
    "apesar de ser difícil, consegui",
    "dada a circunstância, era impossível",
    "visto que todos concordaram, avançámos",
  ];
  const media = [
    "li uma notícia interessante no jornal",
    "vi um documentário sobre emigração",
    "ouvi uma entrevista na rádio",
    "assisti a um debate na televisão",
    "subscrevi um podcast sobre política",
    "partilhei o artigo nas redes sociais",
    "comentei a reportagem no fórum",
    "recebi uma newsletter diária",
    "seguo um canal de youtube educativo",
    "gravo vídeos sobre a língua portuguesa",
  ];
  const misc = [
    "consegui finalmente terminar o livro",
    "organizei o meu arquivo pessoal",
    "reformulei o orçamento familiar",
    "negoceiei um contrato mais favorável",
    "resolvi o problema com criatividade",
    "analisei as vantagens e desvantagens",
    "ponderei as várias alternativas",
    "considerei todas as hipóteses",
    "decidi avançar com o plano",
    "reconsiderei a minha posição",
  ];

  return [
    ...argumentation.map(label("argumentation")),
    ...opinionsAdvanced.map(label("opinions")),
    ...professional.map(label("professional")),
    ...civic.map(label("civic")),
    ...academic.map(label("academic")),
    ...cultural.map(label("culture")),
    ...emotional.map(label("emotional")),
    ...hypothetical.map(label("hypothetical")),
    ...media.map(label("media")),
    ...misc.map(label("misc")),
  ];
}

function label(category: string) {
  return (input: string, idx: number): AbCorpusEntry => ({
    id: `${category}-${String(idx + 1).padStart(2, "0")}`,
    learnerInput: input,
    notes: category,
  });
}