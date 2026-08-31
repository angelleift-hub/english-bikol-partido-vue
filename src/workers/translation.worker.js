import {
  env,
  pipeline,
} from "@huggingface/transformers";

env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;

const modelIds = {
  "en-bikol":
    "iamagelleift/english-bikol-partido-browser",
  "bikol-en":
    "iamagelleift/bikol-partido-english-browser",
};

let activeDirection = "";
let activePipelinePromise = null;

function sendMessage(requestId, type, payload = {}) {
  self.postMessage({
    requestId,
    type,
    ...payload,
  });
}

function getProgressDetails(update) {
  const filename = update.file
    ? update.file.split("/").pop()
    : "";

  const numericProgress = Number(update.progress);

  const progress = Number.isFinite(numericProgress)
    ? Math.round(numericProgress)
    : null;

  let message = "Preparing browser model…";

  if (
    update.status === "download" ||
    update.status === "progress"
  ) {
    message = filename
      ? `Downloading ${filename}…`
      : "Downloading model files…";
  }

  if (update.status === "done") {
    message = filename
      ? `${filename} downloaded.`
      : "Model file downloaded.";
  }

  if (update.status === "ready") {
    message = "Browser model is ready.";
  }

  return {
    message,
    progress,
  };
}

async function disposeActivePipeline() {
  if (!activePipelinePromise) return;

  try {
    const activePipeline =
      await activePipelinePromise;

    await activePipeline.dispose();
  } catch {
    // A failed or incomplete pipeline has nothing to dispose.
  }

  activePipelinePromise = null;
  activeDirection = "";
}

async function getTranslator(
  direction,
  requestId,
) {
  const modelId = modelIds[direction];

  if (!modelId) {
    throw new Error(
      `Unsupported translation direction: ${direction}`,
    );
  }

  if (
    activePipelinePromise &&
    activeDirection !== direction
  ) {
    sendMessage(requestId, "status", {
      message: "Switching translation direction…",
      progress: null,
    });

    await disposeActivePipeline();
  }

  if (!activePipelinePromise) {
    activeDirection = direction;

    console.info(
      "[Translator] Loading model:",
      modelId,
    );

    sendMessage(requestId, "status", {
      message: "Loading the browser translation model…",
      progress: null,
    });

    activePipelinePromise = pipeline(
      "translation",
      modelId,
      {
        device: "wasm",
        dtype: {
          encoder_model: "q8",
          decoder_model_merged: "q8",
        },
        progress_callback: (update) => {
          const details =
            getProgressDetails(update);

          sendMessage(
            requestId,
            "status",
            details,
          );
        },
      },
    ).catch((error) => {
      activePipelinePromise = null;
      activeDirection = "";
      throw error;
    });
  }

  const translator =
    await activePipelinePromise;

  console.info(
    "[Translator] Model pipeline is ready.",
  );

  sendMessage(requestId, "status", {
    message: "Model ready. Translating…",
    progress: null,
  });

  return translator;
}

function describeError(error) {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "number") {
    return String(error);
  }

  if (error?.message) {
    return `${error.name || "Error"}: ${error.message}`;
  }

  try {
    const serializedError = JSON.stringify(error);

    if (
      serializedError &&
      serializedError !== "{}"
    ) {
      return serializedError;
    }
  } catch {
    // Use the fallback message below.
  }

  return "Unknown browser translation error.";
}

self.addEventListener(
  "message",
  async (event) => {
    const {
      requestId,
      type,
      text,
      direction,
    } = event.data;

    if (type !== "translate") return;

    let phase = "model-loading";

    try {
      console.info(
        "[Translator] Phase: model-loading",
      );

      const translator = await getTranslator(
        direction,
        requestId,
      );

      phase = "inference";

      console.info(
        "[Translator] Phase: inference",
      );

      const output = await translator(text, {
        max_new_tokens: 128,
        do_sample: false,
      });

      console.info(
        "[Translator] Inference completed.",
      );

      const firstResult = Array.isArray(output)
        ? output[0]
        : output;

      const translation =
        firstResult?.translation_text?.trim();

      if (!translation) {
        throw new Error(
          "The browser model returned an empty translation.",
        );
      }

      sendMessage(requestId, "result", {
        result: {
          translation,
          source: "marian_model_fallback",
          review_recommended: true,
          alternatives: [],
        },
      });
    } catch (error) {
      const errorDescription =
        describeError(error);

      console.error(
        `[Translation worker error: ${phase}]`,
        error,
      );

      sendMessage(requestId, "error", {
        message:
          `${phase}: ${errorDescription}`,
      });
    }
  },
);
