import TranslationWorker from "../workers/translation.worker.js?worker";

const englishToBikolSamples = {
  hello: "hello",
  "i work": "nagtrabaho ako",
  "call me": "apodan mo ako",
  "come here": "dumigdi ka",
  "i need to clean my room":
    "kaipuhan ko maglinig nin kwarto",
  "fix the table so we can eat":
    "i-ayos mo an lamesa para makakakan",
};

const bikolToEnglishSamples =
  Object.fromEntries(
    Object.entries(
      englishToBikolSamples,
    ).map(([english, bikol]) => [
      bikol,
      english,
    ]),
  );

let browserWorker = null;
let nextRequestId = 0;

const pendingRequests = new Map();

function normalizeText(text) {
  return text
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function getValidatedTranslation(
  text,
  direction,
) {
  const normalizedText = normalizeText(text);

  const samples =
    direction === "en-bikol"
      ? englishToBikolSamples
      : bikolToEnglishSamples;

  const translation =
    samples[normalizedText];

  if (!translation) return null;

  return {
    translation,
    source: "validated_translation_memory",
    review_recommended: false,
    alternatives: [],
  };
}

function rejectPendingRequests(message) {
  for (
    const request
    of pendingRequests.values()
  ) {
    request.reject(new Error(message));
  }

  pendingRequests.clear();
}

function handleWorkerMessage(event) {
  const {
    requestId,
    type,
    message,
    progress,
    result,
  } = event.data;

  const request =
    pendingRequests.get(requestId);

  if (!request) return;

  if (type === "status") {
    request.onStatus?.({
      message,
      progress,
    });

    return;
  }

  pendingRequests.delete(requestId);

  if (type === "result") {
    request.resolve(result);
    return;
  }

  if (type === "error") {
    request.reject(
      new Error(
        message ||
          "Browser translation failed.",
      ),
    );
  }
}

function getBrowserWorker() {
  if (browserWorker) {
    return browserWorker;
  }

  browserWorker =
    new TranslationWorker();

  browserWorker.addEventListener(
    "message",
    handleWorkerMessage,
  );

  browserWorker.addEventListener(
    "error",
    (event) => {
      const message =
        event.message ||
        "The browser translation worker stopped unexpectedly.";

      rejectPendingRequests(message);

      browserWorker?.terminate();
      browserWorker = null;
    },
  );

  return browserWorker;
}

function translateWithBrowserModel({
  text,
  direction,
  onStatus,
}) {
  const worker = getBrowserWorker();
  const requestId = ++nextRequestId;

  return new Promise(
    (resolve, reject) => {
      pendingRequests.set(requestId, {
        resolve,
        reject,
        onStatus,
      });

      worker.postMessage({
        requestId,
        type: "translate",
        text,
        direction,
      });
    },
  );
}

export async function translateText({
  text,
  direction,
  dialect,
  onStatus,
}) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    throw new Error(
      "Please enter text to translate.",
    );
  }

  if (dialect !== "partido") {
    throw new Error(
      "Only Bikol Partido is currently supported.",
    );
  }

  if (
    direction !== "en-bikol" &&
    direction !== "bikol-en"
  ) {
    throw new Error(
      "Unsupported translation direction.",
    );
  }

  const validatedTranslation =
    getValidatedTranslation(
      trimmedText,
      direction,
    );

  if (validatedTranslation) {
    onStatus?.({
      message:
        "Validated translation found.",
      progress: 100,
    });

    return validatedTranslation;
  }

  return translateWithBrowserModel({
    text: trimmedText,
    direction,
    onStatus,
  });
}