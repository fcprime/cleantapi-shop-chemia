"use client";

import { useEffect, useState } from "react";

type Language = "ua" | "ru";
type Consent = {
  version: 1;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  savedAt: string;
};

const CONSENT_KEY = "cleantapi-cookie-consent-v1";

export default function CookieConsent({ lang }: { lang: Language }) {
  const [visible, setVisible] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const hydrateTimer = window.setTimeout(() => {
      try {
        const saved = JSON.parse(localStorage.getItem(CONSENT_KEY) || "null") as Consent | null;
        if (!saved || saved.version !== 1) setVisible(true);
        else {
          setAnalytics(Boolean(saved.analytics));
          setMarketing(Boolean(saved.marketing));
        }
      } catch {
        localStorage.removeItem(CONSENT_KEY);
        setVisible(true);
      }
    }, 0);

    const openSettings = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-cookie-settings]")) return;
      setVisible(true);
      setSettingsOpen(true);
    };
    document.addEventListener("click", openSettings);
    return () => {
      window.clearTimeout(hydrateTimer);
      document.removeEventListener("click", openSettings);
    };
  }, []);

  const save = (nextAnalytics: boolean, nextMarketing: boolean) => {
    const consent: Consent = {
      version: 1,
      necessary: true,
      analytics: nextAnalytics,
      marketing: nextMarketing,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(consent));
    setAnalytics(nextAnalytics);
    setMarketing(nextMarketing);
    setVisible(false);
    setSettingsOpen(false);
    window.dispatchEvent(new CustomEvent("cleantapi-consent-change", { detail: consent }));
  };

  if (!visible) return null;

  return (
    <div className="cookie-layer" role="presentation">
      <section
        className={`cookie-panel ${settingsOpen ? "settings-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-title"
      >
        <div className="cookie-copy">
          <span className="cookie-mark" aria-hidden="true">C</span>
          <div>
            <p className="cookie-kicker">COOKIES</p>
            <h2 id="cookie-title">
              {lang === "ua" ? "Ваші налаштування приватності" : "Ваши настройки приватности"}
            </h2>
            <p>
              {lang === "ua"
                ? "Ми використовуємо необхідне локальне сховище для кошика, мови та роботи сайту. Необов’язкові аналітичні й маркетингові технології можуть працювати лише після вашої згоди."
                : "Мы используем необходимое локальное хранилище для корзины, языка и работы сайта. Необязательные аналитические и маркетинговые технологии могут работать только после вашего согласия."}
            </p>
            <div className="cookie-docs">
              <a href="/privacy.html">Polityka prywatności</a>
              <a href="/cookies.html">Polityka cookies</a>
            </div>
          </div>
        </div>

        {settingsOpen && (
          <div className="cookie-settings">
            <label>
              <span>
                <strong>{lang === "ua" ? "Необхідні" : "Необходимые"}</strong>
                <small>{lang === "ua" ? "Кошик, мова та безпечна робота сайту" : "Корзина, язык и безопасная работа сайта"}</small>
              </span>
              <input type="checkbox" checked disabled />
            </label>
            <label>
              <span>
                <strong>{lang === "ua" ? "Аналітичні" : "Аналитические"}</strong>
                <small>{lang === "ua" ? "Допомагають зрозуміти використання сайту" : "Помогают понять использование сайта"}</small>
              </span>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} />
            </label>
            <label>
              <span>
                <strong>{lang === "ua" ? "Маркетингові" : "Маркетинговые"}</strong>
                <small>{lang === "ua" ? "Вимірювання реклами та її ефективності" : "Измерение рекламы и её эффективности"}</small>
              </span>
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
            </label>
          </div>
        )}

        <div className="cookie-actions">
          {settingsOpen ? (
            <button className="cookie-save" type="button" onClick={() => save(analytics, marketing)}>
              {lang === "ua" ? "Зберегти вибір" : "Сохранить выбор"}
            </button>
          ) : (
            <button className="cookie-settings-button" type="button" onClick={() => setSettingsOpen(true)}>
              {lang === "ua" ? "Налаштувати" : "Настроить"}
            </button>
          )}
          <button className="cookie-reject" type="button" onClick={() => save(false, false)}>
            {lang === "ua" ? "Відхилити необов’язкові" : "Отклонить необязательные"}
          </button>
          <button className="cookie-accept" type="button" onClick={() => save(true, true)}>
            {lang === "ua" ? "Прийняти всі" : "Принять все"}
          </button>
        </div>
      </section>
    </div>
  );
}
