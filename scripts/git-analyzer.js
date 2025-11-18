#!/usr/bin/env node

/**
 * Git Time Analyzer
 * Analyzes Git commit history to estimate time spent coding
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class GitTimeAnalyzer {
  constructor(options = {}) {
    this.maxSessionGap = options.maxSessionGap || 2; // hours
    this.minSessionTime = options.minSessionTime || 15; // minutes
    this.defaultSessionTime = options.defaultSessionTime || 30; // minutes for single commits
    this.author = options.author || null; // filter by author
  }

  /**
   * Get Git commits within a date range
   */
  getCommits(since = null, until = null, repository = '.') {
    try {
      let gitCommand = 'git log --pretty=format:"%h|%an|%ae|%ad|%s" --date=iso --all';
      
      if (since) {
        gitCommand += ` --since="${since}"`;
      }
      if (until) {
        gitCommand += ` --until="${until}"`;
      }
      if (this.author) {
        gitCommand += ` --author="${this.author}"`;
      }

      const output = execSync(gitCommand, { 
        cwd: repository,
        encoding: 'utf8' 
      });

      if (!output.trim()) {
        return [];
      }

      return output.trim().split('\n').map(line => {
        const [hash, author, email, date, message] = line.split('|');
        return {
          hash,
          author,
          email,
          date: new Date(date),
          message: message || ''
        };
      }).sort((a, b) => a.date - b.date);
    } catch (error) {
      console.error('Error getting Git commits:', error.message);
      return [];
    }
  }

  /**
   * Estimate coding sessions from commits
   */
  analyzeSessions(commits) {
    if (commits.length === 0) {
      return [];
    }

    const sessions = [];
    let currentSession = null;

    for (let i = 0; i < commits.length; i++) {
      const commit = commits[i];
      const nextCommit = commits[i + 1];

      if (!currentSession) {
        currentSession = {
          start: commit.date,
          end: commit.date,
          commits: [commit],
          author: commit.author,
          email: commit.email
        };
      } else {
        const timeSinceLastCommit = (commit.date - currentSession.end) / (1000 * 60 * 60); // hours

        if (timeSinceLastCommit <= this.maxSessionGap && commit.author === currentSession.author) {
          // Continue current session
          currentSession.end = commit.date;
          currentSession.commits.push(commit);
        } else {
          // End current session and start a new one
          sessions.push(this.finalizeSession(currentSession));
          currentSession = {
            start: commit.date,
            end: commit.date,
            commits: [commit],
            author: commit.author,
            email: commit.email
          };
        }
      }

      // If this is the last commit, close the session
      if (i === commits.length - 1) {
        sessions.push(this.finalizeSession(currentSession));
      }
    }

    return sessions;
  }

  /**
   * Calculate session duration and finalize session data
   */
  finalizeSession(session) {
    let duration;

    if (session.commits.length === 1) {
      // Single commit gets default time
      duration = this.defaultSessionTime;
    } else {
      // Multiple commits: time between first and last commit + default time for last commit
      const sessionSpan = (session.end - session.start) / (1000 * 60); // minutes
      duration = Math.max(sessionSpan + this.defaultSessionTime, this.minSessionTime);
    }

    return {
      ...session,
      duration: Math.round(duration), // minutes
      hours: Math.round((duration / 60) * 100) / 100, // hours rounded to 2 decimal places
      commitCount: session.commits.length,
      description: this.generateSessionDescription(session.commits)
    };
  }

  /**
   * Generate a description for the coding session
   */
  generateSessionDescription(commits) {
    if (commits.length === 1) {
      return commits[0].message;
    }

    const messages = commits.map(c => c.message).slice(0, 3); // First 3 commit messages
    let description = messages.join('; ');
    
    if (commits.length > 3) {
      description += ` (and ${commits.length - 3} more commits)`;
    }

    return description;
  }

  /**
   * Analyze repository and return time tracking data
   */
  analyze(repository = '.', since = null, until = null) {
    console.log(`\n🔍 Analyzing Git repository: ${path.resolve(repository)}`);
    if (since) console.log(`📅 Since: ${since}`);
    if (until) console.log(`📅 Until: ${until}`);
    if (this.author) console.log(`👤 Author: ${this.author}`);

    const commits = this.getCommits(since, until, repository);
    console.log(`📊 Found ${commits.length} commits`);

    if (commits.length === 0) {
      return {
        repository: path.resolve(repository),
        totalCommits: 0,
        totalHours: 0,
        sessions: []
      };
    }

    const sessions = this.analyzeSessions(commits);
    const totalHours = sessions.reduce((total, session) => total + session.hours, 0);

    console.log(`⏱️  Estimated ${totalHours.toFixed(2)} hours across ${sessions.length} coding sessions\n`);

    return {
      repository: path.resolve(repository),
      totalCommits: commits.length,
      totalHours: Math.round(totalHours * 100) / 100,
      sessions: sessions
    };
  }

  /**
   * Generate a summary report
   */
  generateReport(analysis) {
    const { repository, totalCommits, totalHours, sessions } = analysis;

    console.log('📈 CODING TIME ANALYSIS REPORT');
    console.log('='.repeat(50));
    console.log(`Repository: ${repository}`);
    console.log(`Total Commits: ${totalCommits}`);
    console.log(`Total Hours: ${totalHours.toFixed(2)}h`);
    console.log(`Sessions: ${sessions.length}`);
    console.log('='.repeat(50));

    sessions.forEach((session, index) => {
      console.log(`\n${index + 1}. ${session.start.toLocaleDateString()} ${session.start.toLocaleTimeString()}`);
      console.log(`   Duration: ${session.hours.toFixed(2)}h (${session.duration}min)`);
      console.log(`   Commits: ${session.commitCount}`);
      console.log(`   Author: ${session.author}`);
      console.log(`   Description: ${session.description.substring(0, 80)}${session.description.length > 80 ? '...' : ''}`);
    });

    return analysis;
  }

  /**
   * Export analysis to JSON file
   */
  exportToFile(analysis, filename = null) {
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `git-time-analysis-${timestamp}.json`;
    const outputFile = filename || defaultFilename;
    
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log(`\n💾 Analysis saved to: ${outputFile}`);
    
    return outputFile;
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const options = {
    repository: '.',
    since: null,
    until: null,
    author: null,
    maxSessionGap: 2,
    defaultSessionTime: 30,
    output: null,
    verbose: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--since':
        options.since = args[++i];
        break;
      case '--until':
        options.until = args[++i];
        break;
      case '--author':
        options.author = args[++i];
        break;
      case '--repository':
      case '--repo':
        options.repository = args[++i];
        break;
      case '--gap':
        options.maxSessionGap = parseFloat(args[++i]);
        break;
      case '--session-time':
        options.defaultSessionTime = parseInt(args[++i]);
        break;
      case '--output':
      case '-o':
        options.output = args[++i];
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Git Time Analyzer - Estimate coding time from Git commits

Usage: node git-analyzer.js [options]

Options:
  --since <date>        Analyze commits since this date (e.g., "2025-01-01")
  --until <date>        Analyze commits until this date
  --author <name>       Filter commits by author name or email
  --repository <path>   Path to Git repository (default: current directory)
  --gap <hours>         Max hours between commits in same session (default: 2)
  --session-time <min>  Default minutes for single commits (default: 30)
  --output <file>       Output file for JSON results
  --verbose             Show detailed output
  --help               Show this help message

Examples:
  node git-analyzer.js --since "2025-11-01"
  node git-analyzer.js --author "john@example.com" --since "last week"
  node git-analyzer.js --repository "/path/to/project" --output "results.json"
        `);
        process.exit(0);
      default:
        if (!arg.startsWith('--')) {
          options.repository = arg;
        }
    }
  }

  try {
    const analyzer = new GitTimeAnalyzer({
      maxSessionGap: options.maxSessionGap,
      defaultSessionTime: options.defaultSessionTime,
      author: options.author
    });

    const analysis = analyzer.analyze(options.repository, options.since, options.until);
    analyzer.generateReport(analysis);

    if (options.output) {
      analyzer.exportToFile(analysis, options.output);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

module.exports = GitTimeAnalyzer;