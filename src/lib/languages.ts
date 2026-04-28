export interface TreeTestTranslation {
  name: string;
  code: string;
  messages: {
    welcome: string;
    completion: string;
  };
  customText: {
    instructions: string;
    startTest: string;
    findItHere: string;
    startTask: string;
    confidenceQuestion: string;
    stronglyAgree: string;
    stronglyDisagree: string;
    taskProgress: string;
    skipTask: string;
    submitContinue: string;
    completedMessage: string;
    nextButton: string;
    confidenceDescription: string;
  };
}

export const LANGUAGE_PRESETS: TreeTestTranslation[] = [
  {
    name: "English",
    code: "en",
    messages: {
      welcome: `Welcome to this Tree Test study, and thank you for agreeing to participate!

We are [insert names here].

The activity shouldn't take longer than **10 to 15 minutes** to complete.

Your response will **help us to organize the content of the website, [insert organization name here]**. Find out how on the next page...`,
      completion: `# Thanks
All done, awesome! Thanks again for your participation. Your feedback is incredibly useful in helping to determine how our content should be organized, so we can make our website easier to use.

You may now close this window or navigate to another web page.`,
    },
    customText: {
      instructions: `# Instructions
**Here's how it works:**

1. You will be presented with an organized list of links (like a menu on a website) and an item to find within (like an article or a piece of information).
2. Click through the list until you arrive at one that you think helps you complete the task.
3. If you take a wrong turn, you can always go back by clicking any of the links above.

![](instruction-img)

_This is not a test of your ability, there are no right or wrong answers._  
  
**That's it, let's get started!**`,
      startTest: "Start Test",
      findItHere: "I'd find it here",
      startTask: "Start Task {0}",
      confidenceQuestion: "How confident are you with your answer?",
      stronglyAgree: "Strongly Agree",
      stronglyDisagree: "Strongly Disagree",
      taskProgress: "Task {0} of {1}",
      skipTask: "Skip task",
      submitContinue: "Submit and Continue",
      completedMessage: `# Thank You!

This study has been completed. We have collected all the responses we need.

Thank you for your interest in participating.`,
      nextButton: "Next",
      confidenceDescription: "Please select your level of confidence:",
    },
  },
  {
    name: "Spanish",
    code: "es",
    messages: {
      welcome: `¡Bienvenido a este estudio de Tree Test y gracias por aceptar participar!

Somos [insertar nombres aquí].

La actividad no debería tomar más de **10 a 15 minutos** para completar.

Su respuesta **nos ayudará a organizar el contenido del sitio web, [insertar nombre de la organización aquí]**. Descubra cómo en la siguiente página...`,
      completion: `# Gracias
¡Todo listo, genial! Gracias de nuevo por tu participación. Sus comentarios son increíblemente útiles para ayudar a determinar cómo debe organizarse nuestro contenido, para que podamos hacer que nuestro sitio web sea más fácil de usar.

Ahora puede cerrar esta ventana o navegar a otra página web.`,
    },
    customText: {
      instructions: `# Instrucciones
**Así es como funciona:**

1. Se le presentará una lista organizada de enlaces (como un menú en un sitio web) y un elemento para encontrar dentro (como un artículo o una pieza de información).
2. Haga clic en la lista hasta llegar a uno que crea que le ayuda a completar la tarea.
3. Si se equivoca, siempre puede volver atrás haciendo clic en cualquiera de los enlaces anteriores.

![](instruction-img)

_Esto no es una prueba de su capacidad, no hay respuestas correctas o incorrectas._  
  
**¡Eso es todo, comencemos!**`,
      startTest: "Comenzar Prueba",
      findItHere: "Lo encontraría aquí",
      startTask: "Comenzar Tarea {0}",
      confidenceQuestion: "¿Qué tan seguro está de su respuesta?",
      stronglyAgree: "Muy de Acuerdo",
      stronglyDisagree: "Muy en Desacuerdo",
      taskProgress: "Tarea {0} de {1}",
      skipTask: "Saltar tarea",
      submitContinue: "Enviar y Continuar",
      completedMessage: `# ¡Gracias!

Este estudio ha sido completado. Hemos recopilado todas las respuestas que necesitamos.

Gracias por su interés en participar.`,
      nextButton: "Siguiente",
      confidenceDescription: "Por favor seleccione su nivel de confianza:",
    },
  },
  {
    name: "French",
    code: "fr",
    messages: {
      welcome: `Bienvenue à cette étude Tree Test, et merci d'avoir accepté de participer !

Nous sommes [insérer les noms ici].

L'activité ne devrait pas prendre plus de **10 à 15 minutes** à compléter.

Votre réponse **nous aidera à organiser le contenu du site web, [insérer le nom de l'organisation ici]**. Découvrez comment sur la page suivante...`,
      completion: `# Merci
Tout est fait, génial ! Merci encore pour votre participation. Vos commentaires sont incroyablement utiles pour nous aider à déterminer comment notre contenu doit être organisé, afin que nous puissions rendre notre site web plus facile à utiliser.

Vous pouvez maintenant fermer cette fenêtre ou naviguer vers une autre page web.`,
    },
    customText: {
      instructions: `# Instructions
**Voici comment ça marche :**

1. Une liste organisée de liens vous sera présentée (comme un menu sur un site web) et un élément à trouver à l'intérieur (comme un article ou une information).
2. Cliquez dans la liste jusqu'à arriver à celui qui, selon vous, vous aide à accomplir la tâche.
3. Si vous vous trompez de chemin, vous pouvez toujours revenir en arrière en cliquant sur n'importe lequel des liens ci-dessus.

![](instruction-img)

_Ce n'est pas un test de vos capacités, il n'y a pas de bonnes ou de mauvaises réponses._  
  
**C'est tout, commençons !**`,
      startTest: "Commencer le Test",
      findItHere: "Je le trouverais ici",
      startTask: "Commencer la Tâche {0}",
      confidenceQuestion: "À quel point êtes-vous confiant dans votre réponse ?",
      stronglyAgree: "Tout à fait d'Accord",
      stronglyDisagree: "Pas du tout d'Accord",
      taskProgress: "Tâche {0} sur {1}",
      skipTask: "Passer la tâche",
      submitContinue: "Soumettre et Continuer",
      completedMessage: `# Merci !

Cette étude a été complétée. Nous avons collecté toutes les réponses dont nous avons besoin.

Merci de votre intérêt à participer.`,
      nextButton: "Suivant",
      confidenceDescription: "Veuillez sélectionner votre niveau de confiance :",
    },
  },
  {
    name: "German",
    code: "de",
    messages: {
      welcome: `Willkommen zu dieser Tree Test-Studie und vielen Dank für Ihre Teilnahme!

Wir sind [Namen hier einfügen].

Die Aktivität sollte nicht länger als **10 bis 15 Minuten** dauern.

Ihre Antwort wird **uns helfen, den Inhalt der Website, [Organisationsname hier einfügen], zu organisieren**. Erfahren Sie mehr auf der nächsten Seite...`,
      completion: `# Danke
Alles erledigt, großartig! Vielen Dank noch einmal für Ihre Teilnahme. Ihr Feedback ist unglaublich nützlich, um zu bestimmen, wie unsere Inhalte organisiert werden sollten, damit wir unsere Website benutzerfreundlicher gestalten können.

Sie können dieses Fenster nun schließen oder zu einer anderen Webseite navigieren.`,
    },
    customText: {
      instructions: `# Anweisungen
**So funktioniert es:**

1. Ihnen wird eine organisierte Liste von Links präsentiert (wie ein Menü auf einer Website) und ein Element zum Finden (wie einen Artikel oder eine Information).
2. Klicken Sie durch die Liste, bis Sie zu einem gelangen, von dem Sie denken, dass er Ihnen bei der Aufgabe hilft.
3. Wenn Sie eine falsche Abzweigung nehmen, können Sie immer zurückgehen, indem Sie auf einen der obigen Links klicken.

![](instruction-img)

_Dies ist kein Test Ihrer Fähigkeiten, es gibt keine richtigen oder falschen Antworten._  
  
**Das ist alles, lassen Sie uns anfangen!**`,
      startTest: "Test Starten",
      findItHere: "Ich würde es hier finden",
      startTask: "Aufgabe {0} Starten",
      confidenceQuestion: "Wie sicher sind Sie bei Ihrer Antwort?",
      stronglyAgree: "Stimme Voll Zu",
      stronglyDisagree: "Stimme Überhaupt Nicht Zu",
      taskProgress: "Aufgabe {0} von {1}",
      skipTask: "Aufgabe überspringen",
      submitContinue: "Absenden und Fortfahren",
      completedMessage: `# Vielen Dank!

Diese Studie ist abgeschlossen. Wir haben alle benötigten Antworten gesammelt.

Vielen Dank für Ihr Interesse an der Teilnahme.`,
      nextButton: "Weiter",
      confidenceDescription: "Bitte wählen Sie Ihr Vertrauensniveau:",
    },
  },
  {
    name: "Portuguese",
    code: "pt",
    messages: {
      welcome: `Bem-vindo a este estudo Tree Test, e obrigado por concordar em participar!

Nós somos [inserir nomes aqui].

A atividade não deve demorar mais de **10 a 15 minutos** para completar.

Sua resposta **nos ajudará a organizar o conteúdo do website, [inserir nome da organização aqui]**. Descubra como na próxima página...`,
      completion: `# Obrigado
Tudo pronto, incrível! Obrigado novamente pela sua participação. Seu feedback é extremamente útil para nos ajudar a determinar como nosso conteúdo deve ser organizado, para que possamos tornar nosso website mais fácil de usar.

Você pode agora fechar esta janela ou navegar para outra página web.`,
    },
    customText: {
      instructions: `# Instruções
**Aqui está como funciona:**

1. Você será apresentado com uma lista organizada de links (como um menu em um website) e um item para encontrar dentro (como um artigo ou uma informação).
2. Clique através da lista até chegar a um que você acha que te ajuda a completar a tarefa.
3. Se você tomar um caminho errado, você sempre pode voltar clicando em qualquer um dos links acima.

![](instruction-img)

_Isto não é um teste da sua habilidade, não há respostas certas ou erradas._  
  
**Isso é tudo, vamos começar!**`,
      startTest: "Iniciar Teste",
      findItHere: "Eu encontraria aqui",
      startTask: "Iniciar Tarefa {0}",
      confidenceQuestion: "Quão confiante você está na sua resposta?",
      stronglyAgree: "Concordo Totalmente",
      stronglyDisagree: "Discordo Totalmente",
      taskProgress: "Tarefa {0} de {1}",
      skipTask: "Pular tarefa",
      submitContinue: "Enviar e Continuar",
      completedMessage: `# Obrigado!

Este estudo foi completado. Nós coletamos todas as respostas que precisamos.

Obrigado pelo seu interesse em participar.`,
      nextButton: "Próximo",
      confidenceDescription: "Por favor selecione seu nível de confiança:",
    },
  },
  {
    name: "Italian",
    code: "it",
    messages: {
      welcome: `Benvenuto/a e grazie per aver accettato di partecipare!

Siamo **[inserire nome]** e Le chiediamo di aiutarci a migliorare [inserire "il nostro sito internet" o "la nostra applicazione" o altro].

Di seguito Le verrà presentato un questionario composto da **[inserire numero domande]** brevi domande (dalla durata di circa **[inserire durata in minuti]**).

Le descriveremo alcuni contenuti e informazioni e le chiederemo di identificare da un elenco la sezione che li contiene. Lei potrà selezionare l'elemento che ritiene più corretto.

L'elenco assomiglia al menù di navigazione di un sito internet ma non si tratta di un sito reale. Si tratta solo di una rappresentazione sintetica di come viene organizzato.

**Attenzione: non si tratta di un test delle Sue capacità, ma di un test sul nostro lavoro.**

Per proseguire, vada alla pagina successiva...`,
      completion: `# Grazie!

Il test è finito! Le Sue risposte sono state registrate e può chiudere questa finestra.

Il Suo feedback è prezioso e ci aiuterà a capire come organizzare al meglio i contenuti del nostro sito, per renderlo più semplice da navigare.

A presto!`,
    },
    customText: {
      instructions: `# Istruzioni

_Di nuovo: non si tratta di un test delle Sue capacità, ma di un test sul nostro lavoro._

**Ecco come funziona il test:**

1. Le verrà chiesto di trovare un articolo o un'informazione all'interno dell'elenco di sezioni di [inserire "un sito" o "un'applicazione"].
2. Navighi tra le sezioni finché non identifica la sezione che ritiene Le permetta di completare il compito.
3. Se sbaglia strada, può sempre tornare indietro cliccando su un'altra sezione.
4. Selezioni la sezione che ritiene corretta e clicchi sul pulsante "Penso che sia qui"

![](instruction-img)`,
      startTest: "Cominciamo",
      findItHere: "Penso che sia qui",
      startTask: "Andiamo alla domanda {0}",
      confidenceQuestion: "Quanto è sicuro/a della Sua risposta?",
      stronglyAgree: "Completamente sicuro/a",
      stronglyDisagree: "Per nulla sicuro/a",
      taskProgress: "Domanda {0} di {1}",
      skipTask: "Salta questa domanda",
      submitContinue: "Invia e Continua",
      completedMessage: `# Grazie!

Questo studio è stato completato. Abbiamo già raccolto tutte le risposte di cui avevamo bisogno.

Grazie per il Suo interesse a partecipare.`,
      nextButton: "Prossimo",
      confidenceDescription: "Selezioni un valore da 1 a 7",
    },
  }
];

export function getLanguagePreset(code: string): TreeTestTranslation {
  return LANGUAGE_PRESETS.find((lang) => lang.code === code) || LANGUAGE_PRESETS[0];
}

export function getDefaultLanguage(): TreeTestTranslation {
  return LANGUAGE_PRESETS[0]; // English
}
