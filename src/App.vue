<script setup>
import { computed, ref } from "vue";
import { translateText } from "./services/translationService";

const direction = ref("en-bikol");
const inputText = ref("");
const outputText = ref("");
const selectedDialect = ref("partido");
const source = ref("");
const alternatives = ref([]);
const reviewRecommended = ref(false);
const errorMessage = ref("");
const isTranslating = ref(false);
const statusMessage = ref("");
const downloadProgress = ref(null);
const isDialectMenuOpen = ref(false);

const dialectGroups = [
  {
    label: "Available now",
    options: [
      {
        value: "partido",
        label: "Bikol Partido"
      }
    ]
  },
  {
    label: "Coastal Bikol (Northern) — coming later",
    options: [
      {
        value: "isarog-agta",
        label: "Isarog Agta language"
      },
      {
        value: "mount-iraya-agta",
        label: "Mount Iraya Agta"
      },
      {
        value: "central-bikol",
        label: "Central Bikol language (ISO 639-3: bcl)"
      },
      {
        value: "canaman",
        label: "Canaman dialect"
      },
      {
        value: "naga",
        label: "Naga City dialect"
      },
      {
        value: "tls",
        label: "Tabaco–Legazpi–Sorsogon (TLS) dialect"
      },
      {
        value: "daet",
        label: "Daet dialect"
      }
    ]
  },
  {
    label: "Inland Bikol (Southern) — coming later",
    options: [
      {
        value: "mount-iriga-agta",
        label: "Mount Iriga Agta language"
      },
      {
        value: "albay-bikol",
        label: "Albay Bikol languages"
      },
      {
        value: "buhinon",
        label: "Buhinon language"
      },
      {
        value: "libon",
        label: "Libon language"
      },
      {
        value: "west-miraya",
        label: "West Miraya language"
      },
      {
        value: "east-miraya",
        label: "East Miraya language"
      },
      {
        value: "rinconada",
        label: "Rinconada Bikol language"
      },
      {
        value: "highland-sinabukid",
        label: "Highland/Sinabukid dialect"
      },
      {
        value: "lakeside-sinaranew",
        label: "Lakeside/Sinaranəw dialect"
      }
    ]
  }
];

const allDialectOptions = dialectGroups.flatMap(
  (group) => group.options
);

const isEnglishToBikol = computed(
  () => direction.value === "en-bikol"
);

const isDialectSupported = computed(
  () => selectedDialect.value === "partido"
);

const selectedDialectName = computed(() => {
  const selectedOption = allDialectOptions.find(
    (option) => option.value === selectedDialect.value
  );

  return selectedOption?.label || "Selected Bikol variety";
});

const sourceLanguage = computed(() =>
  isEnglishToBikol.value
    ? "English"
    : "Bikol Partido"
);

const targetLanguage = computed(() =>
  isEnglishToBikol.value
    ? "Bikol Partido"
    : "English"
);

const inputPlaceholder = computed(() =>
  isEnglishToBikol.value
    ? "Enter English text..."
    : "Enter Bikol Partido text..."
);

const outputPlaceholder = computed(() =>
  isEnglishToBikol.value
    ? "Bikol translation will appear here..."
    : "English translation will appear here..."
);

const canTranslate = computed(
  () =>
    inputText.value.trim().length > 0 &&
    !isTranslating.value &&
    isDialectSupported.value
);

const sourceLabel = computed(() => {
  const labels = {
    human_validated_feedback:
      "Human-validated correction",
    validated_translation_memory:
      "Validated translation memory",
    marian_model_fallback:
      "Marian browser model",
    prototype_demo:
      "Prototype sample"
  };

  return labels[source.value] || source.value;
});

const currentYear = new Date().getFullYear();

function clearResultState() {
  source.value = "";
  alternatives.value = [];
  reviewRecommended.value = false;
  errorMessage.value = "";
  statusMessage.value = "";
  downloadProgress.value = null;
}

function handleDialectChange() {
  outputText.value = "";
  clearResultState();
}

function chooseDialect(value) {
  selectedDialect.value = value;
  isDialectMenuOpen.value = false;
  handleDialectChange();
}

function swapDirection() {
  if (isTranslating.value) return;

  isDialectMenuOpen.value = false;

  direction.value = isEnglishToBikol.value
    ? "bikol-en"
    : "en-bikol";

  const previousInput = inputText.value;

  inputText.value = outputText.value;
  outputText.value = previousInput;

  clearResultState();
}

async function handleTranslate() {
  if (!canTranslate.value) return;

  isDialectMenuOpen.value = false;
  isTranslating.value = true;
  outputText.value = "";

  clearResultState();

  statusMessage.value =
    "Starting the browser translator…";

  try {
    const result = await translateText({
      text: inputText.value.trim(),
      direction: direction.value,
      dialect: selectedDialect.value,
      onStatus: ({
        message,
        progress
      }) => {
        statusMessage.value =
          message || "Working…";

        downloadProgress.value =
          Number.isFinite(progress)
            ? progress
            : null;
      }
    });

    outputText.value = result.translation;
    source.value = result.source || "";
    alternatives.value = result.alternatives || [];
    reviewRecommended.value = Boolean(
      result.review_recommended
    );
  } catch (error) {
    errorMessage.value =
      error.message || "Translation failed.";
  } finally {
    isTranslating.value = false;
    statusMessage.value = "";
    downloadProgress.value = null;
  }
}
</script>

<template>
  <div class="app-shell">
    <header class="brand-header">
      <a
        class="brand"
        href="#translator"
        aria-label="EB Translator home"
      >
        <span
          class="brand-mark"
          aria-hidden="true"
        >
          <span
            class="brand-letter brand-letter--english"
          >
            E
          </span>

          <span
            class="brand-letter brand-letter--bikol"
          >
            B
          </span>
        </span>

        <span class="brand-name">
          Translator
        </span>
      </a>
    </header>

    <main
      id="translator"
      class="translator-card"
    >
      <form @submit.prevent="handleTranslate">
        <div class="translator-toolbar">
          <div class="language-control">
            <label for="bikol-variety">
              Select Bikol variety
            </label>

            <div
              class="custom-select"
              @keydown.esc="isDialectMenuOpen = false"
            >
              <button
                id="bikol-variety"
                class="custom-select__trigger"
                type="button"
                aria-haspopup="listbox"
                aria-controls="bikol-variety-menu"
                aria-describedby="support-note"
                :aria-expanded="isDialectMenuOpen"
                @click="
                  isDialectMenuOpen =
                    !isDialectMenuOpen
                "
              >
                <span>
                  {{ selectedDialectName }}
                </span>

                <svg
                  class="custom-select__chevron"
                  :class="{
                    'is-open': isDialectMenuOpen
                  }"
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path
                    d="m6 8 4 4 4-4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </button>

              <div
                v-if="isDialectMenuOpen"
                class="custom-select__backdrop"
                @click="isDialectMenuOpen = false"
              ></div>

              <div
                v-if="isDialectMenuOpen"
                id="bikol-variety-menu"
                class="custom-select__menu"
                role="listbox"
                aria-label="Bikol varieties"
              >
                <div
                  v-for="group in dialectGroups"
                  :key="group.label"
                  class="custom-select__group"
                  role="group"
                  :aria-label="group.label"
                >
                  <p class="custom-select__group-label">
                    {{ group.label }}
                  </p>

                  <button
                    v-for="option in group.options"
                    :key="option.value"
                    class="custom-select__option"
                    :class="{
                      'is-selected':
                        selectedDialect === option.value
                    }"
                    type="button"
                    role="option"
                    :aria-selected="
                      selectedDialect === option.value
                    "
                    @click="chooseDialect(option.value)"
                  >
                    <span>
                      {{ option.label }}
                    </span>

                    <span
                      v-if="
                        selectedDialect === option.value
                      "
                      aria-hidden="true"
                    >
                      ✓
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <button
            class="translate-button"
            type="submit"
            :disabled="!canTranslate"
          >
            {{
              isTranslating
                ? "Translating…"
                : "Translate"
            }}
          </button>
        </div>

        <p
          v-if="!isDialectSupported"
          id="support-note"
          class="support-note"
          role="status"
        >
          {{ selectedDialectName }} is not available
          yet. Bikol Partido is the currently supported
          variety.
        </p>

        <p
          v-else
          id="support-note"
          class="support-note"
        >
          The first translation in each direction
          downloads approximately 100 MB. The model is
          then cached by your browser for faster reuse.
        </p>

        <p
          v-if="isTranslating && statusMessage"
          class="support-note"
          role="status"
          aria-live="polite"
        >
          {{ statusMessage }}

          <span v-if="downloadProgress !== null">
            ({{ downloadProgress }}%)
          </span>
        </p>

        <div class="translator-body">
          <section class="text-panel">
            <label for="source-text">
              {{ sourceLanguage }}
            </label>

            <textarea
              id="source-text"
              v-model="inputText"
              :placeholder="inputPlaceholder"
              maxlength="1000"
              @input="clearResultState"
            ></textarea>
          </section>

          <button
            class="swap-button"
            type="button"
            :disabled="isTranslating"
            :aria-label="
              `Switch to ${targetLanguage} to ${sourceLanguage}`
            "
            :title="
              `Switch to ${targetLanguage} to ${sourceLanguage}`
            "
            @click="swapDirection"
          >
            <svg
              class="swap-icon"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M5 8h13m0 0-3-3m3 3-3 3"
              />

              <path
                d="M19 16H6m0 0 3-3m-3 3 3 3"
              />
            </svg>
          </button>

          <section
            class="text-panel text-panel--output"
          >
            <label for="target-text">
              {{ targetLanguage }}
            </label>

            <textarea
              id="target-text"
              :value="outputText"
              :placeholder="outputPlaceholder"
              readonly
            ></textarea>
          </section>
        </div>

        <div
          v-if="errorMessage"
          class="result-note result-note--error"
          role="alert"
        >
          {{ errorMessage }}
        </div>

        <div
          v-else-if="sourceLabel"
          class="result-note"
          role="status"
        >
          Source: {{ sourceLabel }}

          <span v-if="reviewRecommended">
            · Human review is recommended.
          </span>
        </div>

        <div
          v-if="alternatives.length"
          class="alternatives"
        >
          Other validated translations:
          {{ alternatives.join(" · ") }}
        </div>
      </form>
    </main>

    <footer class="site-footer">
      © {{ currentYear }} English to Bikol
      Translation
    </footer>
  </div>
</template>
