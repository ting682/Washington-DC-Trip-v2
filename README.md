# DC Family Trip 2026 - Live Trip Companion

A comprehensive React + TypeScript web application serving as the interactive travel companion for the Chung family's Washington, D.C. trip.

## Features

- **Live Countdown & Ticker**: Real-time departure countdown to October 15, 2026 @ 11:30 AM EDT.
- **Dynamic Time-of-Day Theming**: Palette changes seamlessly between morning sunrise, midday marble & navy, sunset warm blush, and night indigo.
- **Interactive 6-Day Schedule**:
  - Detailed daily stops with timeline cards for flights, tours, museums, and meals.
  - Max 20-30 min walk rule: automatically suggests and routes to UberXL with deep links when distances exceed walking thresholds.
  - Transit cards: Metro Blue Line navigation guide with fare instructions for families, walks with step counts, flights with gate information.
  - Interactive "Change Dinner" selector with curated DC restaurants or custom address geocoding.
- **Museum & Landmark Knowledge Base**:
  - 14 major D.C. sites with official photos, historical significance, what kids (ages 8 & 11) should look for, 10 verified facts per landmark, official phone numbers, and websites.
- **Live Flight & Gate Tracker**:
  - Outbound flight (AA 3357 ATL ➔ DCA) and return flight (AA 4800 DCA ➔ ATL) with departure and arrival gates, baggage claim carousels, radar links, and companion booking information.
- **Checklists & Reservations**:
  - Interactive packing checklist grouped by customizable categories (Essentials, Clothing, Hygiene, Electronics, etc.).
  - Category manager to add, rename, and reorganize categories.
  - Alexa Voice Commands exporter: converts remaining packing items into spoken commands for Amazon Echo.
  - Timed passes and reservation verification manager.
  - Shared family Master List synchronization with Google Sheets backend.
- **Kids Zone (4 Mini-Games)**:
  - 🐼 **Panda Bamboo Toss**: HTML5 canvas arcade game feeding giant pandas Bao Li & Qing Bao with touch, mouse, keyboard, or on-screen controls.
  - 🕵️ **Spy Museum Cipher Breaker**: Classified Caesar cipher decryption missions with undercover agent ranks.
  - 🧠 **DC Trivia Challenge**: 150+ multiple-choice trivia questions categorized by trip landmark with 10-question rounds and high scores.
  - 🔍 **DC Scavenger Hunt**: Interactive checklists for all 16 trip stops with point rewards and explorer badges.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Bundler**: Vite 6
- **Styling**: Tailwind CSS v4 + custom CSS variables
- **Icons**: Font Awesome 6
- **Typography**: Young Serif & Figtree
