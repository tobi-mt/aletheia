/**
 * Bulk translation addition script
 * Adds notifications, status, placeholders, and labels to all language files
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const LOCALES_DIR = path.join(PROJECT_ROOT, 'src/locales');

// Translation data for all languages
const translations = {
  es: {
    notifications: {
      startingPathPrepared: "Camino inicial preparado",
      startingPathPreparedBody: "Tu primera pregunta está lista en el campo Companion. Envíala cuando estés listo.",
      setupSaved: "Configuración guardada",
      setupSavedBody: "Tus preferencias están listas. Empieza con una pregunta, una decisión o la reflexión de hoy.",
      decisionCompanionOpened: "Compañero de decisiones abierto",
      decisionCompanionOpenedBody: "Continúa la decisión con presión, consejo, costo y el próximo paso fiel a la vista.",
      reflectionPrepared: "Reflexión preparada",
      reflectionPreparedBody: "La sabiduría de hoy se ha colocado en Reflexionar para que puedas responder en silencio.",
      timelineOpened: "Línea de tiempo abierta",
      timelineOpenedBody: "Busca presión recurrente, miedo, comparación, consejo y claridad a lo largo del tiempo.",
      questionReady: "Pregunta lista",
      questionReadyBody: "Aletheia preparó una pregunta inicial enfocada. Ajústala o envíala tal como está.",
      shareSheetOpened: "Hoja de compartir abierta",
      shareSheetOpenedBody: "Solo se comparte el enlace de la app Aletheia. Tu contenido privado permanece privado.",
      shareCancelled: "Compartir cancelado",
      shareCancelledBody: "No se compartió nada. Aún puedes copiar el enlace de la app si quieres.",
      linkCopied: "Enlace copiado",
      linkCopiedBody: "Solo se copió el enlace público de invitación a Aletheia.",
      copyUnavailable: "Copia no disponible",
      copyUnavailableBody: "El enlace de invitación se muestra en el mensaje de estado para que puedas compartirlo manualmente.",
      feedbackSaved: "Comentarios guardados",
      feedbackSavedBody: "Gracias. Esto ayuda a dar forma a respuestas más claras y sabias.",
      decisionDraftStarted: "Borrador de decisión iniciado",
      decisionDraftStartedBody: "Aletheia movió la pregunta al Compañero de Decisiones para que pueda rastrearse con el tiempo.",
      reflectionDraftPrepared: "Borrador de reflexión preparado",
      reflectionDraftPreparedBody: "La pregunta y el consejo están listos en Reflexionar. Añade lo que estás notando.",
      counselSummaryCreated: "Resumen de consejo creado",
      counselSummaryCreatedBody: "Un resumen listo para mentor está esperando en Círculo de Consejo. Comparte solo cuando elijas.",
      deeperFollowUpReady: "Seguimiento profundo listo",
      deeperFollowUpReadyBody: "El campo Companion ahora pide a Aletheia expandir el consejo con más profundidad y claridad práctica.",
      waitingRhythmPrepared: "Ritmo de espera preparado",
      waitingRhythmPreparedBody: "Se creó un camino de espera de 3 días en el Compañero de Decisiones.",
      preferencesSynced: "Preferencias sincronizadas",
      preferencesSyncedBody: "Tu idioma, región, traducción bíblica y configuración de voz están sincronizados.",
      preferencesSaved: "Preferencias guardadas",
      preferencesSavedBody: "Estos ajustes están guardados en este dispositivo. Inicia sesión para sincronizarlos entre dispositivos.",
      preferencesSavedLocally: "Preferencias guardadas localmente",
      preferencesSavedLocallyBody: "La app mantuvo la configuración en este dispositivo, pero la sincronización no se completó.",
      contextSynced: "Contexto sincronizado",
      contextSyncedBody: "Aletheia puede usar este contexto solo porque lo permitiste.",
      contextSavedLocally: "Contexto guardado localmente",
      contextSavedLocallyBodySync: "La sincronización no se completó, pero tu contexto manual permaneció en este dispositivo.",
      contextSavedLocallyBodySignIn: "Inicia sesión para sincronizar el contexto manual entre dispositivos.",
      contextSavedLocallyBodyAccount: "Tu contexto está guardado en este dispositivo. Inicia sesión para sincronizarlo.",
      voiceInputUnavailable: "Entrada de voz no disponible",
      voiceInputUnavailableBody: "Este navegador aún no soporta reconocimiento de voz.",
      voiceCaptured: "Voz capturada",
      voiceCapturedBody: "El texto hablado se añadió al campo Companion.",
      voiceInputStopped: "Entrada de voz detenida",
      voiceInputStoppedBody: "Aletheia no pudo escuchar claramente. Puedes intentarlo de nuevo o escribir la pregunta.",
      voiceOutputUnavailable: "Salida de voz no disponible",
      voiceOutputUnavailableBody: "Este navegador aún no soporta reproducción hablada.",
      voiceStopped: "Voz detenida",
      voiceStoppedBody: "La reproducción hablada ha sido detenida.",
      readingAloud: "Leyendo en voz alta",
      askQuestionFirst: "Pregunta primero",
      askQuestionFirstBody: "Escribe o elige una pregunta para que Aletheia tenga algo concreto con qué trabajar.",
      questionSent: "Pregunta enviada",
      questionSentBody: "Aletheia está recuperando sabiduría fundamentada y preparando una respuesta.",
      offlineAnswerReady: "Respuesta sin conexión lista",
      offlineAnswerReadyBody: "El servidor no estaba disponible. Aletheia usó la biblioteca de sabiduría local.",
      signedOut: "Sesión cerrada",
      signedOutBody: "Modo invitado activo. Aún puedes usar Aletheia en este dispositivo.",
      googleUnavailable: "Google no disponible",
      googleUnavailableBody: "El inicio de sesión con Google no está configurado aún. El inicio por correo está disponible.",
      openingGoogle: "Abriendo Google",
      openingGoogleBody: "Regresarás a la pestaña Cuenta después de que se complete el inicio de sesión.",
      signInRequired: "Inicio de sesión requerido",
      signInRequiredBody: "Las notificaciones de sabiduría diaria pueden activarse después de iniciar sesión.",
      notificationsNotConfigured: "Notificaciones no configuradas",
      notificationsNotConfiguredBody: "El servidor no tiene claves o configuración de notificaciones.",
      notificationsUnavailable: "Notificaciones no disponibles",
      notificationsUnavailableBody: "Este navegador no soporta notificaciones push web.",
      notificationsNotEnabled: "Notificaciones no activadas",
      notificationsNotEnabledBody: "Puedes permitir notificaciones más tarde en la configuración del navegador.",
      notificationKeyMissing: "Clave de notificación faltante",
      notificationKeyMissingBody: "El servidor no proporcionó una clave pública VAPID.",
      notificationSyncFailed: "Sincronización de notificaciones falló",
      notificationSyncFailedBody: "Se concedió permiso, pero la suscripción no pudo guardarse.",
      notificationSetupFailed: "Configuración de notificaciones falló",
      notificationSetupFailedBody: "Aletheia no pudo finalizar la suscripción del dispositivo. Por favor, inténtalo de nuevo.",
      notificationsEnabled: "Notificaciones activadas",
      notificationsEnabledBodyTime: "Este dispositivo está suscrito alrededor de las {time} hora local.",
      notificationsOff: "Notificaciones desactivadas",
      notificationsOffBody: "Las notificaciones de sabiduría diaria están desactivadas para este dispositivo.",
      writeReflectionFirst: "Escribe la reflexión primero",
      writeReflectionFirstBody: "Añade algunas líneas honestas antes de guardar.",
      reflectionSaved: "Reflexión guardada",
      reflectionSavedBody: "Tu reflexión está sincronizada con tu cuenta.",
      reflectionSavedLocally: "Reflexión guardada localmente",
      reflectionSavedLocallyBody: "Esta reflexión se mantiene para esta sesión. Inicia sesión para sincronizarla.",
      reflectionDeleted: "Reflexión eliminada",
      reflectionDeletedBody: "La entrada del diario fue eliminada.",
      nameDecisionPressure: "Nombra la decisión y presión",
      nameDecisionPressureBody: "Aletheia necesita tanto la decisión como la presión alrededor de ella antes de rastrear.",
      decisionTracked: "Decisión rastreada",
      decisionTrackedBody: "La decisión está ahora en tu línea de tiempo del Compañero de Decisiones.",
      decisionTrackedLocally: "Decisión rastreada localmente",
      decisionTrackedLocallyBody: "La decisión está rastreada en este dispositivo. Inicia sesión para sincronizar la memoria de decisiones.",
      decisionUpdateFailed: "Actualización de decisión falló",
      decisionUpdateFailedBody: "El cambio no pudo guardarse. Por favor, inténtalo de nuevo.",
      decisionUpdated: "Decisión actualizada",
      addNameFirst: "Añade un nombre primero",
      addNameFirstBody: "Nombra a la persona de confianza antes de añadirla a tu Círculo de Consejo.",
      privateInviteEmailed: "Invitación privada enviada por correo",
      privateInviteEmailedBody: "{name} recibió una invitación privada por correo. Aún solo ven los resúmenes que compartas explícitamente.",
      privateInviteCreated: "Invitación privada creada",
      privateInviteCreatedBody: "{name} solo puede ver los resúmenes de decisiones que compartas explícitamente.",
      privateInviteCreatedBodyEmailError: "El enlace privado está listo, pero el correo no se envió: {error}",
      counselInviteNotCreated: "Invitación de consejo no creada",
      counselAddedLocally: "Consejero añadido localmente",
      counselAddedLocallyBody: "Inicia sesión para crear enlaces de invitación privados y compartir resúmenes de decisiones seleccionados.",
      inviteLinkCopied: "Enlace de invitación copiado",
      inviteLinkCopiedBody: "Compártelo solo con el consejero que querías invitar."
    },
    status: {
      guestMode: "Modo invitado activo. Inicia sesión para sincronizar decisiones.",
      backendUnavailable: "Backend no disponible. El modo invitado aún es usable con sabiduría local.",
      loadingInvite: "Cargando invitación de consejo privada...",
      inviteCouldNotOpen: "Esta invitación de consejo no pudo abrirse.",
      startingQuestionReady: "Una pregunta inicial personalizada está lista en el campo Companion.",
      shareSheetOpened: "Hoja de compartir Aletheia abierta.",
      shareCancelled: "Compartir cancelado. Aún puedes copiar el enlace.",
      linkCopied: "Enlace de Aletheia copiado.",
      feedbackReceived: "Gracias. Aletheia usará comentarios como este para volverse más sabia.",
      offlineFallback: "Se usó el modo sin conexión porque el servidor devolvió un error.",
      signedOutGuest: "Sesión cerrada. Modo invitado activo.",
      openingGoogleSignIn: "Abriendo inicio de sesión con Google. Regresarás a Cuenta cuando termine.",
      reflectionSavedSession: "Reflexión guardada para esta sesión. Inicia sesión para persistirla en la base de datos.",
      decisionSavedSession: "Decisión guardada para esta sesión. Inicia sesión para persistir la memoria de decisiones.",
      acceptingInvite: "Aceptando invitación...",
      inviteAccepted: "Invitación aceptada. Ahora puedes ver el contenido compartido cuando esta persona lo comparta.",
      inviteNotAccepted: "Esta invitación no pudo ser aceptada.",
      commentShared: "Comentario compartido privadamente con la persona que te invitó."
    },
    placeholders: {
      decisionExample: "Estrés por dinero, una decisión de carrera, presión de generosidad...",
      password: "Contraseña",
      counselPlaceholder: "Ofrece consejo, preguntas o precauciones para esta decisión",
      notSet: "No establecido",
      decisionTitle: "Título de decisión",
      decisionPressure: "¿Qué presión, miedo o esperanza está unida?",
      contactOptional: "Correo o teléfono, opcional",
      ruleExample: "No tomo decisiones de carrera sin consejo y un próximo paso claro.",
      costExample: "Oración, consejo, hechos, tiempo o emoción cambiaron cómo ves la decisión",
      finalDecision: "Decisión final",
      learningQuestion: "¿Qué aprendiste?",
      journalExample: "Ejemplo: Quiero dejar mi trabajo y empezar a consultorear, pero ¿y si los ingresos son inestables?",
      reflectionTitle: "Título de reflexión",
      reflectionBody: "¿Qué estás notando sobre motivos, miedo, generosidad o paz en tus decisiones actuales?"
    },
    labels: {
      appName: "Aletheia",
      appTagline: "Sabiduría para mayordomía",
      beginQuietly: "Empieza en silencio",
      onboardingTitle: "Haz que Aletheia sienta que conoce tu contexto",
      whatBringsYou: "¿Qué te trae aquí?",
      toneGentle: "Gentil",
      toneDirect: "Directo",
      toneStrategic: "Estratégico",
      toneReflective: "Reflexivo",
      familiarityNew: "Nuevo en la sabiduría bíblica",
      familiarityFamiliar: "Familiar",
      familiarityDeep: "Profundamente familiar",
      accountNotice: "Cuenta y notificaciones están en la pestaña Cuenta.",
      accountTitle: "Cuenta",
      accountSubtitle: "Tu espacio Aletheia",
      historyTitle: "Historial",
      trustCenterTitle: "Centro de Confianza",
      manualContextTitle: "Bóveda de Contexto Manual",
      allowContextPrompt: "Permitir que Aletheia use este contexto en las respuestas",
      useMoneyContext: "Usar contexto de dinero en respuestas",
      useWorkContext: "Usar contexto de trabajo en respuestas",
      useHealthContext: "Usar ritmo de salud en respuestas",
      useRelationshipsContext: "Usar contexto de relaciones en respuestas",
      moneySignals: "Señales de dinero",
      lifeRhythms: "Ritmos de vida",
      discernmentSignals: "Señales de discernimiento",
      privacyPosture: "Postura de privacidad",
      inviteSomeone: "Invitar a alguien",
      profileTitle: "Perfil",
      accountTab: "Cuenta",
      dailyWisdomNotifications: "Notificaciones diarias de sabiduría",
      morning: "Mañana",
      midday: "Mediodía",
      evening: "Tarde",
      custom: "Personalizado",
      scriptureQuickRead: "Lectura rápida de Escritura"
    }
  }
};

async function main() {
  console.log('🌍 Adding translations to Spanish...\n');
  
  const esPath = path.join(LOCALES_DIR, 'es.json');
  const esData = JSON.parse(fs.readFileSync(esPath, 'utf-8'));
  
  // Merge new translations
  const updated = {
    ...esData,
    ...translations.es
  };
  
  fs.writeFileSync(esPath, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log('✓ Spanish translations added\n');
  
  console.log('✨ Complete! Run analyze-translations.ts to verify coverage.');
}

main().catch(console.error);
