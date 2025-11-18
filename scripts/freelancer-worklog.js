#!/usr/bin/env node

/**
 * Freelancer Work Log Automation
 * Complete workflow for Git time tracking and export
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class FreelancerWorkLog {
    constructor() {
        this.scriptsDir = __dirname;
        this.outputDir = path.join(__dirname, '..', 'reports');
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
        }
    }

    /**
     * Run complete workflow for a repository
     */
    async processRepository(repoPath, options = {}) {
        const repoName = path.basename(path.resolve(repoPath));
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
        const reportPrefix = `${repoName}_${timestamp}`;

        console.log(`\n🚀 Processing repository: ${repoName}`);
        console.log(`📁 Repository path: ${repoPath}`);
        console.log(`📊 Report prefix: ${reportPrefix}\n`);

        try {
            // 1. Run Git Analysis
            console.log('1️⃣ Running Git Analysis...');
            const analysisFile = path.join(this.outputDir, `${reportPrefix}_analysis.json`);
            await this.runGitAnalysis(repoPath, analysisFile, options);

            // 2. Generate CSV Export
            console.log('\n2️⃣ Generating CSV Export...');
            const csvFile = path.join(this.outputDir, `${reportPrefix}_timesheet.csv`);
            await this.generateCSVExport(repoPath, csvFile, options);

            // 3. Generate Summary Report
            console.log('\n3️⃣ Generating Summary Report...');
            const summaryFile = path.join(this.outputDir, `${reportPrefix}_summary.txt`);
            await this.generateSummaryReport(analysisFile, summaryFile, options);

            // 4. Generate Dashboard HTML
            console.log('\n4️⃣ Generating Dashboard...');
            const dashboardFile = path.join(this.outputDir, `${reportPrefix}_dashboard.html`);
            await this.generateDashboard(analysisFile, dashboardFile, options);

            console.log('\n✅ Processing Complete!');
            console.log('\n📋 Generated Files:');
            console.log(`   📊 Analysis Data: ${analysisFile}`);
            console.log(`   📈 CSV Timesheet: ${csvFile}`);
            console.log(`   📝 Summary Report: ${summaryFile}`);
            console.log(`   🌐 Dashboard: ${dashboardFile}`);

            return {
                analysis: analysisFile,
                csv: csvFile,
                summary: summaryFile,
                dashboard: dashboardFile
            };

        } catch (error) {
            console.error('❌ Processing failed:', error.message);
            throw error;
        }
    }

    async runGitAnalysis(repoPath, outputFile, options) {
        const gitAnalyzer = path.join(this.scriptsDir, 'git-analyzer.js');
        let command = `node "${gitAnalyzer}" --repository "${repoPath}" --output "${outputFile}"`;
        
        if (options.since) command += ` --since "${options.since}"`;
        if (options.until) command += ` --until "${options.until}"`;
        if (options.author) command += ` --author "${options.author}"`;
        
        execSync(command, { stdio: 'inherit' });
    }

    async generateCSVExport(repoPath, outputFile, options) {
        const csvExporter = path.join(this.scriptsDir, 'git-csv-exporter.js');
        let command = `node "${csvExporter}" "${repoPath}" "${outputFile}"`;
        
        if (options.project) command += ` --project "${options.project}"`;
        if (options.since) command += ` --since "${options.since}"`;
        if (options.until) command += ` --until "${options.until}"`;
        if (options.author) command += ` --author "${options.author}"`;
        
        execSync(command, { stdio: 'inherit' });
    }

    async generateSummaryReport(analysisFile, outputFile, options) {
        const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
        
        let summary = `FREELANCER WORK LOG SUMMARY\n`;
        summary += `=============================\n\n`;
        summary += `Repository: ${analysisData.repository}\n`;
        summary += `Report Date: ${new Date().toLocaleString()}\n`;
        summary += `Analysis Period: ${options.since || 'All time'} to ${options.until || 'Present'}\n`;
        summary += `Total Commits: ${analysisData.totalCommits}\n`;
        summary += `Total Sessions: ${analysisData.sessions.length}\n`;
        summary += `Total Hours: ${analysisData.totalHours}h\n\n`;
        
        // Weekly breakdown
        const weeklyTotals = this.calculateWeeklyTotals(analysisData.sessions);
        if (Object.keys(weeklyTotals).length > 1) {
            summary += `WEEKLY BREAKDOWN:\n`;
            summary += `=================\n`;
            Object.entries(weeklyTotals)
                .sort(([a], [b]) => new Date(a) - new Date(b))
                .forEach(([week, data]) => {
                    summary += `Week of ${week}: ${data.hours.toFixed(2)}h (${data.sessions} sessions, ${data.commits} commits)\n`;
                });
            summary += `\n`;
        }
        
        // Daily breakdown
        const dailyTotals = this.calculateDailyTotals(analysisData.sessions);
        summary += `DAILY BREAKDOWN:\n`;
        summary += `================\n`;
        Object.entries(dailyTotals)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .forEach(([date, data]) => {
                summary += `${date}: ${data.hours.toFixed(2)}h (${data.sessions} sessions)\n`;
            });
        summary += `\n`;
        
        // Session details
        summary += `SESSION DETAILS:\n`;
        summary += `================\n`;
        analysisData.sessions.forEach((session, index) => {
            const durationHours = session.duration / 60;
            summary += `${index + 1}. ${new Date(session.start).toLocaleDateString()} ${new Date(session.start).toLocaleTimeString()}\n`;
            summary += `   Duration: ${durationHours.toFixed(2)}h (${session.duration}min)\n`;
            summary += `   Author: ${session.author}\n`;
            summary += `   Commits: ${session.commitCount || session.commits.length}\n`;
            summary += `   Description: ${session.description}\n\n`;
        });
        
        fs.writeFileSync(outputFile, summary);
        console.log(`   📄 Summary saved to: ${outputFile}`);
    }

    async generateDashboard(analysisFile, outputFile, options) {
        const analysisData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
        const weeklyData = this.calculateWeeklyTotals(analysisData.sessions);
        const dailyData = this.calculateDailyTotals(analysisData.sessions);
        
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Work Log Dashboard - ${path.basename(analysisData.repository)}</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { text-align: center; margin-bottom: 15px; }
        .metric h3 { margin: 0; color: #333; }
        .metric .value { font-size: 2em; font-weight: bold; color: #007acc; }
        .chart-container { position: relative; height: 300px; width: 100%; }
        .sessions-list { max-height: 400px; overflow-y: auto; }
        .session { padding: 10px; border-bottom: 1px solid #eee; }
        .session:last-child { border-bottom: none; }
        .session-date { font-weight: bold; color: #333; }
        .session-details { font-size: 0.9em; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Work Log Dashboard</h1>
            <h2>${path.basename(analysisData.repository)}</h2>
            <p><strong>Total Time:</strong> ${analysisData.totalHours}h | <strong>Sessions:</strong> ${analysisData.sessions.length} | <strong>Commits:</strong> ${analysisData.totalCommits}</p>
            <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📈 Key Metrics</h3>
                <div class="metric">
                    <h4>Total Hours</h4>
                    <div class="value">${analysisData.totalHours}h</div>
                </div>
                <div class="metric">
                    <h4>Average Session</h4>
                    <div class="value">${(analysisData.totalHours / analysisData.sessions.length).toFixed(1)}h</div>
                </div>
                <div class="metric">
                    <h4>Commits per Hour</h4>
                    <div class="value">${(analysisData.totalCommits / analysisData.totalHours).toFixed(1)}</div>
                </div>
            </div>

            <div class="card">
                <h3>📊 Daily Hours</h3>
                <div class="chart-container">
                    <canvas id="dailyChart"></canvas>
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📅 Recent Sessions</h3>
                <div class="sessions-list">
                    ${analysisData.sessions.map((session, index) => {
                        const durationHours = session.duration / 60;
                        return `
                        <div class="session">
                            <div class="session-date">${new Date(session.start).toLocaleDateString()} - ${durationHours.toFixed(2)}h</div>
                            <div class="session-details">
                                ${session.description}<br>
                                <small>👤 ${session.author} | 📝 ${session.commitCount || session.commits.length} commits</small>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>

            <div class="card">
                <h3>📈 Weekly Trend</h3>
                <div class="chart-container">
                    <canvas id="weeklyChart"></canvas>
                </div>
            </div>
        </div>
    </div>

    <script>
        // Daily Chart
        const dailyCtx = document.getElementById('dailyChart').getContext('2d');
        const dailyData = ${JSON.stringify(dailyData)};
        
        new Chart(dailyCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(dailyData),
                datasets: [{
                    label: 'Hours',
                    data: Object.values(dailyData).map(d => d.hours),
                    backgroundColor: '#007acc',
                    borderColor: '#005999',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Hours'
                        }
                    }
                }
            }
        });

        // Weekly Chart
        const weeklyCtx = document.getElementById('weeklyChart').getContext('2d');
        const weeklyData = ${JSON.stringify(weeklyData)};
        
        if (Object.keys(weeklyData).length > 1) {
            new Chart(weeklyCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(weeklyData),
                    datasets: [{
                        label: 'Weekly Hours',
                        data: Object.values(weeklyData).map(d => d.hours),
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Hours'
                            }
                        }
                    }
                }
            });
        } else {
            weeklyCtx.canvas.style.display = 'none';
            weeklyCtx.canvas.parentElement.innerHTML = '<p style="text-align: center; color: #666; margin: 50px 0;">Not enough data for weekly trend</p>';
        }
    </script>
</body>
</html>`;
        
        fs.writeFileSync(outputFile, html);
        console.log(`   🌐 Dashboard saved to: ${outputFile}`);
    }

    calculateWeeklyTotals(sessions) {
        const weekly = {};
        
        sessions.forEach(session => {
            const date = new Date(session.start);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
            const weekKey = weekStart.toLocaleDateString();
            
            if (!weekly[weekKey]) {
                weekly[weekKey] = { hours: 0, sessions: 0, commits: 0 };
            }
            
            weekly[weekKey].hours += session.duration / 60;
            weekly[weekKey].sessions++;
            weekly[weekKey].commits += session.commitCount || session.commits.length;
        });
        
        return weekly;
    }

    calculateDailyTotals(sessions) {
        const daily = {};
        
        sessions.forEach(session => {
            const date = new Date(session.start).toLocaleDateString();
            
            if (!daily[date]) {
                daily[date] = { hours: 0, sessions: 0 };
            }
            
            daily[date].hours += session.duration / 60;
            daily[date].sessions++;
        });
        
        return daily;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
🕒 Freelancer Work Log Automation
==================================

Complete workflow for Git time tracking, analysis, and reporting.

Usage:
  node freelancer-worklog.js <repository> [options]

Options:
  --since <date>        Only include commits since date (e.g., "2025-11-01")
  --until <date>        Only include commits until date
  --author <name>       Filter commits by author name or email
  --project <name>      Set project name for reports

Examples:
  node freelancer-worklog.js .
  node freelancer-worklog.js /path/to/repo --project "Client Project"
  node freelancer-worklog.js . --since "2025-11-01" --author "john@example.com"
`);
        process.exit(0);
    }

    const repositoryPath = args[0] || '.';
    const options = {};

    // Parse options
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg.startsWith('--')) {
            const key = arg.substring(2);
            const value = args[i + 1];
            
            switch (key) {
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
                case 'project':
                    options.project = value;
                    i++;
                    break;
            }
        }
    }

    // Run the workflow
    const worklog = new FreelancerWorkLog();
    
    (async () => {
        try {
            const results = await worklog.processRepository(repositoryPath, options);
            
            console.log(`\n🎉 All done! Open the dashboard to view your work patterns:`);
            console.log(`   🌐 file://${results.dashboard}`);
            
        } catch (error) {
            console.error('❌ Workflow failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = FreelancerWorkLog;