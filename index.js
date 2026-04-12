#!/usr/bin/env node

import { program } from 'commander';
import { exec } from 'child_process';
import { promisify } from 'util';
import { GoogleGenAI } from '@google/genai';
import { confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';

const execAsync = promisify(exec);

const SYSTEM_PROMPT = `You are an expert software engineer. Write a clean, concise Conventional Commit message based on the provided Git diff.
Follow these STRICT rules:
1. Output ONLY the commit message. No explanations, no markdown blocks, no quotes.
2. Format: <type>(<optional scope>): <description>
3. Use imperative mood in description ("add feature" not "added feature").
4. Keep the first line under 50 characters.
5. Allowed types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
6. If the diff is large or complex, optionally add a blank line and a bulleted list of 1-3 short points explaining WHY the change was made (not what, the diff shows what).`;

function getGeminiClient() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    console.log(chalk.red('\n  Error: GEMINI_API_KEY environment variable is not set.'));
    console.log(chalk.yellow('\n  To fix this:'));
    console.log('  1. Get an API key from https://aistudio.google.com/app/apikey');
    console.log('  2. Run: export GEMINI_API_KEY="your_key"');
    console.log('  (Add it to your ~/.zshrc or ~/.bash_profile to make it permanent)\n');
    process.exit(1);
  }
  return new GoogleGenAI({ apiKey: key });
}

async function getStagedDiff() {
  try {
    const { stdout } = await execAsync('git diff --staged');
    return stdout.trim();
  } catch (error) {
    console.log(chalk.red('Error: Not a git repository or git is not installed.'));
    process.exit(1);
  }
}

async function hasStagedFiles() {
  try {
    const { stdout } = await execAsync('git diff --staged --name-only');
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

async function generateCommitMessage(diff) {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{ role: 'user', parts: [{ text: `Here is the git diff:\n\n${diff}` }] }],
    config: {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2, // Low temp for more deterministic output
    }
  });
  return response.text.trim();
}

async function executeCommit(message) {
  try {
    // We write to a temporary file to safely pass complex multiline strings to git commit -F
    const tmpFile = '.commit_msg_tmp';
    fs.writeFileSync(tmpFile, message);
    await execAsync(`git commit -F ${tmpFile}`);
    fs.unlinkSync(tmpFile);
    console.log(chalk.green('\n✅ Successfully committed with AI message!\n'));
  } catch (error) {
    console.log(chalk.red('\n❌ Failed to commit.'));
    console.error(error.message);
  }
}

program
  .name('cbm')
  .description('AI-powered conventional commit generator')
  .version('1.0.0');

program
  .command('commit')
  .alias('c')
  .description('Generate AI commit message and commit staged changes')
  .action(async () => {
    // 1. Check if anything is staged
    const isStaged = await hasStagedFiles();
    if (!isStaged) {
      console.log(chalk.yellow('\n  No files staged for commit.'));
      console.log('  Use `git add .` to stage your changes first.\n');
      process.exit(0);
    }

    // 2. Get the diff
    const spinner = ora('Reading staged git diff...').start();
    const diff = await getStagedDiff();
    
    if (diff.length > 30000) {
       spinner.warn(chalk.yellow('Diff is extremely large. The AI might take longer to process or hit token limits.'));
       spinner.start('Analyzing codebase changes...');
    } else {
       spinner.text = 'Analyzing codebase changes...';
    }

    // 3. Generate message
    let commitMessage;
    try {
      commitMessage = await generateCommitMessage(diff);
      spinner.succeed('AI generated a perfect commit message:\n');
    } catch (e) {
      spinner.fail(chalk.red('Failed to connect to Google Gemini AI.'));
      console.error(e.message);
      process.exit(1);
    }

    // 4. Display the message and ask for confirmation
    console.log(chalk.cyan('----------------------------------------'));
    console.log(chalk.white(commitMessage));
    console.log(chalk.cyan('----------------------------------------\n'));

    const answer = await confirm({ message: 'Accept this commit message and execute commit?' });

    if (answer) {
      const execSpinner = ora('Committing...').start();
      await executeCommit(commitMessage);
      execSpinner.stop();
    } else {
      console.log(chalk.yellow('\nCommit aborted. No changes were committed.\n'));
    }
  });

program.parse(process.argv);
