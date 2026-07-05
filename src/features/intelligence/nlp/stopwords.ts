// Stop-word lists for tokenization and keyword extraction.
// English is comprehensive; Hindi and Kannada cover the highest-frequency
// function words (enough to keep them out of keyphrases — not exhaustive).

export const STOP_EN = new Set([
  'a','an','the','and','or','but','if','then','than','so','as','at','by','for',
  'from','in','into','of','on','onto','to','up','out','with','about','over',
  'under','again','further','once','here','there','all','any','both','each',
  'few','more','most','other','some','such','no','nor','not','only','own',
  'same','too','very','just','also','is','am','are','was','were','be','been',
  'being','have','has','had','having','do','does','did','doing','will','would',
  'shall','should','can','could','may','might','must','i','me','my','myself',
  'we','our','ours','ourselves','you','your','yours','yourself','he','him',
  'his','himself','she','her','hers','herself','it','its','itself','they',
  'them','their','theirs','themselves','what','which','who','whom','this',
  'that','these','those','when','where','why','how','because','while','during',
  'before','after','above','below','between','through','down','off','it’s',
  'its','dont','don’t','im','i’m','ive','i’ve','lets','let’s',
  // transcription fillers — voice input is full of these
  'um','uh','umm','uhh','hmm','mmm','yeah','yep','okay','ok','like','know',
  'basically','actually','literally','gonna','wanna','kinda','sorta','right',
  'well','anyway','things','thing','stuff','really','maybe','get','got','go',
  'going','make','need','want','think','say','said','one','two','lot','bit',
  'today','yesterday','tomorrow','now',
]);

export const STOP_HI = new Set([
  'का','के','की','को','में','से','पर','और','या','है','हैं','था','थी','थे','हो',
  'हूँ','हूं','ने','कि','यह','वह','ये','वो','एक','भी','तो','ही','अब','जब','तब',
  'कुछ','सब','मैं','मेरा','मेरी','मेरे','हम','तुम','आप','उस','इस','उन','इन',
  'नहीं','करना','किया','कर','रहा','रही','रहे','गया','गयी','गए','हुआ','हुई','हुए',
  'लिए','साथ','बाद','पहले','बहुत','थोड़ा','क्या','कैसे','कौन','कहाँ','क्यों',
]);

export const STOP_KN = new Set([
  'ಒಂದು','ಅದು','ಇದು','ಅವರು','ನಾನು','ನೀವು','ನಾವು','ಮತ್ತು','ಅಥವಾ','ಆದರೆ',
  'ಇದೆ','ಇಲ್ಲ','ಆಗಿ','ಅಲ್ಲಿ','ಇಲ್ಲಿ','ಏನು','ಹೇಗೆ','ಯಾರು','ಎಲ್ಲಿ','ಯಾವಾಗ',
  'ಈಗ','ಆಗ','ಮೇಲೆ','ಕೆಳಗೆ','ಜೊತೆ','ನಂತರ','ಮೊದಲು','ತುಂಬಾ','ಸ್ವಲ್ಪ','ಎಲ್ಲಾ',
]);

export function isStopword(token: string): boolean {
  return STOP_EN.has(token) || STOP_HI.has(token) || STOP_KN.has(token);
}
