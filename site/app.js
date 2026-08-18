import { describeSnapshotFreshness } from "./freshness.mjs";

const tourItems = [
  {
    image: "assets/drawscope-overview.jpg",
    alt: "DrawScope overview with archive totals, recent records, and responsible-use context",
    caption: "Start with archive scope and local health—not a pattern claim.",
  },
  {
    image: "assets/drawscope-analytics.jpg",
    alt: "DrawScope pattern lab with confidence, confirmation lift, and held-out evidence",
    caption: "Select on earlier discovery data, then measure once on later untouched trials.",
  },
  {
    image: "assets/drawscope-data-quality.jpg",
    alt: "DrawScope data-quality view with source identities, coverage, hashes, and known gaps",
    caption: "Keep source identity, dated coverage, database hashes, and missing fields visible.",
  },
];

const tabs = [...document.querySelectorAll("[data-tour-tab]")];
const image = document.querySelector("[data-tour-image]");
const imageLink = document.querySelector("[data-tour-link]");
const caption = document.querySelector("[data-tour-caption]");
const progress = document.querySelector("[data-tour-progress]");
const pauseButton = document.querySelector("[data-tour-pause]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let selected = 0;
let paused = reducedMotion;
let timer = null;

function restartProgress() {
  progress?.classList.remove("running");
  if (progress) void progress.offsetWidth;
  if (!paused) progress?.classList.add("running");
}

function scheduleNext() {
  window.clearTimeout(timer);
  restartProgress();
  if (!paused) timer = window.setTimeout(() => selectTour((selected + 1) % tourItems.length), 8000);
}

function selectTour(index, focus = false) {
  selected = index;
  const item = tourItems[index];
  tabs.forEach((tab, tabIndex) => {
    tab.setAttribute("aria-selected", String(tabIndex === index));
    tab.tabIndex = tabIndex === index ? 0 : -1;
  });
  if (image) {
    image.src = item.image;
    image.alt = item.alt;
  }
  if (imageLink) imageLink.href = item.image;
  if (caption) caption.textContent = item.caption;
  if (focus) tabs[index]?.focus();
  scheduleNext();
}

tabs.forEach((tab, index) => {
  tab.addEventListener("click", () => selectTour(index));
  tab.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    selectTour((selected + delta + tourItems.length) % tourItems.length, true);
  });
});

pauseButton?.addEventListener("click", () => {
  paused = !paused;
  pauseButton.setAttribute("aria-pressed", String(paused));
  pauseButton.textContent = paused ? "Resume tour" : "Pause tour";
  scheduleNext();
});

const snapshot = document.body.dataset.snapshotDate;
const freshness = document.querySelector("[data-freshness]");
const freshnessLabel = document.querySelector("[data-freshness-label]");
if (snapshot && freshness && freshnessLabel) {
  const status = describeSnapshotFreshness(snapshot);
  freshnessLabel.textContent = status.label;
  freshness.dataset.state = status.state;
  freshness.classList.toggle("current", status.state === "current");
  freshness.classList.toggle("refresh-due", status.state === "refresh-due");
  freshness.classList.toggle("stale", status.state === "stale");
}

selectTour(0);
