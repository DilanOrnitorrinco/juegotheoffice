import { t } from "../time";
import type { EpisodeEventDef } from "../types";

export const FREE_MODE_EVENTS: EpisodeEventDef[] = [
  {
    id: "free_morning_meeting",
    title: "Reunión matinal de motivación",
    room: "conf",
    spot: "conf_s1",
    at: t("09:20"),
    duration: 50,
    isMeeting: true,
    trigger: {
      who: "kevin",
      spot: "kitchen_mid",
      action: "Oliendo humo del microondas",
      toastText: "🔥 Kevin acaba de quemar unas palomitas en el microondas…",
      line: "Eh… ¿alguien sabe cómo se apaga este humo amarillo?",
      callLine: "¡ALERTA DE PRODUCTIVIDAD! ¡TODO EL MUNDO A LA SALA DE CONFERENCIAS, YA!",
      preludeSteps: [
        {
          who: "kevin",
          partner: "pam",
          spot: "kitchen_mid",
          partnerSpot: "coffee",
          action: "Oliendo palomitas quemadas",
          toastText:
            "🔥 1/2 · Kevin deja quemar unas palomitas y la alarma de la cocina casi salta…",
          speaker: "kevin",
          line: "Se ha puesto negra la bolsa entera… pero algunas todavía se pueden comer.",
          replyWho: "pam",
          replyLine:
            "Kevin, abre la ventana antes de que llegue Michael y lo convierta en un discurso.",
          gesture: "facepalm",
          duration: 3.4,
        },
        {
          who: "michael",
          partner: "dwight",
          spot: "bullpen_mid",
          partnerSpot: "seat_dwight",
          action: "Inspirándose para una pizarra nueva",
          toastText:
            "📣 2/2 · Michael huele el humo y decide que hoy hace falta un acrónimo de motivación…",
          speaker: "michael",
          line: "La moral está fría, Dwight. Necesito la palabra mágica en mi pizarra.",
          replyWho: "dwight",
          replyLine: "¡Sugiero B-O-B-O-D-D-Y! La primera B es de «Biznus», Michael.",
          gesture: "point",
          duration: 3.4,
        },
      ],
      aftermath: {
        toastText:
          "📝 La pizarra de la sala sigue llena con el acrónimo «B-O-B-O-D-D-Y» de Michael.",
        summaryLine: "Michael impartió su seminario B-O-B-O-D-D-Y tras el humo de la cocina",
        overrides: [
          {
            who: "dwight",
            action: "Memorizando B-O-B-O-D-D-Y",
            spot: "seat_dwight",
            reactionLine: "Biznus. Ventas. Pasión. ¡Está todo en mi cuaderno!",
            mins: 20,
          },
        ],
      },
    },
    host: "michael",
    participants: ["michael", "dwight", "jim", "pam", "stanley", "angela", "kevin", "oscar"],
    announcement: "📢 Michael convoca a TODA la oficina: «¡A la Sala de Conferencias, ya!».",
    topicPrompt:
      "Reunión matinal en Dunder Mifflin Scranton donde Michael intenta motivar al equipo con acrósticos absurdos sobre ventas y trabajo en equipo.",
    suggestedLines: [
      "Michael, ¿cuál es exactamente la meta de ventas de hoy?",
      "¿Y si motivamos al equipo con café y menos reuniones?",
      "Dwight acaba de apuntar esto como «ley marcial de papel».",
    ],
    lines: [
      {
        who: "michael",
        text: "¡Atención familia! Hoy la letra del día en mi pizarra es B-O-B-O-D-D-Y.",
        action: "point",
        cameraShot: "host",
        react: [
          { who: "dwight", gesture: "note" },
          { who: "stanley", gesture: "facepalm" },
        ],
      },
      {
        who: "kevin",
        text: "¿Qué significa la primera B, Michael?",
        action: "raise_hand",
        cameraShot: "speaker",
        react: [{ who: "michael", gesture: "point" }],
      },
      {
        who: "michael",
        text: "«Biznus». Ventas. Pasión. ¡Y nadie sale de aquí hasta que sintamos la energía!",
        action: "talk",
        cameraShot: "wide",
        react: [{ who: "dwight", gesture: "clap" }],
      },
      {
        who: "stanley",
        text: "Tengo tres llamadas esperando y una mujer en contabilidad que me mira mal.",
        action: "facepalm",
        cameraShot: "reaction",
        react: [{ who: "angela", gesture: "nod" }],
      },
      {
        who: "jim",
        text: "¿Alguien más cree que esto pudo haber sido un correo de dos líneas?",
        action: "talk",
        cameraShot: "speaker",
        react: [{ who: "pam", gesture: "nod" }],
      },
      {
        who: "dwight",
        text: "¡Silencio! La moral se impone desde arriba. Anotad el acróstico.",
        action: "point",
        cameraShot: "player",
        react: [{ who: "michael", gesture: "clap" }],
      },
    ],
  },
  {
    id: "free_afternoon_brainstorm",
    title: "Lluvia de ideas en la Sala de Conferencias",
    room: "conf",
    spot: "conf_s1",
    at: t("14:50"),
    duration: 45,
    isMeeting: true,
    trigger: {
      who: "stanley",
      spot: "seat_stanley",
      action: "Esquivando un avión de papel",
      toastText:
        "✈️ Un avión de papel lanzado desde el despacho de Michael da de lleno en el crucigrama de Stanley…",
      line: "Michael, como me tires otro folio en el crucigrama me levanto y me voy.",
      callLine: "¡LLUVIA DE IDEAS URGENTE! ¡SALA DE CONFERENCIAS AHORA MISMO, TODOS!",
      preludeSteps: [
        {
          who: "michael",
          partner: "stanley",
          spot: "michael_visit",
          partnerSpot: "seat_stanley",
          action: "Lanzando aviones de papel",
          toastText:
            "✈️ 1/2 · Aburrido a las tres de la tarde, Michael lanza un avión de papel por la puerta…",
          speaker: "michael",
          line: "¡Vuela, águila de papel, lleva creatividad a Ventas!",
          replyWho: "stanley",
          replyLine: "Acabas de clavar ese folio en mi casilla del cuatro horizontal, Michael.",
          gesture: "facepalm",
          duration: 3.4,
        },
      ],
      aftermath: {
        toastText:
          "📋 Kelly ya busca pegatinas rosas por recepción mientras Stanley regresa a su crucigrama.",
        summaryLine: "Reunión vespertina de ideas interrumpida por un avión de papel de Michael",
      },
    },
    host: "michael",
    participants: ["michael", "jim", "pam", "dwight", "ryan", "kelly", "toby", "phyllis"],
    announcement:
      "📢 Michael llama a toda la plantilla a la Sala de Conferencias para una lluvia de ideas.",
    topicPrompt:
      "Lluvia de ideas vespertina en la Sala de Conferencias sobre cómo atraer clientes nuevos y sobrevivir al bajón de las tres.",
    suggestedLines: [
      "Propongo llamar a colegios y clínicas locales con muestras gratis.",
      "¿Por qué no hacemos un vídeo promocional corto con todo el equipo?",
      "Toby tiene cara de querer decir algo sobre la normativa.",
    ],
    lines: [
      {
        who: "michael",
        text: "No hay malas ideas en esta sala. Salvo si vienen de Toby.",
        action: "pace",
        cameraShot: "host",
        react: [{ who: "toby", gesture: "facepalm" }],
      },
      {
        who: "toby",
        text: "Solo iba a recordar que el presupuesto de marketing es cero.",
        action: "raise_hand",
        cameraShot: "speaker",
        react: [{ who: "michael", gesture: "facepalm" }],
      },
      {
        who: "kelly",
        text: "¡Podríamos regalar pegatinas rosas con cada caja de folios!",
        action: "clap",
        cameraShot: "reaction",
        react: [{ who: "ryan", gesture: "facepalm" }],
      },
      {
        who: "ryan",
        text: "Eso hundiría el margen un 4% antes de empezar.",
        action: "note",
        cameraShot: "speaker",
      },
      {
        who: "pam",
        text: "¿Alguien quiere aportar una idea de verdad antes de las cinco?",
        action: "talk",
        cameraShot: "wide",
        react: [{ who: "jim", gesture: "nod" }],
      },
    ],
  },
];

export const EPISODE_EVENTS: Record<string, EpisodeEventDef[]> = {
  s1e1: [
    {
      id: "ev_s1e1_downsizing",
      title: "Reunión de emergencia sobre los recortes",
      room: "conf",
      spot: "conf_s1",
      at: t("09:15"),
      duration: 50,
      isMeeting: true,
      trigger: {
        who: "stanley",
        spot: "bullpen_mid",
        action: "Alarmado por el rumor de despidos",
        toastText: "📞 Jan llama por recortes y el rumor corre por Ventas…",
        line: "¿Habéis oído eso? Van a cerrar o Scranton o Stamford.",
        callLine: "¡QUIETOS TODOS! ¡A LA SALA DE CONFERENCIAS, YA! ¡AHORA MISMO!",
        preludeSteps: [
          {
            who: "jan",
            partner: "michael",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Advirtiendo sobre recortes en Scranton",
            toastText:
              "📞 1/2 · Jan entra en el despacho de Michael para advertirle sobre los posibles recortes de sucursal…",
            speaker: "jan",
            line: "Michael, la central estudia fusionar Scranton y Stamford. No hay margen para distracciones.",
            replyWho: "michael",
            replyLine:
              "Tranquila, Jan, aquí nadie se entera… ¡aunque tenemos un equipo documental grabándolo todo!",
            gesture: "note",
            duration: 3.6,
          },
          {
            who: "stanley",
            partner: "dwight",
            spot: "bullpen_mid",
            partnerSpot: "seat_dwight",
            action: "Discutiendo rumores de despido",
            toastText: "🗣️ 2/2 · El rumor corre como la pólvora entre las mesas de Ventas…",
            speaker: "stanley",
            line: "Si Jan ha subido seria a su despacho, alguien se queda en la calle este mes.",
            replyWho: "dwight",
            replyLine:
              "Tranquilo, Stanley. Yo tengo reservas de cereales para sobrevivir seis meses en el búnker.",
            gesture: "facepalm",
            duration: 3.6,
          },
        ],
        aftermath: {
          toastText: "🎥 Ryan mira atónito a las cámaras del documental mientras vuelve al anexo.",
          summaryLine:
            "Michael intentó tranquilizar a la plantilla sobre los recortes frente al documental",
          overrides: [
            {
              who: "ryan",
              action: "Asimilando su primer día",
              spot: "seat_ryan",
              reactionLine: "Acabo de empezar de temporal y ya hablan de cerrar el edificio…",
              mins: 20,
            },
          ],
        },
      },
      host: "michael",
      participants: ["michael", "dwight", "jim", "pam", "ryan", "stanley", "oscar", "angela"],
      announcement:
        "🎬 [T1·E01] ¡Reunión urgente en la Sala de Conferencias! Todos deben pasar a sentarse.",
      topicPrompt:
        "Episodio Piloto: Jan ha advertido a Michael sobre posibles despidos entre Scranton y Stamford, y Michael intenta tranquilizar a la plantilla frente al equipo documental.",
      suggestedLines: [
        "Michael, ¿de verdad van a cerrar nuestra sucursal o la de Stamford?",
        "Con las ventas de este mes deberíamos salvar los puestos, ¿no?",
        "¿Podemos hablar sin mirar fijamente a la cámara del documental?",
      ],
      lines: [
        {
          who: "michael",
          text: "Sé que corren rumores de recorte. Pero aquí nadie va a perder el trabajo… probablemente.",
          action: "pace",
          cameraShot: "wide",
          react: [{ who: "oscar", gesture: "facepalm" }],
        },
        {
          who: "stanley",
          text: "Michael, Jan acaba de decir en tu despacho que una sucursal entera podría cerrar.",
          action: "talk",
          cameraShot: "speaker",
          react: [{ who: "michael", gesture: "facepalm" }],
        },
        {
          who: "michael",
          text: "Eso era confidencial, Stanley. ¡Las cámaras están grabando!",
          action: "point",
          cameraShot: "host",
        },
        {
          who: "dwight",
          text: "Si hay despidos, recomiendo evaluar primero la capacidad de supervivencia en el bosque.",
          action: "raise_hand",
          cameraShot: "reaction",
          react: [{ who: "jim", gesture: "facepalm" }],
        },
        {
          who: "jim",
          text: "Yo voto por que nadie le dé un hacha a Dwight durante la reunión.",
          action: "talk",
          cameraShot: "speaker",
          react: [{ who: "pam", gesture: "nod" }],
        },
        {
          who: "ryan",
          text: "Solo llevo aquí veinte minutos… ¿esto pasa todos los días?",
          action: "note",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s1e1_jello",
      title: "¡La grapadora de Dwight en gelatina!",
      room: "bullpen",
      spot: "bullpen_mid",
      at: t("11:00"),
      duration: 38,
      host: "dwight",
      participants: ["dwight", "jim", "pam", "ryan"],
      effect: "gelatin_stapler",
      announcement:
        "🎬 [T1·E01] ¡Escándalo en Ventas! Dwight ha encontrado su grapadora dentro de gelatina.",
      topicPrompt: "Jim mete la grapadora de Dwight en gelatina amarilla en su escritorio.",
      lines: [
        { who: "dwight", text: "¡¿QUIÉN HA METIDO MI GRAPADORA EN GELATINA?! ¡MICHAEL!" },
        { who: "jim", text: "Tranquilo, Dwight. Igual deberías comértela antes de juzgar." },
        { who: "pam", text: "Creo que es sabor limón. Un clásico de Scranton." },
        {
          who: "dwight",
          text: "¡Esto es destrucción de propiedad corporativa! Alguien va a acabar en custodia.",
        },
      ],
    },
    {
      id: "ev_s1e1_firing",
      title: "La broma del falso despido a Pam",
      room: "michael",
      spot: "michael_visit",
      at: t("14:30"),
      duration: 35,
      host: "michael",
      participants: ["michael", "pam", "ryan"],
      effect: "fake_firing",
      announcement:
        "🎬 [T1·E01] En el despacho de Michael: Michael hace una broma de mal gusto a Pam delante de Ryan.",
      topicPrompt:
        "Michael finge despedir a Pam por robar notas adhesivas para impresionar a Ryan.",
      lines: [
        {
          who: "michael",
          text: "Pam, siéntate. Falta un paquete de post-its y tengo que prescindir de ti. ¡Estás despedida!",
        },
        { who: "pam", text: "…¿Qué? Michael, dime que es una broma." },
        { who: "michael", text: "¡Ja! ¡Te la he colado delante del nuevo! Es una broma, Pam…" },
        { who: "pam", text: "Eres un imbécil, Michael." },
      ],
    },
  ],

  s1e2: [
    {
      id: "ev_s1e2_diversity",
      title: "Seminario del Día de la Diversidad",
      room: "conf",
      spot: "conf_s1",
      at: t("09:15"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "pam",
        spot: "reception_front",
        action: "Despidiendo al Sr. Brown",
        toastText:
          "📋 El consultor oficial de diversidad acaba de salir y Michael saca post-its de su cajón…",
        line: "Michael, el Sr. Brown ya ha terminado la sesión oficial de diversidad.",
        callLine:
          "¡ESTO NO SE QUEDA ASÍ! ¡TODOS A LA SALA DE CONFERENCIAS, YA! ¡MI DÍA DE LA DIVERSIDAD!",
        preludeSteps: [
          {
            who: "toby",
            partner: "pam",
            spot: "reception_front",
            partnerSpot: "seat_pam",
            action: "Archivando el seminario del Sr. Brown",
            toastText:
              "📋 1/2 · El Sr. Brown concluye el curso oficial de la central, pero Michael se siente humillado…",
            speaker: "toby",
            line: "El Sr. Brown ya ha recogido las firmas… menos la de Michael, que intentó firmar como «Daffy Duck».",
            replyWho: "pam",
            replyLine:
              "Peor todavía: le he visto coger rotuladores gordos y un taco de tarjetas de colores.",
            gesture: "note",
            duration: 3.6,
          },
          {
            who: "michael",
            partner: "dwight",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Escribiendo etiquetas en tarjetas",
            toastText:
              "🪪 2/2 · Michael escribe orígenes y tópicos en tarjetas para pegarlas en las frentes…",
            speaker: "michael",
            line: "El seminario oficial fue aburridísimo, Dwight. Voy a dirigir el MÍO propio ahora mismo.",
            replyWho: "dwight",
            replyLine:
              "¡Magnífico, Michael! He traído cinta adhesiva extra resistente por si alguien suda.",
            gesture: "point",
            duration: 3.6,
          },
        ],
        aftermath: {
          toastText: "😠 Kelly regresa indignada a su rincón tras las imitaciones de Michael…",
          summaryLine:
            "Michael obligó a toda la oficina a llevar tarjetas en la frente en su Día de la Diversidad",
          overrides: [
            {
              who: "oscar",
              action: "Respirando hondo en su mesa",
              spot: "seat_oscar",
              reactionLine:
                "Espero no volver a ver una tarjeta pegada en la frente en toda mi vida.",
              mins: 20,
            },
          ],
        },
      },
      host: "michael",
      participants: [
        "michael",
        "dwight",
        "jim",
        "pam",
        "oscar",
        "stanley",
        "kevin",
        "kelly",
        "angela",
      ],
      effect: "sticky_notes",
      announcement:
        "🎬 [T1·E02] ¡Todos a la Sala de Conferencias! Michael prepara tarjetas en la frente.",
      topicPrompt:
        "Día de la Diversidad: Michael pega tarjetas con etnias y personajes en la frente de los empleados para hacer su propio seminario en círculo en la Sala de Conferencias.",
      suggestedLines: [
        "Michael, creo que el Sr. Brown ya terminó el formulario esta mañana.",
        "¿Qué pone en mi tarjeta de la frente? Nadie me da pistas claras.",
        "¿Podemos hablar de clientes reales en vez de estereotipos?",
      ],
      lines: [
        {
          who: "michael",
          text: "¡Bienvenidos a MI Día de la Diversidad! No os quitéis la tarjeta de la frente.",
          action: "point",
          cameraShot: "wide",
          react: [{ who: "oscar", gesture: "facepalm" }],
        },
        {
          who: "oscar",
          text: "Michael, esto es mucho más incómodo que el seminario de la central.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "pam",
          text: "Stanley, ¿quieres probar un… pretzel o algo? No, espera, creo que me toca adivinar.",
          action: "nod",
          cameraShot: "reaction",
        },
        {
          who: "dwight",
          text: "Mi tarjeta dice «Asiático». Si digo algo sobre conducir, no me miréis mal.",
          action: "raise_hand",
          cameraShot: "speaker",
          react: [{ who: "jim", gesture: "facepalm" }],
        },
        {
          who: "jim",
          text: "Pam, creo que mi tarjeta dice exactamente lo que Michael no debería leer en voz alta.",
          action: "talk",
          cameraShot: "player",
        },
        {
          who: "stanley",
          text: "Si esto dura diez minutos más me duermo con la tarjeta puesta.",
          action: "facepalm",
          cameraShot: "host",
        },
      ],
    },
    {
      id: "ev_s1e2_slap",
      title: "La rutina de Chris Rock y el bofetón de Kelly",
      room: "reception",
      spot: "reception_front",
      at: t("13:15"),
      duration: 35,
      host: "kelly",
      participants: ["michael", "kelly", "pam", "ryan"],
      announcement:
        "🎬 [T1·E02] ¡Tensión junto a Recepción! Kelly acaba de plantar cara al chiste de Michael.",
      topicPrompt:
        "Michael imita una rutina de Chris Rock frente a Kelly en recepción y Kelly le da una bofetada.",
      lines: [
        { who: "michael", text: "¡Hola Kelly! ¡Prueba mi galleta, prueba mi galleta!" },
        { who: "kelly", text: "*PLAF* ¡No vuelvas a hacer esa voz delante de mí, Michael!" },
        { who: "pam", text: "…Bueno. Al menos ahora sí sabemos qué es la diversidad." },
        {
          who: "michael",
          text: "Me duele la mejilla. Pero creo que he aprendido una valiosa lección.",
        },
      ],
    },
  ],

  s1e4: [
    {
      id: "ev_s1e4_meredith_bday",
      title: "Fiesta improvisada para Meredith",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 50,
      isMeeting: true,
      trigger: {
        who: "dwight",
        spot: "cooler",
        action: "Susurrando sobre la Alianza",
        toastText:
          "🧁 Los rumores de despido disparan la ansiedad y Michael exige una fiesta inmediata…",
        line: "Dicen que recortan un departamento entero antes del viernes.",
        callLine: "¡ARRIBA ESOS ÁNIMOS! ¡TODOS A LA SALA DE CONFERENCIAS, FIESTA OBLIGATORIA YA!",
        preludeSteps: [
          {
            who: "dwight",
            partner: "jim",
            spot: "cooler",
            partnerSpot: "bullpen_east",
            action: "Proponiendo la Alianza secreta",
            toastText:
              "🤝 1/2 · Junto al dispensador de agua, Dwight susurra a Jim su plan de alianza contra Contabilidad…",
            speaker: "dwight",
            line: "Van a recortar personal, Jim. Propongo una alianza táctica tú y yo contra los demás.",
            replyWho: "jim",
            replyLine:
              "Suena absolutamente necesario, Dwight. Pero ni una palabra frente a Ventas.",
            gesture: "nod",
            duration: 3.6,
          },
          {
            who: "michael",
            partner: "angela",
            spot: "party",
            partnerSpot: "accounting_mid",
            action: "Exigiendo tarta y fiesta hoy mismo",
            toastText:
              "🧁 2/2 · Michael entra en pánico por la baja moral y exige celebrar el cumpleaños de Meredith un mes antes…",
            speaker: "michael",
            line: "¡La gente está deprimida! ¡Angela, saca globos y una tarta para Meredith ahora mismo!",
            replyWho: "angela",
            replyLine:
              "Su cumpleaños no es hasta el mes que viene y no entra en el presupuesto de abril.",
            gesture: "facepalm",
            duration: 3.6,
          },
        ],
        aftermath: {
          toastText:
            "🎂 Meredith se queda comiendo tarta mientras Dwight trama su escondite en el almacén.",
          summaryLine:
            "Michael celebró el falso cumpleaños de Meredith para calmar los rumores de despido",
        },
      },
      host: "michael",
      participants: ["michael", "angela", "phyllis", "pam", "meredith", "dwight"],
      announcement:
        "🎬 [T1·E04] Reunión del Comité de Fiestas en la Sala de Conferencias por Meredith.",
      topicPrompt:
        "La Alianza: ante los rumores de despido, Michael decide celebrar el cumpleaños de Meredith un mes antes en la Sala de Conferencias y busca un mensaje brillante para su tarjeta.",
      suggestedLines: [
        "Michael, el cumpleaños de Meredith es dentro de un mes.",
        "En la tarjeta basta con poner «¡Felicidades!» sin chistes sobre la edad.",
        "¿No deberíamos hablar de cómo evitar los despidos en Ventas?",
      ],
      lines: [
        {
          who: "michael",
          text: "La moral está por los suelos. ¡Así que hoy celebramos el cumpleaños de Meredith!",
          action: "clap",
          cameraShot: "wide",
          react: [{ who: "angela", gesture: "facepalm" }],
        },
        {
          who: "meredith",
          text: "Mi cumpleaños fue el mes pasado… bueno, queda otro mes para el siguiente.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "angela",
          text: "Una tarta helada cuesta más de lo autorizado para emergencias morales.",
          action: "note",
          cameraShot: "reaction",
        },
        {
          who: "michael",
          text: "Necesito una broma brutal para firmar la tarjeta gigante. Algo sobre los años.",
          action: "pace",
          cameraShot: "host",
        },
        {
          who: "pam",
          text: "Por favor, no escribas nada sobre jubilación anticipada, Michael.",
          action: "facepalm",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s1e4_box",
      title: "La Alianza secreta y la caja de Dwight",
      room: "warehouse",
      spot: "warehouse_a",
      at: t("11:25"),
      duration: 40,
      host: "dwight",
      participants: ["dwight", "jim", "darryl"],
      announcement:
        "🎬 [T1·E04] ¡En el Almacén! Dwight intenta espiar desde una caja por consejo de Jim.",
      topicPrompt:
        "Jim convence a Dwight de esconderse en una caja en el almacén para vigilar al departamento de Contabilidad.",
      lines: [
        {
          who: "dwight",
          text: "Jim, desde dentro de esta caja de cartón tengo ángulo visual perfecto.",
        },
        {
          who: "jim",
          text: "Brillante, Dwight. Quédate ahí muy quieto mientras bajo a Contabilidad.",
        },
        { who: "darryl", text: "Oye, ¿por qué esa caja de folios lleva gafas y respira fuerte?" },
        { who: "dwight", text: "¡Soy parte de la Alianza! No puedes verme." },
      ],
    },
    {
      id: "ev_s1e4_blonde",
      title: "Dwight aparece con el pelo teñido",
      room: "bullpen",
      spot: "bullpen_mid",
      at: t("14:20"),
      duration: 35,
      host: "dwight",
      participants: ["dwight", "jim", "pam"],
      announcement:
        "🎬 [T1·E04] En Ventas: Dwight vuelve convencido de haber descubierto a los espías.",
      topicPrompt:
        "Jim gasta otra broma a Dwight haciéndole creer que teñirse el pelo sirve de camuflaje.",
      lines: [
        {
          who: "dwight",
          text: "Misión cumplida, Jim. Nadie en Contabilidad sospechó de mi nuevo disfraz.",
        },
        { who: "pam", text: "¿Jim? ¿Le has dicho de verdad que se tiña para infiltrarse?" },
        { who: "jim", text: "Un buen aliado siempre sigue el protocolo, Dwight." },
      ],
    },
  ],

  s2e5: [
    {
      id: "ev_s2e5_halloween_meeting",
      title: "Reunión de disfraces y recorte de fin de mes",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 50,
      isMeeting: true,
      trigger: {
        who: "toby",
        spot: "michael_visit",
        action: "Recordando el plazo de RRHH",
        toastText:
          "🎃 Toby recuerda a Michael que RRHH exige ejecutar un despido antes de las cinco…",
        line: "Michael, hoy es 31 de octubre. Tienes que elegir a alguien antes de cerrar.",
        callLine: "¡ATENCIÓN MONSTRUOS Y BRUJAS! ¡A LA SALA DE CONFERENCIAS, YA!",
        preludeSteps: [
          {
            who: "toby",
            partner: "michael",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Entregando el ultimátum de RRHH",
            toastText:
              "🎃 1/2 · Toby entra disfrazado al despacho de Michael: hoy vence el plazo para despedir a alguien…",
            speaker: "toby",
            line: "Michael, la central exige un despido antes de que acabe el día 31. No puedes seguir aplazándolo.",
            replyWho: "michael",
            replyLine:
              "¡Hoy es Halloween, Toby! ¿Cómo voy a despedir a nadie con dos cabezas en los hombros?",
            gesture: "facepalm",
            duration: 3.6,
          },
          {
            who: "creed",
            partner: "michael",
            spot: "bullpen_east",
            partnerSpot: "michael_visit",
            action: "Señalando hacia el escritorio de Devon",
            toastText:
              "🦇 2/2 · En vez de aceptar el despido, Creed convence discretamente a Michael de culpar a Devon…",
            speaker: "creed",
            line: "Escúchame bien, jefe: si sobra alguien en Control de Calidad, mira hacia Devon, no hacia mí.",
            replyWho: "michael",
            replyLine:
              "Mmm… tienes razón, Creed. Debo explicárselo primero a todo el equipo en reunión.",
            gesture: "talk",
            duration: 3.6,
          },
        ],
        aftermath: {
          toastText: "📦 Devon empieza a recoger sus cosas con mala cara rumbo a Recepción.",
          summaryLine:
            "En pleno Halloween Michael anunció que alguien perdería su puesto antes de cerrar",
          overrides: [
            {
              who: "devon",
              action: "Recogiendo su caja",
              spot: "seat_devon",
              reactionLine: "No me puedo creer que vayan a hacerme esto disfrazado.",
              mins: 20,
            },
          ],
        },
      },
      host: "michael",
      participants: ["michael", "dwight", "jim", "pam", "creed", "devon", "angela", "kevin"],
      announcement: "🎬 [T2·E05] ¡Todos disfrazados a la Sala de Conferencias!",
      topicPrompt:
        "Halloween: todo el personal va disfrazado y Michael ha recibido orden de RRHH de despedir a un empleado antes de que acabe octubre.",
      suggestedLines: [
        "Michael, ¿no puedes pedir una prórroga a la central hasta noviembre?",
        "Creed lleva rato muy callado mirando hacia Devon…",
        "Por lo menos el disfraz de Jim con tres agujeros ahorró presupuesto.",
      ],
      lines: [
        {
          who: "michael",
          text: "Feliz Halloween. Como veis tengo dos cabezas, pero una mala noticia: alguien se va hoy.",
          action: "pace",
          cameraShot: "host",
          react: [{ who: "devon", gesture: "facepalm" }],
        },
        {
          who: "devon",
          text: "¿Nos vas a despedir con una cabeza de papel maché en el hombro?",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "dwight",
          text: "Como Lord Sith de esta sucursal, exijo que se evalúe la lealtad absoluta.",
          action: "point",
          cameraShot: "reaction",
        },
        {
          who: "jim",
          text: "Soy «Jim con tres agujeros». Si me despedís, al menos quepo en un archivador.",
          action: "nod",
          cameraShot: "speaker",
          react: [{ who: "pam", gesture: "clap" }],
        },
        {
          who: "creed",
          text: "Si alguien sobra en Control de Calidad… que conste que yo soy imprescindible.",
          action: "raise_hand",
          cameraShot: "wide",
        },
      ],
    },
    {
      id: "ev_s2e5_devon_exit",
      title: "Despedida de Devon junto a Recepción",
      room: "reception",
      spot: "reception_front",
      at: t("14:30"),
      duration: 40,
      host: "devon",
      participants: ["devon", "michael", "pam", "creed"],
      announcement:
        "🎬 [T2·E05] En Recepción: Devon recoge su caja tras la decisión de Michael y Creed.",
      topicPrompt:
        "Creed convence a Michael de despedir a Devon en lugar de a él, y Devon se marcha enfadado prometiendo venganza.",
      lines: [
        { who: "michael", text: "Devon, toma este vale para Chili's. Sin rencores, ¿vale?" },
        {
          who: "devon",
          text: "¡Rómpete los cuernos, Michael! Y tú, Creed, sé perfectamente lo que hiciste.",
        },
        { who: "creed", text: "Buen viaje, muchacho. Te mandaré una postal." },
        {
          who: "pam",
          text: "Mala idea dejarle salir justo al lado del aparcamiento en Halloween…",
        },
      ],
    },
  ],

  s2e10: [
    {
      id: "ev_s2e10_yankee",
      title: "Amigo Invisible convertido en Yankee Swap",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "phyllis",
        spot: "party",
        action: "Enseñando su regalo de Navidad",
        toastText:
          "🎄 ¡Choque navideño junto a la mesa de fiestas! Michael acaba de ver la manopla de Phyllis…",
        line: "Michael, te he tejido esta manopla a mano con mucho cariño.",
        callLine:
          "¡CAMBIO DE PLANES! ¡TODOS A LA SALA DE CONFERENCIAS, YA! ¡EMPIEZA EL YANKEE SWAP!",
        preludeSteps: [
          {
            who: "jim",
            partner: "pam",
            spot: "reception_front",
            partnerSpot: "seat_pam",
            action: "Preparando la tetera azul de Navidad",
            toastText:
              "🫖 1/2 · En Recepción, Jim guarda ilusionado la tetera llena de recuerdos para el amigo invisible de Pam…",
            speaker: "jim",
            line: "He pasado semanas preparando este regalo especial dentro del límite de veinte dólares.",
            replyWho: "pam",
            replyLine: "Qué intriga, Jim… solo espero que Michael no arruine el sorteo de Navidad.",
            gesture: "nod",
            duration: 3.5,
          },
          {
            who: "phyllis",
            partner: "michael",
            spot: "party",
            partnerSpot: "michael_visit",
            action: "Abriendo el regalo navideño de Phyllis",
            toastText:
              "🎄 2/2 · Michael abre la manopla tejida por Phyllis después de gastarse $400 en un iPod para Ryan…",
            speaker: "phyllis",
            line: "Michael, he pasado horas tejiendo esta manopla especialmente para ti.",
            replyWho: "michael",
            replyLine:
              "¿Una manopla? ¡Yo compré un iPod de cuatrocientos dólares! ¡Cambiemos las reglas!",
            gesture: "facepalm",
            duration: 3.7,
          },
        ],
        aftermath: {
          toastText:
            "🎁 Todo el mundo persigue ahora el iPod mientras Jim trata de proteger la tetera para Pam.",
          summaryLine:
            "Michael reventó el Amigo Invisible imponiendo el Yankee Swap por culpa de un iPod",
        },
      },
      host: "michael",
      participants: [
        "michael",
        "jim",
        "pam",
        "dwight",
        "ryan",
        "phyllis",
        "angela",
        "kevin",
        "stanley",
      ],
      effect: "yankee_swap",
      announcement:
        "🎬 [T2·E10] ¡Caos navideño! Todos a la Sala de Conferencias para el Yankee Swap.",
      topicPrompt:
        "Fiesta de Navidad (Yankee Swap): el límite era 20 dólares, pero Michael compró un iPod de 400 para Ryan y desprecia la manopla tejida por Phyllis.",
      suggestedLines: [
        "Michael, la manopla que tejió Phyllis con tanto cariño merece más respeto.",
        "¿Puedo quedarme yo el iPod si cambio mi regalo?",
        "Jim estuvo semanas preparando esa tetera para Pam.",
      ],
      lines: [
        {
          who: "michael",
          text: "¡Sorpresa! Le compré a Ryan un iPod de 400 dólares. ¡Que comience el Yankee Swap!",
          action: "clap",
          cameraShot: "wide",
          react: [{ who: "phyllis", gesture: "facepalm" }],
        },
        {
          who: "phyllis",
          text: "Michael, el tope eran veinte dólares… pasé semanas tejiendo esa manopla.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "jim",
          text: "No, espera, yo preparé un regalo específico para Pam. No quiero cambiarlo.",
          action: "raise_hand",
          cameraShot: "reaction",
        },
        {
          who: "dwight",
          text: "¡Quiero el iPod! Si nadie lo defiende con fuerza bruta, es mío.",
          action: "point",
          cameraShot: "speaker",
        },
        {
          who: "kevin",
          text: "A mí me ha tocado un baño de pies. Me lo pienso quedar aunque me echéis.",
          action: "nod",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s2e10_teapot",
      title: "Pam recupera la tetera de Jim",
      room: "bullpen",
      spot: "party",
      at: t("14:00"),
      duration: 40,
      host: "pam",
      participants: ["pam", "jim", "dwight"],
      announcement:
        "🎬 [T2·E10] En el Comité de Fiestas: Pam negocia con Dwight para recuperar la tetera azul de Jim.",
      topicPrompt:
        "Pam cambia el iPod con Dwight para recuperar la tetera con recuerdos que Jim le preparó.",
      lines: [
        { who: "pam", text: "Dwight, te cambio el iPod por la tetera azul. Ahora mismo." },
        {
          who: "dwight",
          text: "¡Trato hecho! El reproductor de música digital es oficialmente propiedad Schrute.",
        },
        { who: "jim", text: "¿Elegiste la tetera en lugar del iPod? …Me alegro mucho, Pam." },
      ],
    },
  ],

  s2e22: [
    {
      id: "ev_s2e22_charity",
      title: "Preparativos de la Noche de Casino",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 50,
      isMeeting: true,
      trigger: {
        who: "kevin",
        spot: "reception_front",
        action: "Tirando fichas de póquer al suelo",
        toastText:
          "🎰 Kevin vuelca dos maletines de fichas delante de Recepción mientras Jan inspecciona la sucursal…",
        line: "¡Cuidado! ¡Que se me han caído los ases de debajo de la manga!",
        callLine: "¡LAS VEGAS LLEGA A SCRANTON! ¡TODOS A LA SALA DE CONFERENCIAS, YA!",
        preludeSteps: [
          {
            who: "kevin",
            partner: "pam",
            spot: "reception_front",
            partnerSpot: "seat_pam",
            action: "Recogiendo fichas de póquer",
            toastText:
              "🎰 1/2 · Kevin aparece en Recepción cargado de tapetes y fichas para el casino del almacén…",
            speaker: "kevin",
            line: "Esta noche tengo el brazalete de la suerte. ¡Se van a enterar en el Texas Hold'em!",
            replyWho: "pam",
            replyLine:
              "Ten cuidado por ahí abajo, Kevin… sobre todo con Michael si trae dos citas distintas.",
            gesture: "clap",
            duration: 3.5,
          },
          {
            who: "jan",
            partner: "michael",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Revisando el permiso benéfico",
            toastText:
              "💼 2/2 · Jan pide explicaciones sobre la licencia del casino mientras Michael disimula sus citas…",
            speaker: "jan",
            line: "Michael, la central autoriza la gala benéfica solo si todo el dinero va a caridad real.",
            replyWho: "michael",
            replyLine:
              "¡Por supuesto, Jan! Boy Scouts, niños… y luego habrá barra libre en el almacén.",
            gesture: "note",
            duration: 3.5,
          },
        ],
        aftermath: {
          toastText: "🃏 Darryl y Kevin bajan a revisar las mesas verdes preparadas en el Almacén.",
          summaryLine: "Michael anunció las causas benéficas de la Noche de Casino ante Jan",
        },
      },
      host: "michael",
      participants: ["michael", "jan", "kevin", "dwight", "jim", "pam", "creed", "stanley"],
      announcement: "🎬 [T2·E22] Reunión en la Sala de Conferencias por la Noche de Casino.",
      topicPrompt:
        "Noche de Casino: Michael organiza una velada de póquer benéfico en el almacén mientras Jan supervisa y Michael oculta que ha invitado a dos citas.",
      suggestedLines: [
        "Kevin tiene un brazalete de Las Vegas, va a arrasar en el Texas Hold'em.",
        "Michael, ¿no es mala idea invitar a Jan y a Carol a la misma noche?",
        "Darryl dice que ya tiene listas las mesas verdes abajo en el almacén.",
      ],
      lines: [
        {
          who: "michael",
          text: "Esta noche el almacén será Las Vegas. Cada uno juega por una causa benéfica.",
          action: "point",
          cameraShot: "wide",
          react: [{ who: "jan", gesture: "facepalm" }],
        },
        {
          who: "kevin",
          text: "Yo juego por las personas que padecen una terrible adicción al juego.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "jan",
          text: "Michael, espero que hayas comprobado la licencia benéfica de estas mesas.",
          action: "note",
          cameraShot: "reaction",
        },
        {
          who: "creed",
          text: "Para mí, caridad significa llevarme las fichas que sobren al final.",
          action: "nod",
          cameraShot: "speaker",
        },
        {
          who: "jim",
          text: "Va a ser una noche muy larga, sobre todo cuando llegue tu otra invitada.",
          action: "talk",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s2e22_poker",
      title: "¡Partida benéfica en el Almacén!",
      room: "warehouse",
      spot: "warehouse_a",
      at: t("13:45"),
      duration: 50,
      host: "kevin",
      participants: ["kevin", "jim", "darryl", "michael", "jan", "phyllis", "creed"],
      effect: "casino_crowd",
      announcement:
        "🎬 [T2·E22] ¡El Almacén se ha convertido en un casino! Baja a ver la partida de póquer.",
      topicPrompt: "Partida de póquer en el almacén durante Noche de Casino.",
      lines: [
        { who: "kevin", text: "Voy con todo. All-in. *cara completamente inexpresiva*" },
        { who: "phyllis", text: "¡Escalera real, Kevin! Lo siento muchísimo… bueno, no." },
        { who: "darryl", text: "¿Alguien ha visto a Toby limpiarle todas las fichas a Michael?" },
        { who: "jim", text: "Esta noche tengo que hablar con Pam pase lo que pase." },
      ],
    },
  ],

  s3e1: [
    {
      id: "ev_s3e1_witch_hunt",
      title: "Reunión sobre tolerancia y el beso a Oscar (T3·E01)",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 60,
      isMeeting: true,
      trigger: {
        who: "toby",
        spot: "michael_visit",
        action: "Pidiendo discreción sobre Oscar",
        toastText:
          "😬 Michael ha vuelto a meter la pata en Ventas con Oscar y Toby intenta frenarlo…",
        line: "Michael, Oscar me pidió confidencialidad. Por favor, arregla esto en privado.",
        callLine: "¡DEMOSTRACIÓN DE TOLERANCIA! ¡TODO EL MUNDO A LA SALA DE CONFERENCIAS, YA!",
        preludeSteps: [
          {
            who: "michael",
            partner: "oscar",
            spot: "accounting_mid",
            partnerSpot: "seat_oscar",
            action: "Devolviendo «Shakespeare in Love» con un insulto",
            toastText:
              "💿 1/3 · El detonante: Michael devuelve una película a Oscar en medio de la oficina con un insulto fuera de lugar…",
            speaker: "michael",
            line: "Oscar, te devuelvo «Shakespeare in Love». Se me hizo bastante «marica» delante de todos.",
            replyWho: "oscar",
            replyLine:
              "(Se queda helado y en silencio mientras toda la oficina mira incómoda hacia el suelo)",
            gesture: "facepalm",
            duration: 4.5,
          },
          {
            who: "toby",
            partner: "michael",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Reprendiendo a Michael en su despacho",
            toastText:
              "⚖️ 2/3 · Intervención de Toby: llama a Michael a su despacho, le reprende y le revela que Oscar es gay…",
            speaker: "toby",
            line: "No es una broma sin importancia, Michael. De hecho, Oscar es gay y me confió su secreto.",
            replyWho: "michael",
            replyLine:
              "¿Oscar?! ¡Imposible, le gusta el fútbol americano y no viste raro! Prometo arreglarlo con tacto.",
            gesture: "talk",
            duration: 4.8,
          },
          {
            who: "michael",
            partner: "oscar",
            spot: "accounting_mid",
            partnerSpot: "seat_oscar",
            action: "Abrazando y exponiendo a Oscar en público",
            toastText:
              "😳 3/3 · Disculpa pública: ignorando a Toby, Michael abraza fuerte a Oscar y revela su secreto delante de todos…",
            speaker: "michael",
            line: "¡Ven aquí, Oscar! *abrazo enorme* ¡Quiero que todos sepan que te acepto tal como eres, siendo gay!",
            replyWho: "oscar",
            replyLine: "Michael… suéltame. ¿Por qué acabas de contárselo a toda la oficina?",
            gesture: "facepalm",
            duration: 4.8,
          },
        ],
        aftermath: {
          toastText:
            "🚗 Acuerdo con la empresa: Jan concede a Oscar 3 meses de vacaciones pagadas y un Lexus para evitar la demanda.",
          summaryLine:
            "Tras el beso improvisado en la reunión, Jan concedió a Oscar 3 meses pagados y un Lexus",
          overrides: [
            {
              who: "oscar",
              action: "Tramitando su baja y el Lexus",
              spot: "reception_front",
              reactionLine:
                "Tres meses de vacaciones pagadas por Europa y un coche de empresa. Hasta luego, Scranton.",
              mins: 25,
            },
            {
              who: "jan",
              action: "Evitando la demanda legal",
              spot: "michael_visit",
              reactionLine:
                "Un beso en los labios delante de veinte testigos, Michael. Acaba de costarnos un Lexus.",
              mins: 25,
            },
          ],
        },
      },
      host: "michael",
      participants: ["michael", "oscar", "toby", "dwight", "angela", "ryan", "pam", "kevin", "jan"],
      announcement:
        "🎬 [T3·E01] ¡Crisis total de RRHH en la Sala de Conferencias! Todos a sus asientos.",
      topicPrompt:
        "Gay Witch Hunt (T3·E01): tras llamar «marica» a la película de Oscar, saber por Toby que Oscar es gay y sacarlo del armario con un abrazo en Ventas, Michael convoca a todos en la sala de conferencias y acaba besando en los labios a un paralizado Oscar mientras toda la oficina se queda de piedra.",
      suggestedLines: [
        "Michael, ¡suéltale ya y déjale volver a su mesa!",
        "Toby, esto pasa literalmente diez niveles por encima de cualquier formulario de RRHH.",
        "Jan está pálida en la silla mirando el teléfono del departamento legal…",
      ],
      lines: [
        {
          who: "michael",
          text: "Quiero demostrar que esta oficina es moderna. Oscar, pasa al frente y explícales tu estilo de vida.",
          action: "point",
          cameraShot: "wide",
          react: [
            { who: "oscar", gesture: "facepalm" },
            { who: "toby", gesture: "facepalm" },
          ],
        },
        {
          who: "oscar",
          text: "Michael, por favor, para ya este espectáculo. No tengo nada que explicar aquí delante.",
          action: "facepalm",
          cameraShot: "speaker",
        },
        {
          who: "toby",
          text: "Michael, acordamos hace cinco minutos que era estrictamente confidencial y privado.",
          action: "talk",
          cameraShot: "speaker",
          react: [{ who: "angela", gesture: "facepalm" }],
        },
        {
          who: "dwight",
          text: "¡Compré un detector de segunda mano! Aunque parece que solo pita cerca de los archivadores.",
          action: "raise_hand",
          cameraShot: "speaker",
        },
        {
          who: "michael",
          text: "¡Mirad que no me da ningún reparo mostrar afecto a un hombre gay! *agarra la cara de Oscar y lo besa en los labios*",
          action: "pace",
          cameraShot: "host",
          react: [
            { who: "oscar", gesture: "facepalm" },
            { who: "pam", gesture: "facepalm" },
            { who: "kevin", gesture: "facepalm" },
          ],
        },
        {
          who: "jan",
          text: "…Dios mío. Oscar, pasa por mi despacho después de esto. Hablaremos de vacaciones pagadas.",
          action: "note",
          cameraShot: "speaker",
          react: [{ who: "ryan", gesture: "note" }],
        },
      ],
    },
    {
      id: "ev_s3e1_ryan_border",
      title: "Dwight marca la línea en la mesa de Jim",
      room: "bullpen",
      spot: "bullpen_mid",
      at: t("13:15"),
      duration: 40,
      host: "dwight",
      participants: ["dwight", "ryan", "stanley", "phyllis"],
      announcement:
        "🎬 [T3·E01] En Ventas: Dwight vigila a Ryan ahora que ocupa el antiguo escritorio de Jim.",
      topicPrompt:
        "Ryan debuta como vendedor sentado frente a Dwight mientras Jim está en Stamford.",
      lines: [
        {
          who: "dwight",
          text: "Regla uno del antiguo escritorio de Jim: tus codos no cruzan mi frontera.",
        },
        { who: "ryan", text: "Dwight, solo quiero cerrar dos ventas hoy y terminar mi informe." },
        { who: "stanley", text: "Al menos este no mete grapadoras en gelatina cada martes." },
      ],
    },
  ],

  s3e8: [
    {
      id: "ev_s3e8_merger_meeting",
      title: "Bienvenida a Stamford y vídeo «Lazy Scranton»",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "andy",
        spot: "reception_front",
        action: "Cantando «Cornell» con los de Stamford",
        toastText:
          "📦 Acaban de bajar del ascensor los cinco empleados nuevos de Stamford liderados por Andy…",
        line: "¡Ri-dit-dit-di-do! ¡Stamford ha llegado a Scranton, chicos!",
        callLine: "¡FUSIÓN OFICIAL! ¡STAMFORD Y SCRANTON A LA SALA DE CONFERENCIAS, YA!",
        preludeSteps: [
          {
            who: "karen",
            partner: "jim",
            spot: "reception_front",
            partnerSpot: "bullpen_west",
            action: "Descargando cajas tras cerrar Stamford",
            toastText:
              "📦 1/2 · Jim vuelve de Stamford acompañado por Karen, Andy, Martin, Tony Gardner y Hannah…",
            speaker: "karen",
            line: "Bueno, se acabó Connecticut. A ver qué tal nos reciben en tu antigua oficina, Jim.",
            replyWho: "jim",
            replyLine: "Prepárate para ver a Michael con una cámara y a Dwight con la cara seria.",
            gesture: "nod",
            duration: 3.5,
          },
          {
            who: "andy",
            partner: "tony",
            spot: "bullpen_east",
            partnerSpot: "seat_tony",
            action: "Peloteando y cantando a capela",
            toastText:
              "🎶 2/2 · Andy busca congraciarse a voces mientras Tony Gardner suda solo de pensar en la orientación…",
            speaker: "andy",
            line: "¡Ri-dit-dit-di-do! Aquí vamos a hacer historia, Tony. ¡Dame un choque de puños!",
            replyWho: "tony",
            replyLine: "Ojalá nadie nos pida hacer ejercicios raros de integración hoy…",
            gesture: "clap",
            duration: 3.5,
          },
        ],
        aftermath: {
          toastText:
            "🧳 Tony Gardner vuelve echando humo a su escritorio tras el intento de subirle a la mesa.",
          summaryLine:
            "Michael estrenó el rap «Lazy Scranton» para recibir a los cinco fichajes de Stamford",
        },
      },
      host: "michael",
      participants: [
        "michael",
        "dwight",
        "jim",
        "andy",
        "karen",
        "tony",
        "martin",
        "hannah",
        "pam",
      ],
      announcement: "🎬 [T3·E08] ¡Todos a la Sala de Conferencias! Orientación de Stamford.",
      topicPrompt:
        "La Fusión (T3·E08): Cierra Stamford y llegan Jim, Andy, Karen, Martin Nash, Tony Gardner y Hannah. Michael pone el vídeo «Lazy Scranton» e intenta subir a Tony encima de la mesa.",
      suggestedLines: [
        "¡Bienvenidos a Scranton! ¿Cómo era trabajar en la sucursal de Stamford?",
        "Michael, deja a Tony tranquilo, que pesa demasiado para subirlo a una mesa.",
        "¿Alguien más cree que Oscar volverá pronto de su baja?",
      ],
      lines: [
        {
          who: "michael",
          text: "¡Sittin' in my office with a plate of grilled bacon! ¡Bienvenidos a Scranton, Stamford!",
          action: "clap",
          cameraShot: "wide",
          react: [{ who: "karen", gesture: "facepalm" }],
        },
        {
          who: "karen",
          text: "¿Eso ha sido un vídeo de rap sobre la ciudad eléctrica? En Stamford no hacíamos esto.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "michael",
          text: "¡Tony Gardner, queremos verte bien! Dwight, ayúdame a subirle encima de la mesa.",
          action: "point",
          cameraShot: "host",
        },
        {
          who: "tony",
          text: "Michael, como me vuelvas a tocar el cinturón, cojo mi caja ahora mismo.",
          action: "facepalm",
          cameraShot: "speaker",
        },
        {
          who: "andy",
          text: "¡Me encanta la energía! ¡Ri-dit-dit-di-do! ¡Cornell apoya Scranton!",
          action: "clap",
          cameraShot: "reaction",
        },
        {
          who: "hannah",
          text: "¿Dónde puedo calentar el biberón sin que nadie rapee encima de mí?",
          action: "raise_hand",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s3e8_tony_quits",
      title: "Tony Gardner dimite delante de Ventas",
      room: "bullpen",
      spot: "bullpen_mid",
      at: t("11:50"),
      duration: 38,
      host: "tony",
      participants: ["michael", "tony", "dwight", "karen", "andy"],
      announcement:
        "🎬 [T3·E08] ¡Drama en Ventas! Tony Gardner no aguanta más el primer día de fusión.",
      topicPrompt:
        "Tony Gardner decide dimitir el mismo día de la fusión y Michael grita que está despedido.",
      lines: [
        { who: "tony", text: "Lo siento, Michael. Me voy. Dimito ahora mismo." },
        {
          who: "michael",
          text: "¡NO PUEDES DIMITIR! ¡ESTÁS DESPEDIDO! ¡Toby, tramítale el despido!",
        },
        { who: "karen", text: "Genial. Cuatro horas en Scranton y ya hemos perdido a uno." },
      ],
    },
    {
      id: "ev_s3e8_andy_acc",
      title: "Andy intenta encajar en Contabilidad",
      room: "accounting",
      spot: "accounting_mid",
      at: t("14:10"),
      duration: 35,
      host: "andy",
      participants: ["andy", "angela", "kevin", "karen"],
      announcement:
        "🎬 [T3·E08] En Contabilidad: Andy ocupa la mesa de Oscar mientras éste sigue de baja.",
      topicPrompt:
        "Andy Bernard se sienta en Contabilidad porque Oscar está de baja y trata de hacer amigos cantando.",
      lines: [
        { who: "andy", text: "Chicos de Contabilidad, ¿os mola el beatbox? *tssss-taka-tssss*." },
        {
          who: "angela",
          text: "Aquí sumamos columnas en silencio. Deja de hacer ruido con la boca.",
        },
        { who: "kevin", text: "A mí me ha gustado el segundo sonido. Hazlo otra vez." },
      ],
    },
  ],

  s3e9: [
    {
      id: "ev_s3e9_prison_mike",
      title: "Seminario obligatorio de «Prison Mike»",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "martin",
        spot: "bullpen_mid",
        action: "Comentando cómo era la cárcel",
        toastText:
          "🚨 Martin Nash comenta su etapa en prisión y el personal bromea con que era mejor que trabajar aquí…",
        line: "Pues en la cárcel al menos no tenía que aguantar reuniones eternas…",
        callLine:
          "¡¿MEJOR QUE MI OFICINA?! ¡TODOS A LA SALA DE CONFERENCIAS, YA! ¡OS VAIS A ENTERAR!",
        preludeSteps: [
          {
            who: "martin",
            partner: "kevin",
            spot: "bullpen_mid",
            partnerSpot: "accounting_mid",
            action: "Contando su pasado en el módulo B",
            toastText:
              "🗣️ 1/2 · Al descubrir que Martin Nash estuvo en prisión, Kevin y Pam le preguntan si era tan duro como dicen…",
            speaker: "martin",
            line: "Estuve un año por uso de información privilegiada. Tenía tiempo libre, patio y sin gritos.",
            replyWho: "kevin",
            replyLine: "Guau… ¿y nadie te obligaba a quedarte después de las cinco?",
            gesture: "talk",
            duration: 3.4,
          },
          {
            who: "jim",
            partner: "michael",
            spot: "michael_visit",
            partnerSpot: "seat_michael",
            action: "Picando a Michael con la cárcel",
            toastText:
              "🧣 2/2 · Michael escucha que prefieren la cárcel a Dunder Mifflin y busca furioso un pañuelo morado…",
            speaker: "jim",
            line: "Michael, la verdad es que comparada con tu última reunión, la cárcel suena casi relajante.",
            replyWho: "michael",
            replyLine:
              "¿Ah, sí? ¿Queréis ver lo dura que es la calle? ¡Esperad a conocer a Prison Mike!",
            gesture: "point",
            duration: 3.4,
          },
        ],
        aftermath: {
          toastText: "🧣 Michael se quita por fin el pañuelo morado tras hablar de los Dementores.",
          summaryLine:
            "Michael se disfrazó de «Prison Mike» para asustar a todos por culpa de Martin Nash",
        },
      },
      host: "michael",
      participants: [
        "michael",
        "martin",
        "dwight",
        "jim",
        "pam",
        "andy",
        "karen",
        "stanley",
        "kevin",
      ],
      effect: "prison_mike",
      announcement:
        "🎬 [T3·E09] ¡Todos a la Sala de Conferencias! Llega «Prison Mike» con su pañuelo morado.",
      topicPrompt:
        "El Convict (T3·E09): Al enterarse de que Martin Nash estuvo en prisión y algunos bromean diciendo que la cárcel es mejor que trabajar aquí, Michael aparece disfrazado de Prison Mike con pañuelo morado en la sala de conferencias.",
      suggestedLines: [
        "Prison Mike, ¿de verdad había Dementores volando por el patio de la cárcel?",
        "Martin, ¿de verdad se comía mejor en prisión que en la sala de descanso?",
        "Michael, ¡abre la puerta que hace calor y tenemos llamadas!",
      ],
      lines: [
        {
          who: "michael",
          text: "¡Soy Prison Mike! ¿Creéis que la oficina es dura? ¡En la cárcel solo se comen gachas!",
          action: "pace",
          cameraShot: "wide",
          react: [{ who: "martin", gesture: "facepalm" }],
        },
        {
          who: "jim",
          text: "Prison Mike, ¿qué fue lo peor de estar entre rejas?",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "michael",
          text: "¡Lo peor de la prisión eran los Dementores! Volaban por todas partes y te chupaban el alma.",
          action: "point",
          cameraShot: "host",
          react: [{ who: "andy", gesture: "nod" }],
        },
        {
          who: "martin",
          text: "Michael… eso sale en las películas de Harry Potter. Yo estuve allí de verdad.",
          action: "facepalm",
          cameraShot: "speaker",
        },
        {
          who: "andy",
          text: "Oye, Prison Mike, me has puesto los pelos de punta. *gulps*",
          action: "nod",
          cameraShot: "reaction",
        },
        {
          who: "karen",
          text: "¿Podemos volver a nuestras mesas? Nadie quiere volver a entrar aquí.",
          action: "raise_hand",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s3e9_kitchen",
      title: "Martin Nash cuenta cómo era la cárcel",
      room: "kitchen",
      spot: "kitchen_mid",
      at: t("13:20"),
      duration: 38,
      host: "martin",
      participants: ["martin", "kevin", "stanley", "phyllis"],
      announcement:
        "🎬 [T3·E09] En la Cocina: Martin Nash explica que en prisión no había reuniones de Prison Mike.",
      topicPrompt: "Los compañeros rodean a Martin Nash en la cocina para preguntarle por prisión.",
      lines: [
        {
          who: "kevin",
          text: "Martin, en la cárcel… ¿de verdad te dejaban hacer siesta después de comer?",
        },
        {
          who: "martin",
          text: "Tenía gimnasio, biblioteca y nadie me encerraba en una sala a gritar sobre Dementores.",
        },
        { who: "stanley", text: "Empiezo a pensar que elegiste mejor el alojamiento." },
      ],
    },
  ],

  s3e13: [
    {
      id: "ev_s3e13_phone_punch",
      title: "El móvil oculto en el techo y el puñetazo de Andy",
      room: "bullpen",
      spot: "bullpen_mid",
      at: t("09:20"),
      duration: 45,
      host: "jim",
      participants: ["jim", "pam", "andy", "karen", "ryan"],
      effect: "wall_hole",
      announcement:
        "🎬 [T3·E13] ¡En Ventas! Un móvil suena sobre las placas del techo encima de Andy…",
      topicPrompt:
        "El Regreso (T3·E13): Dwight está en Staples, Oscar vuelve y Andy ocupa la mesa de Dwight. Jim y Pam esconden el móvil de Andy en el falso techo hasta que Andy pierde los nervios y golpea la pared.",
      lines: [
        {
          who: "jim",
          text: "*marcando en secreto el teléfono de Andy…* ¡Rockin' Robin, tweet-tweet-tweet!",
        },
        {
          who: "andy",
          text: "¡¿DÓNDE ESTÁ MI MALDITO TELÉFONO?! ¡Lleva sonando una hora en esta oficina!",
        },
        { who: "pam", text: "Igual te lo dejaste en el coche, Andy… *conteniendo la risa*" },
        {
          who: "andy",
          text: "¡NO ME GUSTA ESA SONRISA! *¡PUM! Le da un puñetazo a la pared junto al Anexo*",
        },
        {
          who: "karen",
          text: "Andy acaba de abrir un boquete en la pared. Se va directo a control de ira.",
        },
      ],
    },
    {
      id: "ev_s3e13_meeting",
      title: "Reunión de moral (mientras Dwight sigue en Staples)",
      room: "conf",
      spot: "conf_s1",
      at: t("11:25"),
      duration: 50,
      isMeeting: true,
      trigger: {
        who: "oscar",
        spot: "reception_front",
        action: "Volviendo tras su baja",
        toastText: "🎒 ¡Oscar regresa por Recepción… y descubre el boquete de Andy en la pared!",
        line: "Hola chicos, ya estoy de vuelta. …Espera, ¿qué le ha pasado a esa pared?",
        callLine: "¡OSCAR HA VUELTO! ¡TODOS A LA SALA DE CONFERENCIAS, YA! ¡FIESTA DE BIENVENIDA!",
        preludeSteps: [
          {
            who: "oscar",
            partner: "kevin",
            spot: "accounting_mid",
            partnerSpot: "seat_kevin",
            action: "Descubriendo el boquete en la pared",
            toastText:
              "🎒 1/2 · Oscar vuelve de sus vacaciones pagadas y se topa con un agujero enorme en la pared…",
            speaker: "oscar",
            line: "Me voy tres meses con el Lexus de la empresa… ¿y al volver habéis reventado el tabique?",
            replyWho: "kevin",
            replyLine:
              "Fue Andy buscando su móvil en el techo. Y Dwight ahora vende folios en Staples.",
            gesture: "facepalm",
            duration: 3.5,
          },
          {
            who: "andy",
            partner: "michael",
            spot: "annex_mid",
            partnerSpot: "michael_visit",
            action: "Poniéndose hielo en los nudillos",
            toastText:
              "🧊 2/2 · Michael lamenta la marcha de Dwight mientras Andy es enviado a control de la ira…",
            speaker: "andy",
            line: "La pared me provocó, Michael… necesito respirar y empezar el curso de control de ira.",
            replyWho: "michael",
            replyLine:
              "Qué desastre sin Dwight. ¡Al menos tenemos a Oscar de vuelta, hagamos fiesta!",
            gesture: "facepalm",
            duration: 3.5,
          },
        ],
        aftermath: {
          toastText:
            "🧘 Andy prepara las maletas para diez semanas de terapia de control de la ira.",
          summaryLine:
            "Bienvenida accidentada a Oscar mientras Dwight seguía en Staples y Andy iba a terapia",
          overrides: [
            {
              who: "andy",
              action: "Camino a terapia de ira",
              spot: "reception_front",
              reactionLine: "Ommm… diez semanas de calma y vuelvo como nuevo.",
              mins: 20,
            },
          ],
        },
      },
      host: "michael",
      participants: ["michael", "andy", "jim", "pam", "karen", "oscar", "kevin"],
      announcement: "🎬 [T3·E13] ¡Reunión en la Sala de Conferencias! Bienvenida a Oscar.",
      topicPrompt:
        "Reunión en la Sala de Conferencias en el episodio El Regreso: Oscar acaba de regresar de su baja pagada, Andy tiene la mano dolorida tras golpear la pared y Michael echa de menos a Dwight.",
      suggestedLines: [
        "¡Bienvenido de vuelta, Oscar! ¿Qué tal el descanso de tres meses?",
        "Michael, si echas tanto de menos a Dwight, ¿por qué no vas a buscarlo a Staples?",
        "Andy, mejor que nadie te esconda otro móvil hasta el mes que viene.",
      ],
      lines: [
        {
          who: "michael",
          text: "Primero: bienvenido de vuelta, Oscar. Segundo: ¿por qué nadie es tan leal como Dwight?",
          action: "pace",
          cameraShot: "wide",
          react: [{ who: "oscar", gesture: "nod" }],
        },
        {
          who: "oscar",
          text: "Gracias, Michael. Aunque ese agujero en la pared del pasillo es nuevo.",
          action: "point",
          cameraShot: "speaker",
        },
        {
          who: "andy",
          text: "Es un problema de diseño arquitectónico… y me voy diez semanas a terapia.",
          action: "facepalm",
          cameraShot: "reaction",
        },
        {
          who: "jim",
          text: "La verdad es que sin Dwight la oficina está rara. Casi se echan de menos sus gritos.",
          action: "talk",
          cameraShot: "player",
        },
      ],
    },
  ],

  s3e19: [
    {
      id: "ev_s3e19_pepper",
      title: "Dwight detiene a Roy con espray de pimienta",
      room: "reception",
      spot: "reception_front",
      at: t("09:20"),
      duration: 40,
      host: "dwight",
      participants: ["dwight", "jim", "darryl", "pam", "toby"],
      announcement:
        "🎬 [T3·E19] ¡Emergencia en Recepción! Dwight acaba de defender a Jim con su espray táctico.",
      topicPrompt:
        "Al inicio de La Negociación, Dwight protege a Jim usando espray de pimienta contra Roy, que acaba despedido.",
      lines: [
        {
          who: "dwight",
          text: "¡Quietos todos! Amenaza neutralizada con cápsaicina grado militar.",
        },
        { who: "jim", text: "Tío… me acabas de salvar la cara literalmente. Gracias, Dwight." },
        {
          who: "toby",
          text: "RRHH ha tramitado el despido inmediato de Roy del almacén. Abrid las ventanas, por favor.",
        },
        {
          who: "darryl",
          text: "Alguien tenía que frenar a Roy. Ahora me toca renegociar mi sueldo con Michael.",
        },
      ],
    },
    {
      id: "ev_s3e19_missterious",
      title: "Negociación salarial (Michael con traje «MISSterious»)",
      room: "conf",
      spot: "conf_s1",
      at: t("11:00"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "darryl",
        spot: "michael_visit",
        action: "Pidiendo su subida de sueldo del 10%",
        toastText:
          "💼 Darryl sube del almacén exigiendo un aumento mientras Michael estrena traje nuevo…",
        line: "Michael, nos acaban de cargar otro camión extra. Quiero mi subida del 10%.",
        callLine: "¡HORA DE NEGOCIAR COMO TIBURONES! ¡TODOS A LA SALA DE CONFERENCIAS, YA!",
        preludeSteps: [
          {
            who: "darryl",
            partner: "toby",
            spot: "bullpen_east",
            partnerSpot: "annex_mid",
            action: "Presentando los números del almacén",
            toastText:
              "📦 1/2 · Tras el despido de Roy, Darryl asume el turno extra y reclama una subida del 10%…",
            speaker: "darryl",
            line: "Saco más camiones con un mozo menos. Hoy subo a negociar mi sueldo cara a cara.",
            replyWho: "toby",
            replyLine:
              "Tienes toda la razón, Darryl… pero hoy Michael está leyendo trucos de negociación de internet.",
            gesture: "talk",
            duration: 3.5,
          },
          {
            who: "michael",
            partner: "pam",
            spot: "michael_visit",
            partnerSpot: "reception_front",
            action: "Presumiendo de su traje sin bolsillos",
            toastText:
              "🧥 2/2 · Michael aparece con un traje entallado de mujer marca «MISSterious» convencido de que impone…",
            speaker: "michael",
            line: "Un corte europeo impresionante, Pam. Fíjate cómo abotona hacia la izquierda.",
            replyWho: "pam",
            replyLine:
              "Michael… ese pantalón no tiene bolsillos. Creo que lo compraste en la sección de señora.",
            gesture: "facepalm",
            duration: 3.5,
          },
        ],
        aftermath: {
          toastText:
            "📉 Darryl consigue su subida del 10% mientras Michael se cambia por fin de chaqueta.",
          summaryLine:
            "Darryl ganó su negociación salarial gracias al traje femenino «MISSterious» de Michael",
        },
      },
      host: "michael",
      participants: ["michael", "darryl", "toby", "dwight", "andy", "jim", "karen"],
      announcement: "🎬 [T3·E19] ¡Sala de Conferencias! Negociación salarial con Darryl.",
      topicPrompt:
        "La Negociación (T3·E19): Darryl pide un aumento del 10%, Michael sigue tácticas de negociación de Wikipedia llevando sin saberlo un traje de mujer marca MISSterious, y Andy pide que le llamen Drew.",
      suggestedLines: [
        "Michael, ese traje no tiene bolsillos en el pantalón… es de mujer.",
        "Darryl mantiene el almacén sin accidentes todo el año, se merece el aumento.",
        "Hola Drew, ¿qué tal fue la terapia de control de la ira?",
      ],
      lines: [
        {
          who: "darryl",
          text: "Michael, antes de empezar a negociar… ¿por qué llevas un traje rosa entallado de mujer?",
          action: "point",
          cameraShot: "speaker",
          react: [{ who: "jim", gesture: "nod" }],
        },
        {
          who: "michael",
          text: "¡Es un corte europeo! Lo compré en una cesta. Técnica de negociación uno: silencio incómodo.",
          action: "pace",
          cameraShot: "host",
        },
        {
          who: "toby",
          text: "En la etiqueta del cuello pone literalmente «MISSterious».",
          action: "note",
          cameraShot: "reaction",
        },
        {
          who: "andy",
          text: "Por cierto, equipo: ahora podéis llamarme «Drew». Respiro paz interior.",
          action: "raise_hand",
          cameraShot: "wide",
        },
        {
          who: "jim",
          text: "No te voy a llamar Drew, Andy. Pero el traje de Michael es oro puro.",
          action: "talk",
          cameraShot: "player",
        },
      ],
    },
  ],

  s4e1: [
    {
      id: "ev_s4e1_rabies_meeting",
      title: "Reunión de emergencia contra la rabia (Fun Run)",
      room: "conf",
      spot: "conf_s1",
      at: t("09:20"),
      duration: 55,
      isMeeting: true,
      trigger: {
        who: "meredith",
        spot: "reception_front",
        action: "Cojeando tras el atropello en el parking",
        toastText:
          "🚑 Meredith entra con muletas por Recepción… y Michael saca un cheque gigante contra la rabia.",
        line: "Michael, casi me partes la cadera con el coche en el aparcamiento.",
        callLine:
          "¡LE SALVÉ LA VIDA! ¡TODOS A LA SALA DE CONFERENCIAS, YA! ¡EMERGENCIA CONTRA LA RABIA!",
        preludeSteps: [
          {
            who: "meredith",
            partner: "pam",
            spot: "reception_front",
            partnerSpot: "seat_pam",
            action: "Entrando con muletas y escayola",
            toastText:
              "🚑 1/2 · Meredith llega cojeando con muletas después de que Michael la atropellara en el aparcamiento…",
            speaker: "meredith",
            line: "Un pequeño golpe en la cadera… pero el doctor dijo que había que vacunarme por un murciélago.",
            replyWho: "pam",
            replyLine:
              "¿Un murciélago? ¡Como se entere Michael dirá que te salvó la vida atropellándote!",
            gesture: "facepalm",
            duration: 3.6,
          },
          {
            who: "michael",
            partner: "dwight",
            spot: "bullpen_mid",
            partnerSpot: "seat_dwight",
            action: "Encargando fettuccine y dorsales",
            toastText:
              "🍝 2/2 · Michael decide que el equipo debe correr 5 kilómetros ahora mismo para erradicar la rabia…",
            speaker: "michael",
            line: "¡Fue un milagro, Dwight! ¡Si no la atropello no le detectan la rabia! Encarga cinco kilos de pasta Alfredo.",
            replyWho: "dwight",
            replyLine:
              "¡Solidaridad contra la hidrofobia! Prohibiremos beber agua durante los cinco kilómetros.",
            gesture: "point",
            duration: 3.6,
          },
        ],
        aftermath: {
          toastText:
            "🍝 Llega el pedido de fettuccine Alfredo antes de salir a correr desde Recepción.",
          summaryLine:
            "Michael convenció a la plantilla para correr 5 km contra la rabia tras atropellar a Meredith",
        },
      },
      host: "michael",
      participants: [
        "michael",
        "dwight",
        "jim",
        "pam",
        "meredith",
        "angela",
        "andy",
        "kevin",
        "stanley",
      ],
      announcement: "🎬 [T4·E01] ¡Sala de Conferencias! Maratón benéfico contra la rabia.",
      topicPrompt:
        "Carrera benéfica / Fun Run (T4·E01): Michael atropelló a Meredith en el aparcamiento, pero jura que le salvó la vida porque le detectaron rabia. Organiza una carrera benéfica de 5 km prohibiendo beber agua y repartiendo fettuccine Alfredo.",
      suggestedLines: [
        "Michael, la rabia tiene vacuna y prácticamente nadie muere de eso aquí.",
        "¿No es peligroso comer un kilo de pasta Alfredo justo antes de correr 5 km?",
        "¿Puedo apuntarme si nos dejas beber agua por el camino?",
      ],
      lines: [
        {
          who: "michael",
          text: "Esta mañana atropellé a Meredith… ¡y gracias a Dios, porque tenía rabia! Vamos a curarla corriendo 5 km.",
          action: "point",
          cameraShot: "wide",
          react: [{ who: "meredith", gesture: "facepalm" }],
        },
        {
          who: "meredith",
          text: "Tengo la pelvis rota, Michael. Y la rabia se cura con tres inyecciones.",
          action: "talk",
          cameraShot: "speaker",
        },
        {
          who: "angela",
          text: "Mi gato Sprinkles ha muerto esta mañana. No estoy para carreras benéficas.",
          action: "facepalm",
          cameraShot: "reaction",
        },
        {
          who: "andy",
          text: "Para aguantar la carrera me he puesto tiritas en el pecho. ¡Preparad los carbohidratos!",
          action: "clap",
          cameraShot: "speaker",
        },
        {
          who: "stanley",
          text: "Como me obligues a correr sin agua llamo al sindicato.",
          action: "nod",
          cameraShot: "player",
        },
      ],
    },
    {
      id: "ev_s4e1_funrun_start",
      title: "¡Salida del Fun Run en Recepción!",
      room: "reception",
      spot: "reception_side",
      at: t("13:30"),
      duration: 50,
      host: "michael",
      participants: ["michael", "jim", "pam", "andy", "kevin", "stanley", "dwight", "meredith"],
      effect: "fun_run_jog",
      announcement:
        "🎬 [T4·E01] ¡Empieza el Fun Run! Todos se reúnen en la línea de salida junto a Recepción.",
      topicPrompt:
        "Los empleados salen a correr el maratón contra la rabia desde la línea de meta pintada junto a Recepción.",
      lines: [
        {
          who: "michael",
          text: "*engullendo fettuccine Alfredo* ¡Tres, dos, uno… POR LA RABIA! ¡Que nadie beba agua!",
        },
        {
          who: "jim",
          text: "Pam, ¿vamos directamente andando a por un café y una lámpara en el mercadillo?",
        },
        {
          who: "andy",
          text: "¡Ay! ¡Mis pezones! ¡Debí ponerme más tiritas! *trotando desesperado*",
        },
        {
          who: "kevin",
          text: "Me duele el estómago. Voy a esperar aquí sentado hasta que vuelva Michael.",
        },
      ],
    },
  ],
};
