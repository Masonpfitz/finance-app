/** The text shown in the "Prefer an agent?" box on the setup screen. Keep it in step with AGENT_SETUP.md. */
export const AGENT_PROMPT = `Set up this finance app for me and start it on my computer: PASTE_THE_GITHUB_LINK_HERE

Read AGENT_SETUP.md in the repo and follow it step by step. Install Node.js if it's missing, install the app's dependencies, create my .env from .env.example, start the app on localhost, and open the /setup page. Don't ask me for my bank password, and don't print my Plaid keys back to me. When it's running, tell me in plain words how to start it again next time and how the daily sync works.`;
