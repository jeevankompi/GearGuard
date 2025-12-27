# GearGuard — Odoo Spec (Uploaded Screenshots)

This document is a text transcription / consolidation of the uploaded requirement screenshots (Dec 27, 2025). It is the baseline for a strict implementation audit.

## 1. Module Overview

**Objective**

- Develop a maintenance management system to track company assets (machines, vehicles, computers) and manage maintenance requests.

**Core philosophy**

- Seamlessly connect:
  - **Equipment** (what is broken)
  - **Teams** (who will fix it)
  - **Requests** (the work to be done)

## 2. Key Functional Areas

### A) Equipment

- The system serves as a central database for all company assets.
- Must create a robust “Equipment” record tracking ownership and technical details.

**Equipment tracking (search / group for tracking requests):**

- By **Department** (e.g., “CNC Machine” belongs to “Production”)
- By **Employee** (e.g., laptop belongs to “Person name”)

**Responsibility**

- Each equipment must have:
  - A dedicated **Maintenance Team**
  - A **Technician** assigned by default

**Key fields**

- Equipment Name
- Serial Number
- Purchase Date
- Warranty Information
- Location

### B) Maintenance Team

- Support multiple specialized teams.

**Key fields / behaviors**

- Team Name (e.g., Mechanics, Electricians, IT Support)
- Team members: link specific users (technicians) to teams
- Workflow logic: when a request is created for a specific team, only team members should pick it up

### C) Maintenance Request

- Transactional part of the module: lifecycle of a repair job.

**Request types**

- Corrective: unplanned repair (breakdown)
- Preventive: planned maintenance (routine checkup)

**Key fields**

- Subject (what is wrong)
- Equipment (affected machine)
- Scheduled Date (when should work happen)
- Duration (how long repair took)

## 3. Functional Workflow

### Flow 1 — The Breakdown

1. Request: any user can create a request
2. Auto-fill logic: when user selects equipment, system fetches:
   - Equipment category
   - Maintenance team
     …and fills them into the request
3. Request state: request starts in **New**
4. Assignment: a manager or technician assigns themselves to the ticket
5. Execution: stage moves to **In Progress**
6. Completion: technician records **Hours Spent** (duration) and moves stage to **Repaired**

### Flow 2 — Routine Checkup

1. Scheduling: a manager creates a request with type **Preventive**
2. Date setting: user sets the **Scheduled Date**
3. Visibility: the request appears on the **Calendar** view on the specific date

## 4. User Interface & Views Requirements

### 1) Maintenance Kanban Board

- Primary workspace for technicians

**Group by stages**

- New | In Progress | Repaired | Scrap

**Drag & Drop**

- Users can drag a card from “New” to “In Progress”

**Visual indicators**

- Technician: show avatar of assigned user
- Status color: display a red strip/text if request is **Overdue**

### 2) Calendar View

- Display all preventive maintenance requests
- Allow users to click a date to schedule a new preventive request

### 3) Pivot/Graph Report (Optional / Advanced)

- Show the number of requests per:
  - Team, or
  - Equipment category

## 5. Required Automation & Smart Features

### Smart Buttons

- On the Equipment form, add a button labeled “Maintenance”
- Function: clicking opens a list of all requests related only to that equipment
- Badge: show count of open requests

### Scrap Logic

- If a request is moved to the Scrap stage, the system indicates the equipment is no longer usable
  - e.g., log a note or set a flag
