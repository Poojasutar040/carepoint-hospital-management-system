// Data service layer. Currently persists to the browser (localStorage) with sample data.
// Swap the implementations of load/save for API calls to connect a real backend.

import { useSyncExternalStore } from "react";
import { sampleData } from "./sample-data";
import type { HmsData } from "./types";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwsm7nUBl1by-KITHBPRJlMdhQiZYQ_92yS5sAVNc01I1tj4R5qlbMLERVJJ3yzhvgo-A/exec";

type Listener = () => void;
const listeners = new Set<Listener>();

let state: HmsData = sampleData;
let loaded = false;
let loadingPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

// Read Google Sheets using the JSONP support in Code.gs.
function loadFromSheets(): Promise<HmsData> {
  return new Promise((resolve, reject) => {
    const callbackName = "__carePointSheetsCallback";
    const w = window as any;

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

    script.src =
      API_URL + "?callback=" + encodeURIComponent(callbackName);

    document.head.appendChild(script);
  });
}

// Google Apps Script writes are cross-origin. no-cors does not
// expose the server response, so a successful fetch is not proof
// that the spreadsheet was updated.
async function saveToSheets(data: HmsData) {
  await fetch(API_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action: "save",
      data,
    }),
  });
}

function isEmpty(data: HmsData) {
  return (
    data.patients.length === 0 &&
    data.doctors.length === 0 &&
    data.appointments.length === 0 &&
    data.beds.length === 0 &&
    data.bills.length === 0
  );
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;

  loaded = true;

  loadingPromise = (async () => {
    try {
      const remoteData = await loadFromSheets();

      if (isEmpty(remoteData)) {
        // Populate the empty spreadsheet with fictional demo records.
        state = sampleData;
        notify();
        await saveToSheets(state);

        // Verify that the write actually reached Google Sheets.
        const check = await loadFromSheets();

        if (isEmpty(check)) {
          throw new Error(
            "The spreadsheet is still empty after the save attempt."
          );
        }

        state = check;
      } else {
        state = remoteData;
      }
    } catch (error) {
      console.error("Google Sheets connection failed:", error);
      // Keep the demo usable if the connection fails.
      // Do not assume remote changes were saved.
    }

    notify();
  })();
}

export function getData() {
  ensureLoaded();
  return state;
}

export function update(fn: (d: HmsData) => HmsData) {
  ensureLoaded();
  state = fn(state);
  notify();

  // Wait for the initial spreadsheet load before saving edits.
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
