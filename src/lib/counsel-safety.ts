import { localizedWisdomResponseCopy, type LanguageCode } from "@/lib/localization";
import { detectLifeSupportConcern } from "@/lib/life-support";

export type SafeTopic = "general" | "financial" | "medical" | "legal" | "pastoral" | "crisis";

export function counselSafetyTopic(question: string): SafeTopic {
  const concern = detectLifeSupportConcern(question);
  if (concern === "self_harm" || /\b(?:immediate danger|being attacked right now)\b/i.test(question)) return "crisis";
  if (concern === "depression" || /\b(?:doctor|diagnos\w*|medicin\w*|medical|symptoms?|therapy)\b/i.test(question)
    || /(?<!\p{L})(?:síntomas?|symptômes?|médicaments?|medicamentos?|sintomas?|medikamente?n?|ärzt(?:in|innen|e)?|أعراض|लक्षण)(?!\p{L})/iu.test(question)) return "medical";
  if (/\b(?:lawyer|legal|contracts?|lawsuit|criminal|custody)\b/i.test(question)) return "legal";
  if (/\b(?:invest\w*|debt\w*|loan\w*|tax\w*|mortgage\w*|financ\w*|money|dettes?|deudas?|préstamos?)\b/i.test(question)) return "financial";
  if (/\b(?:spiritual abuse|doctrine)\b/i.test(question)) return "pastoral";
  return "general";
}

const help: Record<LanguageCode, Record<"medical" | "pastoral" | "crisis" | "isaiahAnchor", string>> = {
  en: {
    medical: "For symptoms or treatment decisions, speak with a qualified healthcare professional. This guidance cannot diagnose or replace medical care.",
    pastoral: "For pastoral concerns, consider speaking with a trusted pastoral adviser. If the concern involves abuse, seek support from someone independent of the situation.",
    crisis: "If you are in immediate danger, contact local emergency services now. If you can safely do so, move to a safer place and reach someone you trust.",
    isaiahAnchor: "God reassures frightened people that he is with them. You do not have to face this alone; let someone help you now.",
  },
  es: {
    medical: "Si tienes síntomas o debes tomar una decisión sobre un tratamiento, consulta a un profesional sanitario cualificado. Esta orientación no sustituye la atención médica.",
    pastoral: "Si necesitas orientación pastoral, habla con alguien de confianza. Si hay abuso, busca apoyo fuera del entorno donde ocurre.",
    crisis: "Si estás en peligro inmediato, llama ahora a los servicios de emergencia locales. Si puedes hacerlo sin riesgo, ve a un lugar seguro y avisa a alguien de confianza.",
    isaiahAnchor: "Dios asegura a quienes tienen miedo que está con ellos. No tienes que afrontar esto a solas; deja que alguien te ayude ahora.",
  },
  fr: {
    medical: "Pour des symptômes ou une décision de traitement, consulte un professionnel de santé qualifié. Ces conseils ne remplacent pas les soins médicaux.",
    pastoral: "Pour une question pastorale, parle à une personne de confiance. En cas d’abus, cherche du soutien auprès d’une personne indépendante de la situation.",
    crisis: "Si tu es en danger immédiat, appelle les secours locaux maintenant. Si tu peux le faire sans risque, mets-toi à l’abri et contacte une personne de confiance.",
    isaiahAnchor: "Dieu rappelle à ceux qui ont peur qu’il est avec eux. Tu n’as pas à traverser cela sans soutien ; laisse quelqu’un t’aider maintenant.",
  },
  de: {
    medical: "Wende dich bei Beschwerden oder Behandlungsfragen an medizinisches Fachpersonal. Diese Orientierung ersetzt keine medizinische Versorgung.",
    pastoral: "Wende dich bei seelsorglichen Fragen an eine Vertrauensperson in der Seelsorge. Suche bei Missbrauch unabhängige Unterstützung.",
    crisis: "Rufe bei unmittelbarer Gefahr jetzt den örtlichen Notruf an. Wenn es sicher möglich ist, begib dich an einen sicheren Ort und kontaktiere eine Vertrauensperson.",
    isaiahAnchor: "Gott versichert Menschen, die Angst haben, dass er bei ihnen ist. Du musst das nicht allein durchstehen; lass dir jetzt helfen.",
  },
  pt: {
    medical: "Se você tem sintomas ou precisa decidir sobre um tratamento, procure um profissional de saúde qualificado. Esta orientação não substitui atendimento médico.",
    pastoral: "Para orientação pastoral, converse com alguém de confiança. Se houver abuso, procure apoio de alguém independente da situação.",
    crisis: "Se você estiver em perigo imediato, ligue agora para o serviço de emergência local. Se for seguro, vá para um lugar protegido e avise alguém de confiança.",
    isaiahAnchor: "Deus garante a quem tem medo que está ao seu lado. Você não precisa enfrentar isso sem apoio; deixe alguém ajudar agora.",
  },
  yo: {
    medical: "Bí o bá ní àmì àìsàn tàbí o fẹ́ pinnu nípa ìtọ́jú, bá òṣìṣẹ́ ìlera tó péye sọ̀rọ̀. Ìtọ́sọ́nà yìí kò lè rọ́pò ìtọ́jú ìlera.",
    pastoral: "Fún ìtọ́sọ́nà ẹ̀mí, bá olùdámọ̀ràn ẹ̀mí tí o fọkàn tán sọ̀rọ̀. Bí ìlòkulò bá wà, wá ìrànlọ́wọ́ lọ́dọ̀ ẹni tí kò lọ́wọ́ nínú ọ̀ràn náà.",
    crisis: "Bí ewu bá dé bá ọ nísinsìnyí, pe iṣẹ́ pàjáwìrì agbègbè rẹ lẹ́sẹ̀kẹsẹ̀. Bí ó bá láàbò, lọ sí ibi tó dáa, kí o sì pe ẹni tí o fọkàn tán.",
    isaiahAnchor: "Ọlọ́run fi àwọn tó bẹ̀rù lọ́kàn balẹ̀ pé òun wà pẹ̀lú wọn. O kò ní láti dojú kọ èyí nìkan; jẹ́ kí ẹnì kan ràn ọ́ lọ́wọ́ nísinsìnyí.",
  },
  ig: {
    medical: "Ọ bụrụ na ị nwere mgbaàmà ma ọ bụ na ị ga-ekpebi maka ọgwụgwọ, gwa ọkachamara ahụike okwu. Ndụmọdụ a anaghị anọchi nlekọta ahụike.",
    pastoral: "Maka nduzi ime mmụọ, gwa onye ndụmọdụ ị tụkwasịrị obi okwu. Ọ bụrụ na e nwere mmegbu, chọọ enyemaka n’aka onye na-etinyeghị aka n’ọnọdụ ahụ.",
    crisis: "Ọ bụrụ na ị nọ n’ihe ize ndụ ugbu a, kpọọ ndị ọrụ mberede obodo gị ozugbo. Ọ bụrụ na ọ dị mma ime otú ahụ, gaa ebe dị nchebe ma kpọọ onye ị tụkwasịrị obi.",
    isaiahAnchor: "Chineke na-emesi ndị na-atụ egwu obi ike na ya nọnyeere ha. Ị gaghị eche nke a ihu naanị gị; kwe ka mmadụ nyere gị aka ugbu a.",
  },
  ha: {
    medical: "Idan kana da alamun rashin lafiya ko kana yanke shawarar magani, ka tuntuɓi ƙwararren ma’aikacin lafiya. Wannan jagora ba ya maye gurbin kulawar lafiya.",
    pastoral: "Don jagorancin addini, ka yi magana da mai ba da shawara da ka amince da shi. Idan ana cin zarafi, ka nemi taimako daga wanda ba ya cikin lamarin.",
    crisis: "Idan kana cikin haɗari nan take, ka kira hukumar agajin gaggawa ta yankinka yanzu. Idan yin haka ba zai jefa ka cikin haɗari ba, ka je wuri mai aminci ka sanar da wanda ka amince da shi.",
    isaiahAnchor: "Allah yana ƙarfafa waɗanda suke jin tsoro cewa yana tare da su. Ba sai ka fuskanci wannan kai kaɗai ba; bari wani ya taimake ka yanzu.",
  },
  tl: {
    medical: "Kung may mga sintomas ka o kailangan mong magpasya tungkol sa paggamot, kumonsulta sa kwalipikadong propesyonal sa kalusugan. Hindi ito kapalit ng pangangalagang medikal.",
    pastoral: "Para sa payong pastoral, kausapin ang isang tagapayong pinagkakatiwalaan mo. Kung may pang-aabuso, humingi ng tulong sa taong hindi sangkot sa sitwasyon.",
    crisis: "Kung nasa agarang panganib ka, tumawag ngayon sa lokal na serbisyong pang-emergency. Kung ligtas, pumunta sa mas ligtas na lugar at tawagan ang taong pinagkakatiwalaan mo.",
    isaiahAnchor: "Tinitiyak ng Diyos sa mga natatakot na kasama nila siya. Hindi mo kailangang harapin ito nang mag-isa; hayaan mong may tumulong sa iyo ngayon.",
  },
  ar: {
    medical: "إذا كانت لديك أعراض أو كنت بصدد اتخاذ قرار علاجي، فاستشر مختصًا صحيًا مؤهلًا. لا يغني هذا الإرشاد عن الرعاية الطبية.",
    pastoral: "للحصول على إرشاد رعوي، تحدث مع مرشد تثق به. إذا كان الأمر يتعلق بإساءة، فاطلب الدعم من شخص مستقل عن الموقف.",
    crisis: "إذا كنت في خطر فوري، فاتصل الآن بخدمات الطوارئ المحلية. وإذا أمكنك ذلك بأمان، فانتقل إلى مكان أكثر أمانًا واتصل بشخص تثق به.",
    isaiahAnchor: "يطمئن الله الخائفين بأنه معهم. ليس عليك أن تواجه هذا وحدك؛ دع شخصًا يساعدك الآن.",
  },
  hi: {
    medical: "लक्षणों या इलाज से जुड़े फ़ैसलों के लिए किसी योग्य स्वास्थ्य विशेषज्ञ से बात करें। यह मार्गदर्शन चिकित्सा देखभाल का विकल्प नहीं है।",
    pastoral: "आध्यात्मिक मार्गदर्शन के लिए किसी भरोसेमंद सलाहकार से बात करें। अगर दुर्व्यवहार हुआ है, तो किसी ऐसे व्यक्ति से मदद लें जो उस स्थिति में शामिल न हो।",
    crisis: "अगर आप अभी ख़तरे में हैं, तो तुरंत स्थानीय आपातकालीन सेवाओं से संपर्क करें। अगर ऐसा करना सुरक्षित हो, तो किसी सुरक्षित जगह जाएँ और किसी भरोसेमंद व्यक्ति को बताएँ।",
    isaiahAnchor: "परमेश्वर डरे हुए लोगों को भरोसा दिलाते हैं कि वे उनके साथ हैं। आपको इसका सामना अकेले नहीं करना है; अभी किसी की मदद लें।",
  },
};

export function counselSafetyBoundary(topic: SafeTopic, language: LanguageCode) {
  if (topic === "general") return "";
  if (topic === "financial" || topic === "legal") return localizedWisdomResponseCopy(language).disclaimer;
  return help[language][topic];
}

export function crisisScriptureConnection(reference: string, language: LanguageCode) {
  return reference === "Isaiah 41:10" ? help[language].isaiahAnchor : undefined;
}
