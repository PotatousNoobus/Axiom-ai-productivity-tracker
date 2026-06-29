<head></head>
# Axiom - Vibe2Ship Submission

## Problem Statement Selected: The Last-Minute Life Saver

Students and working professionals struggle to maintain states of "deep work" due to rigid task management tools that lack intelligent planning and fail to adapt to real-world routines (e.g., late-night study sessions being split by arbitrary midnight resets).

## Solution Overview

Axiom is an AI-powered focus environment that seamlessly merges conversational task scheduling with a dynamic, multi-day calendar system. Designed as a proactive collaborator rather than a passive list, Axiom allows users to naturally converse with an AI to structure their day. The system translates natural language into structured, 24-hour scheduled focus blocks, ensuring users remain in a flow state without the friction of manual data entry.

## Key Features

- **Conversational Scheduling Engine:** Users can type natural language (e.g., "Schedule a 2-hour Python study session this afternoon") and the AI automatically converts it into structured, 24-hour time blocks injected directly into the active timeline.
- **AI-Driven Task Deconstruction (Chunking):** When a massive or intimidating task is scheduled, the AI automatically breaks it down into smaller, highly actionable sub-tasks. This micro-scheduling assists the user in steadily making progress and completing the overarching goal comfortably within the allocated time block.
- **Comprehensive Analytics Dashboard:** A dedicated visualization tab that tracks user performance over time. It features a gamified Daily Streak to encourage consistency, an Hourly Productivity Map to help users identify their peak performance windows, and Energy Distribution tracking to visualize focus intensity throughout the logical day.
- **Dynamic User Profiles:** Axiom adapts its core scheduling logic based on the user's selected persona (e.g., Student, Founder, Professional). The app tailors its assumptions and time-blocking strategies to fit the specific lifestyle and focus demands of that demographic.
- **Profile-Driven "Logical Day" Resets:** Moving away from rigid midnight resets, the "end of the day" shifts based on the active profile. For example, the Student profile accommodates late-night dorm study sessions by extending the logical day until 01:00 AM, preventing the active timeline from aggressively wiping mid-focus.
- **Resilient AI Integration:** Built with edge cases in mind. If the default environment API key encounters rate-limiting or fails, users can seamlessly input their own personal API key via a dedicated API section under the Settings tab to instantly restore AI functionality.
- **Automated Garbage Collection:** As the system crosses the logical day threshold, it autonomously sweeps the timeline—preserving completed tasks for analytics while clearing out stale, uncompleted items to provide a fresh slate.
- **Focus-First Visual Alerts:** Features an integrated "Silent Mode" toggle that mutes audio chimes while maintaining high-visibility, in-app toast notifications that pull the user's attention to the next scheduled task without breaking deep focus.
- **Manual Failsafes:** Full CRUD (Create, Read, Update, Delete) functionality for task management, ensuring the timeline remains 100% operational even without AI interaction.

## Technologies Used

| **Technology** | **Purpose** |
| --- | --- |
| **Next.js / React** | Frontend Framework |
| **Tailwind CSS** | Styling & Responsive UI |
| **React-Hot-Toast** | In-app notification system |
| **Web Storage API** | Local data persistence |
| **Google Cloud Run** | Starter Tier, Serverless Hosting |

## Google Technologies Utilized

- **Google AI Studio (Gemini API):** The core engine of Axiom relies on the Gemini model. Through strict prompt engineering and JSON schema enforcement, Gemini acts as a natural language parser, converting human input and 12-hour time references into strictly formatted 24-hour task objects (`startTime`, `endTime`, `title`) that immediately hydrate the frontend UI.
- **Google Cloud Run:** Seamlessly deployed via the Google AI Studio "Publish" integration to provide a fully functional, publicly accessible, and scalable live environment.
