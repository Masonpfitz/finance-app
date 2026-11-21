# Agent setup instructions

You're an agent (Claude Code, Codex, or similar) and a person has pasted this repo's link and asked you to set up their finance app. They may not be technical. Do the setup for them, in plain words, and stop at the three steps only they can do: signing up with Plaid, pasting their Plaid keys into the app, and signing in to their bank inside Plaid's window.

## Rules

- Never ask for their bank username or password. Plaid's own window collects it, in their browser.
- Don't print their Plaid keys, and don't have them type the keys into this chat. They paste the keys into the Setup page in their browser, and the app writes `.env` itself.
- Don't edit the app's code unless something fails and you can say why.
- Don't push, publish or upload anything. Don't commit `.env` or anything in `data/`.
- Explain what you're doing in short, plain sentences. Skip jargon, or explain it in a few words.

## Steps

**1. Find out the system.** Check whether this is a Mac, Windows or Linux machine, and which shell you're in.

**2. Make sure Node.js 22.13 or newer is installed.** Run `node -v`.
- If it's missing or older: on a Mac, run `brew install node` if Homebrew exists, and otherwise send the person to https://nodejs.org to run the LTS installer. On Windows, run `winget install OpenJS.NodeJS.LTS`. On Linux, use the system's package manager or nvm.
- After installing Node, open a new terminal so it's on the PATH, then check `node -v` again.

**3. Get the code.** If the repo isn't already on the machine, run `git clone <the link they pasted> finance-app` and `cd finance-app`. If git is missing, install it (Mac: `xcode-select --install`; Windows: `winget install Git.Git`) or download the ZIP from the repo page and unzip it.

**4. Install dependencies.** Run `npm install` inside the app folder.

**5. Create the `.env` file.** Copy `.env.example` to `.env` (`cp .env.example .env` on Mac and Linux, `copy .env.example .env` on Windows). Don't fill in any keys. `npm start` also does this by itself if the file is missing.

**6. Start the app.** Run `npm start`. The first run builds the app, which takes about a minute, then it serves `http://localhost:3000` and opens the browser. Run it as a background process or in its own terminal so it keeps running, and note its process ID so you can stop it later. If port 3000 is busy, set `PORT=3010` (or another free port) in `.env` and start again. To use demo data right away, run `npm run demo` instead.

**7. Check it's up.** Fetch `http://localhost:3000/api/status`. It should return JSON. Then open `http://localhost:3000/setup` for the person (the start script already tries to).

**8. Hand over the three steps.** Tell the person to follow the Setup page in their browser:
1. Make a free Plaid account at https://dashboard.plaid.com/signup. The Trial plan allows up to 10 connections to real banks and takes an application. Sandbox keys work immediately if they want to try the flow first.
2. Paste the client ID and the secret into step 2 on the Setup page and click Check and save keys.
3. Click Connect a bank and sign in inside Plaid's window. In Sandbox the login is `user_good` and the password `pass_good`.

If they want to look around first, they can switch on demo mode on the same page. Wait for them to say they're done.

**9. Confirm it worked.** Open `http://localhost:3000/accounts`. It should list their accounts and show a sync in the history. If there's an error, read the message there, fix what it names (usually keys from the wrong environment), and have them retry.

**10. Explain how to use it from now on.** Tell them, in plain words:
- To start it again, double-click `Start Finance App.command` on a Mac or `Start Finance App.bat` on Windows, or run `npm start` in the app's folder. The window that opens is the app, so it has to stay open while they use it.
- A daily job syncs at 6 AM (change it with `SYNC_HOUR` in `.env`). It pulls balances, pulls new transactions and categorizes them. It only runs while the app is running, and if the computer was asleep at 6 AM it catches up as soon as the app is awake.
- The Sync now button in the sidebar syncs on demand.
- To start it automatically at login, they can add the start file to Login Items on a Mac, or put a shortcut to it in the folder that opens with `shell:startup` on Windows.
- Their keys are in `.env` and their data is in `data/finance.db`. Both stay on this computer, so they shouldn't share or upload them.

## If something fails

- `npm install` fails: check Node's version, then read the error. A flaky network is the usual cause, so try again.
- The build fails: copy the first error to the person and fix it only if the cause is clear.
- The browser doesn't open: give them the address, `http://localhost:3000`.
- Plaid says the keys are wrong: the secret has to match the environment (Sandbox or Production) picked on the page.
- A bank won't connect in Production: some banks need Plaid's approval for their sign-in flow. Read Plaid's message in the window and tell the person what it says.
