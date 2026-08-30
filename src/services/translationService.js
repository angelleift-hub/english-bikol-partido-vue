const apiBaseUrl = (import.meta.env.VITE_TRANSLATION_API_URL || "").replace(
  /\/$/,
  "",
);

const englishToBikolSamples = {
  hello: "hello",
  "i work": "nagtrabaho ako",
  "call me": "apodan mo ako",
  "come here": "dumigdi ka",
  "i need to clean my room": "kaipuhan ko maglinig nin kwarto",
  "fix the table so we can eat": "i-ayos mo an lamesa para makakakan",
};

const bikolToEnglishSamples = Object.fromEntries(
  Object.entries(englishToBikolSamples).map(([english, bikol]) => [
    bikol,
    english,
  ]),
);

function normalizeText(text) {
  return text
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/g, "")
    .trim();
}

function getPrototypeTranslation(text, direction) {
  const normalizedText = normalizeText(text);
  const samples =
    direction === "en-bikol"
      ? englishToBikolSamples
      : bikolToEnglishSamples;
  const translation = samples[normalizedText];

  if (!translation) {
    throw new Error(
      "The translation API is not connected yet. Try one of the sample phrases or connect the Python backend.",
    );
  }

  return {
    translation,
    source: "prototype_demo",
    review_recommended: false,
    alternatives: [],
  };
}

export async function translateText({ text, direction, dialect }) {
  if (!apiBaseUrl) {
    return getPrototypeTranslation(text, direction);
  }

  const response = await fetch(`${apiBaseUrl}/translate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      direction,
      dialect,
    }),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(
      errorPayload.detail ||
        errorPayload.message ||
        "The translation service could not complete the request.",
    );
  }

  const result = await response.json();

  if (!result.translation) {
    throw new Error("The translation service returned an empty result.");
  }

  return result;
}
