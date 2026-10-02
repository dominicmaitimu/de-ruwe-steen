export type QuestionCategory =
  | 'knowledge'
  | 'reading_check'
  | 'symbolism'
  | 'observation'
  | 'reflection'
  | 'application'
  | 'self_examination'
  | 'review'

export type JourneyPhase = {
  number: number
  name: string
  description: string
  startDay: number
  endDay: number
  learningGoal: string
}

export type JourneyQuestion = {
  id: string
  title: string
  question: string
  description?: string
  phase: number
  category: QuestionCategory
  difficulty: number
  tags: string[]
  minimumDay: number
  maximumDay: number
  repeatable: boolean
  source?: string
  sourceReference?: string
}

export const journeyContent = {
  categories: [
    { key: 'knowledge', name: 'Kennisvraag', description: 'Een vraag om begrippen of context te onderzoeken.' },
    { key: 'reading_check', name: 'Leesreflectie', description: 'Een controle op een bestudeerde bron of tekst.' },
    { key: 'symbolism', name: 'Symboliek', description: 'Een vraag over vorm, beeld en betekenis.' },
    { key: 'observation', name: 'Observatie', description: 'Een oefening in aandachtig waarnemen.' },
    { key: 'reflection', name: 'Reflectie', description: 'Een open vraag over de eigen ervaring.' },
    { key: 'application', name: 'Toepassing', description: 'Een vraag over het toepassen in het dagelijks leven.' },
    { key: 'self_examination', name: 'Zelfonderzoek', description: 'Een vraag om aannames en gewoonten te onderzoeken.' },
    { key: 'review', name: 'Terugblik', description: 'Een vraag om eerder werk opnieuw te bekijken.' },
  ] satisfies Array<{ key: QuestionCategory; name: string; description: string }>,
  phases: [
    {
      number: 1,
      name: 'De drempel',
      description: 'Oriëntatie, verwachtingen en eerste bewustwording.',
      startDay: 1,
      endDay: 30,
      learningGoal: 'Leerling worden en bewust beginnen.',
    },
    {
      number: 2,
      name: 'De symbolen',
      description: 'Symboliek, gereedschappen, licht en betekenis.',
      startDay: 31,
      endDay: 75,
      learningGoal: 'Leren kijken naar vorm en betekenis.',
    },
    {
      number: 3,
      name: 'De methode',
      description: 'Observeren, luisteren, zwijgen, vragen stellen en leren.',
      startDay: 76,
      endDay: 120,
      learningGoal: 'Aandachtiger waarnemen en onderzoeken.',
    },
    {
      number: 4,
      name: 'De ruwe steen',
      description: 'Zelfonderzoek, eigenschappen, gewoonten en principes.',
      startDay: 121,
      endDay: 170,
      learningGoal: 'Zicht krijgen op de eigen vorm.',
    },
    {
      number: 5,
      name: 'De verhouding',
      description: 'Broederschap, anderen, oordeel, verschillen en samenwerking.',
      startDay: 171,
      endDay: 215,
      learningGoal: 'De verhouding tot anderen onderzoeken.',
    },
    {
      number: 6,
      name: 'Het bouwwerk',
      description: 'Samenhang, traditie, loge en samenleving.',
      startDay: 216,
      endDay: 265,
      learningGoal: 'Het grotere verband leren zien.',
    },
    {
      number: 7,
      name: 'Het innerlijke werk',
      description: 'Overtuigingen, kaders, moraal, vrijheid en verantwoordelijkheid.',
      startDay: 266,
      endDay: 320,
      learningGoal: 'Eigen kaders en verantwoordelijkheid onderzoeken.',
    },
    {
      number: 8,
      name: 'De kubus',
      description: 'Integratie, terugblik en het voortzetten van het werk.',
      startDay: 321,
      endDay: 365,
      learningGoal: 'Ervaringen samenbrengen zonder een eindpunt te veinzen.',
    },
  ] satisfies JourneyPhase[],
  questions: [
    {
      id: 'threshold-expectation',
      title: 'De eerste verwachting',
      question:
        'Welke verwachting draag je mee deze reis in, en wat zegt dat over hoe je nu naar jezelf kijkt?',
      description: 'Een eerste verkenning voordat de reis inhoudelijk begint.',
      phase: 1,
      category: 'reflection',
      difficulty: 1,
      tags: ['verwachting', 'begin', 'zelfkennis'],
      minimumDay: 1,
      maximumDay: 30,
      repeatable: false,
    },
    {
      id: 'threshold-attention',
      title: 'Waar begint aandacht?',
      question: 'Waaraan merk je vandaag dat je werkelijk aandachtig aanwezig bent?',
      phase: 1,
      category: 'observation',
      difficulty: 1,
      tags: ['aandacht', 'aanwezigheid'],
      minimumDay: 1,
      maximumDay: 30,
      repeatable: false,
    },
    {
      id: 'symbols-form',
      title: 'Vorm en betekenis',
      question: 'Wanneer krijgt een symbool voor jou betekenis: door de vorm, de context of je eigen ervaring?',
      phase: 2,
      category: 'symbolism',
      difficulty: 2,
      tags: ['symboliek', 'betekenis', 'vorm'],
      minimumDay: 31,
      maximumDay: 75,
      repeatable: false,
    },
    {
      id: 'symbols-question',
      title: 'De kracht van een vraag',
      question: 'Welke vraag helpt je om een vertrouwd symbool opnieuw te bekijken?',
      phase: 2,
      category: 'reflection',
      difficulty: 2,
      tags: ['symboliek', 'vragen'],
      minimumDay: 31,
      maximumDay: 75,
      repeatable: false,
    },
    {
      id: 'method-listening',
      title: 'Luisteren zonder antwoord',
      question: 'Wat verandert er wanneer je eerst luistert en je antwoord nog even uitstelt?',
      phase: 3,
      category: 'observation',
      difficulty: 2,
      tags: ['luisteren', 'zwijgen', 'methode'],
      minimumDay: 76,
      maximumDay: 120,
      repeatable: false,
    },
    {
      id: 'method-learning',
      title: 'Leren herkennen',
      question: 'Aan welk teken herken je dat je iets werkelijk begint te begrijpen?',
      phase: 3,
      category: 'self_examination',
      difficulty: 2,
      tags: ['leren', 'begrijpen'],
      minimumDay: 76,
      maximumDay: 120,
      repeatable: false,
    },
    {
      id: 'stone-habit',
      title: 'Een terugkerende gewoonte',
      question: 'Welke gewoonte vormt je dagelijks handelen sterker dan je meestal opmerkt?',
      phase: 4,
      category: 'self_examination',
      difficulty: 3,
      tags: ['gewoonten', 'zelfonderzoek'],
      minimumDay: 121,
      maximumDay: 170,
      repeatable: false,
    },
    {
      id: 'stone-principle',
      title: 'Het principe achter je keuze',
      question: 'Welk principe ligt meestal achter een keuze die je vanzelfsprekend vindt?',
      phase: 4,
      category: 'reflection',
      difficulty: 3,
      tags: ['principes', 'keuzes'],
      minimumDay: 121,
      maximumDay: 170,
      repeatable: false,
    },
    {
      id: 'relation-judgement',
      title: 'Voorbij het eerste oordeel',
      question: 'Wat heb je nodig om je eerste oordeel over iemand opnieuw te onderzoeken?',
      phase: 5,
      category: 'self_examination',
      difficulty: 3,
      tags: ['oordeel', 'relaties'],
      minimumDay: 171,
      maximumDay: 215,
      repeatable: false,
    },
    {
      id: 'relation-difference',
      title: 'Ruimte voor verschil',
      question: 'Welke vorm kan samenwerking aannemen wanneer overeenstemming niet nodig is?',
      phase: 5,
      category: 'application',
      difficulty: 3,
      tags: ['samenwerking', 'verschillen'],
      minimumDay: 171,
      maximumDay: 215,
      repeatable: false,
    },
    {
      id: 'building-context',
      title: 'Het grotere verband',
      question: 'Welke verbinding tussen je eigen werk en je omgeving zie je nu scherper dan voorheen?',
      phase: 6,
      category: 'reflection',
      difficulty: 3,
      tags: ['samenhang', 'omgeving'],
      minimumDay: 216,
      maximumDay: 265,
      repeatable: false,
    },
    {
      id: 'building-contribution',
      title: 'Wat draag je bij?',
      question: 'Welke kleine bijdrage maakt een gezamenlijk bouwwerk sterker?',
      phase: 6,
      category: 'application',
      difficulty: 2,
      tags: ['bijdrage', 'samenleving'],
      minimumDay: 216,
      maximumDay: 265,
      repeatable: false,
    },
    {
      id: 'inner-belief',
      title: 'Een overtuiging bekijken',
      question: 'Welke overtuiging in jou verdient het om zowel van binnenuit als van buitenaf bekeken te worden?',
      phase: 7,
      category: 'self_examination',
      difficulty: 4,
      tags: ['overtuigingen', 'kaders'],
      minimumDay: 266,
      maximumDay: 320,
      repeatable: false,
    },
    {
      id: 'inner-responsibility',
      title: 'Vrijheid en verantwoordelijkheid',
      question: 'Waar raken vrijheid en verantwoordelijkheid elkaar in je dagelijks leven?',
      phase: 7,
      category: 'reflection',
      difficulty: 4,
      tags: ['vrijheid', 'verantwoordelijkheid'],
      minimumDay: 266,
      maximumDay: 320,
      repeatable: false,
    },
    {
      id: 'cube-looking-back',
      title: 'Terugkijken zonder af te sluiten',
      question: 'Wat zie je nu anders wanneer je terugkijkt naar het begin van deze reis?',
      phase: 8,
      category: 'review',
      difficulty: 2,
      tags: ['terugblik', 'integratie'],
      minimumDay: 321,
      maximumDay: 365,
      repeatable: false,
    },
    {
      id: 'cube-continuing',
      title: 'Het werk voortzetten',
      question: 'Welk werk blijft aandacht vragen, ook wanneer een fase afgerond lijkt?',
      phase: 8,
      category: 'application',
      difficulty: 3,
      tags: ['voortzetten', 'werk'],
      minimumDay: 321,
      maximumDay: 365,
      repeatable: false,
    },
  ] satisfies JourneyQuestion[],
} as const

export function getPhaseForDay(day: number): JourneyPhase | undefined {
  return journeyContent.phases.find((phase) => day >= phase.startDay && day <= phase.endDay)
}

export function getQuestionForDay(day: number): JourneyQuestion | undefined {
  const phase = getPhaseForDay(day)
  if (!phase) return undefined

  const availableQuestions = journeyContent.questions.filter(
    (question) =>
      question.phase === phase.number &&
      day >= question.minimumDay &&
      day <= question.maximumDay,
  )

  if (availableQuestions.length === 0) return undefined

  const questionIndex = (day - phase.startDay) % availableQuestions.length
  return availableQuestions[questionIndex]
}