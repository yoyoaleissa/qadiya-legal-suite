# Kuwait Legal Practice Management System (QADIYA OS)
**Master Architecture & Implementation Prompt**

## Context & Objective
You are an expert full-stack developer, AI systems architect, and enterprise software designer. Your task is to build **Qadiya OS**, the definitive Legal Practice Management System for Kuwaiti law firms. 

This system builds upon the existing foundation in the `qadiya-legal-suite` repository (React, TanStack Router, Supabase Auth/DB, Tailwind CSS) and integrates a powerful **MOJ Intelligence Engine** and **Client Bot Service** to create an insurmountable competitive edge.

The system is divided into two integrated layers:
- **Layer 1: The Internal Office OS (Dashboard & CRM)**
- **Layer 2: The External Intelligence Engine (MOJ Sync & Bot)**

---

## LAYER 1: The Internal Office OS (Enhancing the Existing Foundation)

The current repository provides a solid UI shell, bilingual support (Arabic/English via `tt()`), and basic Supabase schema (clients, cases, tasks, hearings, judgments). You must expand this into a complete operational system.

### 1.1 Case & Client CRM (The Command Center)
- **Client Portal:** Enhance the existing `/clients` route. Add detailed billing history, document vault access, and a complete communication log.
- **Case Lifecycle:** Implement a status workflow (Intake → First Instance → Appeal → Cassation → Execution). Add statute of limitations tracking.
- **Role-Based Access Control (RBAC):** Enforce the existing `app_role` enum (`partner`, `associate`, `paralegal`). Partners see all financials; paralegals only see assigned tasks and case metadata.

### 1.2 Court Calendar & Deadline Automation
- **Unified Calendar:** Enhance the existing `/calendar` route (which already has a 30-day grid and PDF export). 
- **Auto-Sync:** Integrate the MOJ Engine (Layer 2) to automatically populate hearings and calculate appeal deadlines (Judgment Date + 30 days).
- **Daily Briefings:** Implement a background job (e.g., Supabase Edge Function triggered via pg_cron) that sends a daily Telegram/email briefing to each lawyer: *"You have 3 hearings today and 1 appeal deadline approaching."*

### 1.3 Task & Workflow Management
- **Workflow Templates:** Build a system to trigger standardized procedures. Example: When a case moves to "Execution", automatically generate 5 predefined tasks assigned to the paralegal role.
- **Google Workspace Integration:** Add bidirectional sync between the internal tasks/calendar and Google Tasks/Calendar using OAuth2.

### 1.4 Financial Management & Billing (New Module)
- **Schema Addition:** Create `invoices`, `time_entries`, and `expenses` tables.
- **Billing Route:** Build out the currently empty `/billing` route. Support hourly tracking, flat fees, and expense logging (court fees, expert fees).
- **Invoice Generation:** Generate branded, bilingual PDF invoices using the existing `jspdf` + `html2canvas-pro` implementation.

### 1.5 AI Legal Assistant (RAG Engine)
- **Vector Database:** Integrate Pinecone or Supabase pgvector.
- **Knowledge Ingestion:** Build an ingestion pipeline for Kuwaiti laws, cassation precedents (أحكام التمييز), and the firm's past briefs.
- **Enhanced Chat:** Upgrade the existing `/ai-assistant` route. Instead of a generic prompt, the AI must retrieve relevant case law from the vector DB to answer queries like *"ما هي أحكام التمييز في قضايا الشيكات 2024؟"* with precise citations.

### 1.6 Automated Document Generation
- **Template Engine:** Enhance the existing `/documents` route. 
- **Auto-Fill:** Merge live case data (from Supabase) and client data directly into predefined templates (Power of Attorney, standard contracts, pleadings) to generate ready-to-print PDFs.

---

## LAYER 2: The External Intelligence Engine (The Competitive Edge)

This layer connects the internal OS to the outside world, automating data retrieval and client communication.

### 2.1 Automated MOJ Portal Sync (The Brain)
Implement a secure Node.js microservice (or Supabase Edge Function) that performs session-aware scraping of `eservices.moj.gov.kw`.
- **Authentication Flow:** 
  1. GET `/searchCriteria/searchByCase.jsp` (establish JSESSIONID).
  2. GET `/captcha/imgCaptcha.jsp` and solve via Vision API (e.g., `gemini-1.5-flash`).
  3. POST `/viewResults/validateCase.jsp`. **CRITICAL:** Capture all new cookies from the 302 redirect (`JSESSIONID`, `BNIS_vid`, etc.) and use them for all subsequent requests.
- **Data Extraction:** Scrape the primary endpoints (`finsView.jsp`, `applView.jsp`, `cassView.jsp`, `execView.jsp`, `expertView.jsp`, `announceView.jsp`).
- **Deep Data:** Parse `dealLinkPages()` calls to extract parameters for `viewMeetings.jsp` (Hearings) and `viewVerds.jsp` (Judgments).
- **Sync Logic:** Upsert extracted data into the Supabase `hearings`, `judgments`, and `case_timeline` tables.

### 2.2 Client-Facing Bot Service (Telegram/WhatsApp)
Build a webhook-driven bot service integrated with the Supabase backend.
- **Case Inquiry:** Client sends a case number. Bot triggers the MOJ Engine, generates an AI summary (Arabic/English), and returns a premium PDF dossier (using the `report-export.ts` logic).
- **Smart Judgment Notifications:** When the MOJ Engine detects a new judgment, calculate the appeal deadline. Send an instant Telegram alert to the client with the ruling, countdown, AI recommendation, and inline buttons for Google Calendar and Tasks.
- **Appointment Booking:** Client requests a consultation. Bot checks the lawyer's availability (via Supabase), proposes slots, creates a Calendar event, and adds a preparation task for the lawyer.

## Implementation Guidelines
- **Tech Stack:** React, TypeScript, TanStack Router, Tailwind CSS, Supabase (Auth, DB, Edge Functions), Node.js (for MOJ scraping/bot).
- **Design System:** Strictly adhere to the existing palette (`oklch` tokens: navy, gold, ivory), typography (Fraunces, Inter, Noto Naskh Arabic), and bilingual RTL/LTR layout.
- **Mobile Responsiveness:** Ensure the entire dashboard and all generated PDFs are fully mobile-friendly.
