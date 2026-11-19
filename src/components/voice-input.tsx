"use client";

import { useEffect, useRef, useState } from "react";

type SpeechAlternativeLike = { transcript: string };
type SpeechResultLike = { isFinal: boolean; 0: SpeechAlternativeLike };
type SpeechEventLike = { resultIndex: number; results: ArrayLike<SpeechResultLike> };
type SpeechErrorLike = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEventLike) => void) | null;
  onerror: ((event: SpeechErrorLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

export function VoiceInput({
  value,
  onChange,
  language = "ru-RU",
  label = "Голосовой ввод",
}: {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  label?: string;
}) {
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const latestValue = useRef(value);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    latestValue.current = value;
  }, [value]);

  useEffect(() => () => {
    recognition.current?.abort();
    recognition.current = null;
  }, []);

  function toggle() {
    if (listening) {
      recognition.current?.stop();
      setListening(false);
      setInterim("");
      return;
    }

    const speechWindow = window as SpeechWindow;
    const SpeechRecognitionConstructor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!SpeechRecognitionConstructor) {
      setMessage("Голосовой ввод не поддерживается этим браузером. Откройте DAYFLOW в Chrome или Edge.");
      return;
    }

    setMessage("");
    const instance = new SpeechRecognitionConstructor();
    recognition.current = instance;
    instance.lang = language;
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        if (result.isFinal) finalText += result[0].transcript;
        else interimText += result[0].transcript;
      }
      if (finalText.trim()) {
        const previous = latestValue.current;
        const separator = previous && !/[\\s]$/.test(previous) ? " " : "";
        const next = previous + separator + finalText.trim();
        latestValue.current = next;
        onChange(next);
      }
      setInterim(interimText);
    };
    instance.onerror = (event) => {
      setListening(false);
      setInterim("");
      setMessage(event.error === "not-allowed"
        ? "Разрешите доступ к микрофону в настройках браузера."
        : event.error === "no-speech"
          ? "Речь не распознана. Попробуйте ещё раз."
          : "Не удалось запустить распознавание речи. Проверьте микрофон.");
    };
    instance.onend = () => {
      setListening(false);
      setInterim("");
    };
    try {
      instance.start();
      setListening(true);
    } catch {
      setListening(false);
      setMessage("Не удалось включить микрофон. Попробуйте ещё раз.");
    }
  }

  return (
    <div className="voice-input">
      <button type="button" className={listening ? "voice-input-button voice-input-button--active" : "voice-input-button"} onClick={toggle} aria-pressed={listening}>
        <span aria-hidden="true">{listening ? "■" : "🎙"}</span>
        {listening ? "Остановить запись" : "Надиктовать"}
      </button>
      {listening && <span className="voice-input-status" role="status">Слушаю… {interim}</span>}
      {!listening && message && <span className="voice-input-message" role="status">{message}</span>}
    </div>
  );
}
