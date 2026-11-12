import type { Mail } from "../engine/state";
import type { EventId } from "../types";

export const BASE_MAILS: Mail[] = [
  { id: "m1", from: "Michael Scott", subject: "¡¡¡BIENVENIDO!!!", body: "Bienvenido a Dunder Mifflin Scranton, la mejor sucursal de la mejor empresa de papel del mundo (según yo). Mi puerta siempre está abierta. Salvo cuando está cerrada. — Michael Scott, Director Regional (y amigo)" },
  { id: "m2", from: "Dwight Schrute", subject: "NORMAS DE SEGURIDAD (OBLIGATORIO)", body: "1. No toques mi mesa. 2. No toques mi grapadora. 3. En caso de ataque de oso, hazte el muerto. En caso de ataque de Jim, avísame inmediatamente. — D. Schrute, Asistente DEL Director Regional" },
  { id: "m3", from: "Angela Martin", subject: "Uso de la nevera", body: "Recordatorio: los táperes sin nombre se tirarán el viernes. Kevin, esto va por ti. Y por el chili." },
  { id: "m4", from: "Jim Halpert", subject: "Consejo de ventas", body: "Truco para el teléfono: escucha cómo saluda el cliente. Si va con prisa, dale datos. Si es simpático, sé cercano. Si es tacaño, habla de precio. Si se ríe, hazle reír. Y no repitas lo mismo tres veces seguidas, que se nota." },
  { id: "m5", from: "Toby Flenderson", subject: "Formación obligatoria de RRHH", body: "Hola. Este mes toca la formación sobre conducta en el lugar de trabajo. Michael, por favor, no vuelvas a romper el proyector. Gracias. — Toby" },
  { id: "m6", from: "Kelly Kapoor", subject: "¡¡OMG!! 😱😱😱", body: "¿Has visto lo que llevaba Meredith ayer? No, yo tampoco, pero me lo han contado. Ven al anexo y te lo cuento. Trae cotilleos." },
];

export const EVENT_MAILS: Partial<Record<EventId, Mail>> = {
  halloween: { id: "ev", from: "Comité de fiestas", subject: "🎃 Concurso de disfraces", body: "Hoy es Halloween. Disfraz obligatorio (Michael insiste). El ganador recibirá un vale para… ser el ganador. Habla con Michael para participar." },
  navidad: { id: "ev", from: "Comité de fiestas", subject: "🎄 Fiesta de Navidad y amigo invisible", body: "La fiesta es esta tarde en la sala de descanso. Límite del amigo invisible: 20 $. Michael, el límite es 20 $. Las ventas de estos días cuentan un 20% más." },
  sanvalentin: { id: "ev", from: "Pam Beesly", subject: "💘 Tarjetas de San Valentín", body: "Michael ha hecho tarjetas para todos (con purpurina). Si tienes un rato, ayúdame a repartirlas. — Pam" },
  cumplemichael: { id: "ev", from: "Michael Scott", subject: "🎂 Hoy NO es mi cumpleaños (sí lo es)", body: "No quiero regalos. Ni fiesta. Ni tarta de chocolate con mi nombre. Pero si los hubiera, me encantaría que fuera a las 15:00." },
  sanpatricio: { id: "ev", from: "Michael Scott", subject: "☘️ ¡Feliz San Patricio!", body: "Hoy todos somos irlandeses. He escondido tres tréboles por la oficina. Ven a verme si quieres participar. Sláinte." },
  pretzel: { id: "ev", from: "Pam Beesly", subject: "🥨 ¡Día del Pretzel!", body: "El puesto de pretzels gratis está en recepción. Por favor, no os coláis delante de Stanley. Por vuestra seguridad." },
  viernes: { id: "ev", from: "Michael Scott", subject: "🌺 Viernes casual", body: "Hoy se puede venir cómodo. Cómodo no significa en pijama, Creed." },
};
