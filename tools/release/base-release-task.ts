import chalk from 'chalk';
import {prompt} from 'inquirer';
import {GitClient} from './git/git-client';
import {Version} from './version-name/parse-version';
import {getAllowedPublishBranches} from './version-name/publish-branches';

/**
 * Base release task class that contains shared methods that are commonly used across
 * the staging and publish script.
 */
export class BaseReleaseTask {

  constructor(public git: GitClient) {
    console.warn(git);
  }

  /** Checks if the user is on an allowed publish branch for the specified version. */
  protected switchToPublishBranch(newVersion: Version): string {
    const allowedBranches = getAllowedPublishBranches(newVersion);
    const currentBranchName = this.git.getCurrentBranch();
    console.log(currentBranchName)

    // If current branch already matches one of the allowed publish branches, just continue
    // by exiting this function and returning the currently used publish branch.
    if (allowedBranches.includes(currentBranchName)) {
      console.log(chalk.green(`  ✓   Using the "${chalk.italic(currentBranchName)}" branch.`));
      return currentBranchName;
    }

    // In case there are multiple allowed publish branches for this version, we just
    // exit and let the user decide which branch they want to release from.
    if (allowedBranches.length !== 1) {
      console.warn(chalk.yellow('  ✘   You are not on an allowed publish branch.'));
      console.warn(chalk.yellow(`      Please switch to one of the following branches: ` +
        `${allowedBranches.join(', ')}`));
      process.exit(0);
    }

    // For this version there is only *one* allowed publish branch, so we could
    // automatically switch to that branch in case the user isn't on it yet.
    const defaultPublishBranch = allowedBranches[0];

    if (!this.git.checkoutBranch(defaultPublishBranch)) {
      console.error(chalk.red(`  ✘   Could not switch to the "${chalk.italic(defaultPublishBranch)}" ` +
        `branch.`));
      console.error(chalk.red(`      Please ensure that the branch exists or manually switch to the ` +
        `branch.`));
      process.exit(1);
    }

    console.log(chalk.green(`  ✓   Switched to the "${chalk.italic(defaultPublishBranch)}" branch.`));
  }

  /** Verifies that the local branch is up to date with the given publish branch. */
  protected verifyLocalCommitsMatchUpstream(publishBranch: string) {
    const upstreamCommitSha = this.git.getRemoteCommitSha(publishBranch);
    const localCommitSha = this.git.getLocalCommitSha('HEAD');

    // Check if the current branch is in sync with the remote branch.
    if (upstreamCommitSha !== localCommitSha) {
      console.error(chalk.red(`  ✘ The current branch is not in sync with the remote branch. Please ` +
        `make sure your local branch "${chalk.italic(publishBranch)}" is up to date.`));
      process.exit(1);
    }
  }

  /** Verifies that there are no uncommitted changes in the project. */
  protected verifyNoUncommittedChanges() {
    if (this.git.hasUncommittedChanges()) {
      console.error(chalk.red(`  ✘   There are changes which are not committed and should be ` +
        `discarded.`));
      process.exit(1);
    }
  }

  /** Prompts the user with a confirmation question and a specified message. */
  protected async promptConfirm(message: string): Promise<boolean> {
    return (await prompt<{result: boolean}>({
      type: 'confirm',
      name: 'result',
      message: message,
    })).result;
  }
}
