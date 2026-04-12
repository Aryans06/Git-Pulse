# Git Pulse 🫀

An AI-powered CLI tool that uses Google Gemini to automatically read your staged `git diff` and generate a perfectly formatted Conventional Commit message. Stop wasting time figuring out what to write in your commits!

## Features
- 🚀 **Lightning Fast:** Generates commits locally using the `gemini-2.5-flash` model.
- 🎯 **Conventional Commits:** Automatically formats messages as `feat:`, `fix:`, `refactor:`, etc.
- 🛡️ **Interactive Safety:** Lets you review and approve the AI's commit message before it actually hits your git history.
- 🌎 **Global:** Install it once and use it in any local git repository on your machine.

---

## Installation

Install the package globally via NPM so you can use the `cbm` command anywhere on your computer:

```bash
npm install -g @aryans06/git-pulse
```

## Setup (API Key)

Since `git-pulse` uses the Google Gemini API to analyze your code, you need to provide a free API key.

1. Get a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Open your terminal config file (usually `~/.zshrc` or `~/.bash_profile`).
3. Add this line to the very bottom:
   ```bash
   export GEMINI_API_KEY="your-api-key-here"
   ```
4. Save the file and refresh your terminal by running `source ~/.zshrc`.

---

## Usage

Using Git Pulse is incredibly simple. Inside any git repository:

1. Stage the files you want to commit:
   ```bash
   git add .
   ```
2. Run the Git Pulse commit command! You can use `commit` or just `c`:
   ```bash
   cbm c
   ```

The AI will read your diff, generate a clean summary, and ask for your approval. If you type `y`, it instantly commits the code!

## License

MIT License
