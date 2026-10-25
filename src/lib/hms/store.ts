// Data service layer. Currently persists to the browser (localStorage) with sample data.
// Swap the implementations of load/save for API calls to connect a real backend.

import { useSyncExternalStore } from "react";
import { sampleData } from "./sample-data";
import type { HmsData } from "./types";

const API_URL =
 "https://script.google.com/macros/s/AKfycbwsm7nUBl1by-KITHBPRJlMdhQiZYQ_92yS5sAVNc01I1tj4R5qlbMLERVJJ3yzhvgo-A/exec"
type Listener = () => void;
const listeners = new Set<Listener>();

let state: HmsData = sampleData;
let loaded = false;
let loadingPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function loadFromSheets(): Promise<HmsData> {
  return new Promise((resolve, reject) => {
    const callbackName = "__carePointSheetsCallback";
    const w = window as unknown as Record<string, any>;
    const script = document.createElement("script");

    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets read timed out."));
    }, 15000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete w[callbackName];
    }

    w[callbackName] = (result: any) => {
      cleanup();

      if (!result?.success || !result.data) {
        reject(new Error("Google Sheets returned invalid data."));
        return;
      }

      resolve(result.data as HmsData);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Could not read Google Sheets."));
    };

    script.src = API_URL + "?callback=" + encodeURIComponent(callbackName);
    document.head.appendChild(script);
  });
}

async function saveToSheets(data: HmsData) {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "save", data }),
  });
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;

  loaded = true;

  loadingPromise = (async () => {
    try {
      const remoteData = await loadFromSheets();
      state = remoteData;
    } catch (error) {
      console.error("Google Sheets connection failed:", error);
      // Keep current data visible, but do not assume it was saved.
    }

    notify();
  })();
}

export function getData() {
  ensureLoaded();
  return state;
}

export function update(fn: (data: HmsData) => HmsData) {
  ensureLoaded();
  state = fn(state);
  notify();

  void (async () => {
    if (loadingPromise) await loadingPromise;

    try {
      await saveToSheets(state);
      console.info("Save request sent to Google Sheets.");
    } catch (error) {
      console.error("Google Sheets save request failed:", error);
    }
  })();
}

export function resetData() {
  state = sampleData;
  notify();

  void saveToSheets(state).catch((error) => {
    console.error("Could not reset Google Sheets:", error);
  });
}

export function useHms(): HmsData {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getData,
    () => sampleData
  );
}

export function nextId(prefix: string, ids: string[]) {
  const nums = ids
    .map((id) => parseInt(id.replace(/\D/g, ""), 10))
    .filter((n) => !isNaN(n));

  return `${prefix}${(nums.length ? Math.max(...nums) : 0) + 1}`;
}

export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
