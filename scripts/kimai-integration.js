#!/usr/bin/env node

/**
 * Kimai Integration Script
 * Automatically creates timesheet entries in Kimai based on Git commit analysis
 */

const https = require('https');
const http = require('http');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class KimaiIntegration {
    constructor(config = {}) {
        this.config = {
            kimaiUrl: config.kimaiUrl || 'http://localhost:8001',
            username: config.username || 'admin',
            password: config.password || 'admin123',
            apiToken: config.apiToken || null,
            defaultProject: config.defaultProject || 1,
            defaultActivity: config.defaultActivity || 1,
            ...config
        };
        this.authToken = null;
    }

    /**
     * Authenticate with Kimai API
     */
    async authenticate() {
        if (this.config.apiToken) {
            this.authToken = this.config.apiToken;
            return true;
        }

        const loginData = JSON.stringify({
            username: this.config.username,
            password: this.config.password
        });

        try {
            const response = await this.makeRequest('/api/auth', 'POST', loginData, {
                'Content-Type': 'application/json'
            });
            
            if (response.token) {
                this.authToken = response.token;
                console.log('✅ Successfully authenticated with Kimai');
                return true;
            }
        } catch (error) {
            console.error('❌ Authentication failed:', error.message);
            return false;
        }
        return false;
    }

    /**
     * Make HTTP request to Kimai API
     */
    makeRequest(endpoint, method = 'GET', data = null, headers = {}) {
        return new Promise((resolve, reject) => {
            const url = new URL(this.config.kimaiUrl + endpoint);
            const options = {
                hostname: url.hostname,
                port: url.port || (url.protocol === 'https:' ? 443 : 80),
                path: url.pathname + url.search,
                method: method,
                headers: {
                    'User-Agent': 'Kimai-Git-Integration/1.0',
                    ...headers
                }
            };

            if (this.authToken) {
                options.headers['Authorization'] = `Bearer ${this.authToken}`;
            }

            if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
                options.headers['Content-Length'] = Buffer.byteLength(data);
                if (!options.headers['Content-Type']) {
                    options.headers['Content-Type'] = 'application/json';
                }
            }

            const client = url.protocol === 'https:' ? https : http;
            const req = client.request(options, (res) => {
                let responseData = '';

                res.on('data', (chunk) => {
                    responseData += chunk;
                });

                res.on('end', () => {
                    try {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            const parsed = responseData ? JSON.parse(responseData) : {};
                            resolve(parsed);
                        } else {
                            reject(new Error(`HTTP ${res.statusCode}: ${responseData}`));
                        }
                    } catch (error) {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(responseData);
                        } else {
                            reject(new Error(`Request failed: ${error.message}`));
                        }
                    }
                });
            });

            req.on('error', (error) => {
                reject(new Error(`Request error: ${error.message}`));
            });

            if (data) {
                req.write(data);
            }

            req.end();
        });
    }

    /**
     * Get available projects from Kimai
     */
    async getProjects() {
        try {
            const projects = await this.makeRequest('/api/projects');
            return projects;
        } catch (error) {
            console.error('❌ Failed to fetch projects:', error.message);
            return [];
        }
    }

    /**
     * Get available activities from Kimai
     */
    async getActivities() {
        try {
            const activities = await this.makeRequest('/api/activities');
            return activities;
        } catch (error) {
            console.error('❌ Failed to fetch activities:', error.message);
            return [];
        }
    }

    /**
     * Create a timesheet entry in Kimai
     */
    async createTimesheet(entry) {
        const timesheetData = {
            begin: entry.begin,
            end: entry.end,
            project: entry.project || this.config.defaultProject,
            activity: entry.activity || this.config.defaultActivity,
            description: entry.description || 'Git commit work',
            tags: entry.tags || ['git', 'development']
        };

        try {
            const response = await this.makeRequest('/api/timesheets', 'POST', JSON.stringify(timesheetData));
            console.log(`✅ Created timesheet entry: ${entry.description} (${entry.duration}h)`);
            return response;
        } catch (error) {
            console.error(`❌ Failed to create timesheet: ${error.message}`);
            return null;
        }
    }

    /**
     * Convert Git analysis sessions to Kimai timesheet entries
     */
    convertGitSessionsToTimesheets(gitAnalysis, projectMapping = {}) {
        const timesheets = [];

        for (const session of gitAnalysis.sessions) {
            const startTime = new Date(session.start);
            const endTime = new Date(startTime.getTime() + session.duration * 60 * 60 * 1000);

            // Determine project based on repository or custom mapping
            const repoName = path.basename(gitAnalysis.repository);
            const project = projectMapping[repoName] || this.config.defaultProject;

            const timesheet = {
                begin: startTime.toISOString(),
                end: endTime.toISOString(),
                project: project,
                activity: this.config.defaultActivity,
                description: `${session.description} (${session.commits} commits)`,
                duration: session.duration,
                tags: ['git', 'development', session.author.toLowerCase().replace(/\s+/g, '-')]
            };

            timesheets.push(timesheet);
        }

        return timesheets;
    }

    /**
     * Import Git analysis data into Kimai
     */
    async importGitData(gitAnalysisFile, options = {}) {
        try {
            // Read Git analysis results
            const analysisData = JSON.parse(fs.readFileSync(gitAnalysisFile, 'utf8'));
            
            console.log(`📊 Importing ${analysisData.totalSessions} sessions from Git analysis...`);

            // Authenticate with Kimai
            const authenticated = await this.authenticate();
            if (!authenticated) {
                throw new Error('Failed to authenticate with Kimai');
            }

            // Convert sessions to timesheets
            const timesheets = this.convertGitSessionsToTimesheets(analysisData, options.projectMapping || {});
            
            let successCount = 0;
            let failCount = 0;

            // Create each timesheet entry
            for (const timesheet of timesheets) {
                const result = await this.createTimesheet(timesheet);
                if (result) {
                    successCount++;
                } else {
                    failCount++;
                }
                
                // Small delay to avoid overwhelming the API
                await new Promise(resolve => setTimeout(resolve, 100));
            }

            console.log(`\n📈 Import Summary:`);
            console.log(`✅ Successfully created: ${successCount} entries`);
            console.log(`❌ Failed to create: ${failCount} entries`);
            console.log(`⏱️  Total time imported: ${analysisData.totalHours}h`);

        } catch (error) {
            console.error('❌ Import failed:', error.message);
        }
    }

    /**
     * Run Git analysis and import directly
     */
    async analyzeAndImport(repositoryPath, options = {}) {
        const gitAnalyzerPath = path.join(__dirname, 'git-analyzer.js');
        const tempFile = path.join(__dirname, 'temp-analysis.json');

        try {
            // Run Git analysis
            console.log('🔍 Analyzing Git repository...');
            const gitCommand = `node "${gitAnalyzerPath}" --repository "${repositoryPath}" --output "${tempFile}"`;
            
            if (options.since) gitCommand += ` --since "${options.since}"`;
            if (options.until) gitCommand += ` --until "${options.until}"`;
            if (options.author) gitCommand += ` --author "${options.author}"`;

            execSync(gitCommand, { stdio: 'inherit' });

            // Import the results
            await this.importGitData(tempFile, options);

            // Clean up temp file
            fs.unlinkSync(tempFile);

        } catch (error) {
            console.error('❌ Analysis and import failed:', error.message);
        }
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
🕒 Kimai Git Integration Tool
=============================

Import Git commit analysis data directly into Kimai time tracking.

Usage:
  node kimai-integration.js [command] [options]

Commands:
  import <file>         Import Git analysis JSON file into Kimai
  analyze <repo>        Analyze Git repository and import directly
  test-connection       Test connection to Kimai API

Options:
  --kimai-url <url>     Kimai server URL (default: http://localhost:8001)
  --username <name>     Kimai username (default: admin)
  --password <pass>     Kimai password (default: admin123)
  --token <token>       Kimai API token (alternative to username/password)
  --project <id>        Default project ID (default: 1)
  --activity <id>       Default activity ID (default: 1)
  --since <date>        Only import commits since date
  --until <date>        Only import commits until date
  --author <name>       Only import commits by author

Examples:
  node kimai-integration.js test-connection
  node kimai-integration.js analyze "/path/to/repo"
  node kimai-integration.js import analysis.json --project 2
  node kimai-integration.js analyze . --since "2025-11-01" --author "john@example.com"
`);
        process.exit(0);
    }

    const command = args[0];
    const config = {};
    const options = {};

    // Parse command line arguments
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            
            switch (key) {
                case 'kimai-url':
                    config.kimaiUrl = value;
                    i++;
                    break;
                case 'username':
                    config.username = value;
                    i++;
                    break;
                case 'password':
                    config.password = value;
                    i++;
                    break;
                case 'token':
                    config.apiToken = value;
                    i++;
                    break;
                case 'project':
                    config.defaultProject = parseInt(value);
                    i++;
                    break;
                case 'activity':
                    config.defaultActivity = parseInt(value);
                    i++;
                    break;
                case 'since':
                    options.since = value;
                    i++;
                    break;
                case 'until':
                    options.until = value;
                    i++;
                    break;
                case 'author':
                    options.author = value;
                    i++;
                    break;
            }
        }
    }

    const integration = new KimaiIntegration(config);

    // Execute commands
    (async () => {
        try {
            switch (command) {
                case 'test-connection':
                    console.log('🔗 Testing connection to Kimai...');
                    const success = await integration.authenticate();
                    if (success) {
                        const projects = await integration.getProjects();
                        const activities = await integration.getActivities();
                        console.log(`✅ Connection successful! Found ${projects.length} projects and ${activities.length} activities.`);
                    }
                    break;

                case 'import':
                    const file = args[1];
                    if (!file) {
                        console.error('❌ Please specify a file to import');
                        process.exit(1);
                    }
                    await integration.importGitData(file, options);
                    break;

                case 'analyze':
                    const repo = args[1];
                    if (!repo) {
                        console.error('❌ Please specify a repository path');
                        process.exit(1);
                    }
                    await integration.analyzeAndImport(repo, options);
                    break;

                default:
                    console.error(`❌ Unknown command: ${command}`);
                    console.log('Use --help for usage information');
                    process.exit(1);
            }
        } catch (error) {
            console.error('❌ Error:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = KimaiIntegration;