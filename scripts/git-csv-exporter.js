#!/usr/bin/env node

/**
 * Simple Git to CSV Exporter
 * Export Git analysis data to CSV format for manual import into time tracking tools
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class GitToCSVExporter {
    constructor() {
        this.csvHeaders = [
            'Date',
            'Start Time',
            'End Time', 
            'Duration (hours)',
            'Description',
            'Project',
            'Author',
            'Commits',
            'Files Changed'
        ];
    }

    /**
     * Run Git analysis and export to CSV
     */
    async analyzeAndExport(repositoryPath, outputFile, options = {}) {
        const gitAnalyzerPath = path.join(__dirname, 'git-analyzer.js');
        const tempFile = path.join(__dirname, 'temp-analysis.json');

        try {
            console.log('🔍 Analyzing Git repository...');
            
            // Build Git analyzer command
            let gitCommand = `node "${gitAnalyzerPath}" --repository "${repositoryPath}" --output "${tempFile}"`;
            
            if (options.since) gitCommand += ` --since "${options.since}"`;
            if (options.until) gitCommand += ` --until "${options.until}"`;
            if (options.author) gitCommand += ` --author "${options.author}"`;
            if (options.verbose) gitCommand += ` --verbose`;

            execSync(gitCommand, { stdio: 'inherit' });

            // Read analysis results
            const analysisData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
            
            // Convert to CSV
            const csvData = this.convertToCSV(analysisData, options);
            
            // Write CSV file
            fs.writeFileSync(outputFile, csvData);
            
            console.log(`\n📊 Export Complete!`);
            console.log(`✅ Exported ${analysisData.totalSessions} sessions to: ${outputFile}`);
            console.log(`⏱️  Total time: ${analysisData.totalHours}h across ${analysisData.totalCommits} commits`);
            
            // Clean up temp file
            fs.unlinkSync(tempFile);
            
            return outputFile;

        } catch (error) {
            console.error('❌ Export failed:', error.message);
            throw error;
        }
    }

    /**
     * Convert Git analysis data to CSV format
     */
    convertToCSV(analysisData, options = {}) {
        const rows = [];
        
        // Add headers
        rows.push(this.csvHeaders.join(','));
        
        // Add data rows
        for (const session of analysisData.sessions) {
            const startDate = new Date(session.start);
            const durationHours = session.duration / 60; // Convert minutes to hours
            const endDate = new Date(startDate.getTime() + session.duration * 60 * 1000); // duration is in minutes
            
            // Determine project name
            const projectName = options.projectName || path.basename(analysisData.repository) || 'Development';
            
            const row = [
                startDate.toLocaleDateString(), // Date
                startDate.toLocaleTimeString(), // Start Time
                endDate.toLocaleTimeString(),   // End Time
                durationHours.toFixed(2),       // Duration (hours)
                `"${session.description.replace(/"/g, '""')}"`, // Description (escaped)
                `"${projectName}"`,             // Project
                `"${session.author}"`,          // Author
                session.commitCount || session.commits.length, // Commits
                session.commitCount || session.commits.length  // Files Changed (approximation)
            ];
            
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }

    /**
     * Generate summary report
     */
    generateSummary(analysisData, outputDir) {
        const summaryFile = path.join(outputDir, 'time-summary.txt');
        
        let summary = `GIT TIME ANALYSIS SUMMARY\n`;
        summary += `========================\n\n`;
        summary += `Repository: ${analysisData.repository}\n`;
        summary += `Analysis Date: ${new Date().toLocaleString()}\n`;
        summary += `Total Commits: ${analysisData.totalCommits}\n`;
        summary += `Total Sessions: ${analysisData.totalSessions}\n`;
        summary += `Total Hours: ${analysisData.totalHours}h\n\n`;
        
        summary += `SESSION BREAKDOWN:\n`;
        summary += `==================\n`;
        
        analysisData.sessions.forEach((session, index) => {
            const durationHours = session.duration / 60; // Convert minutes to hours
            summary += `${index + 1}. ${new Date(session.start).toLocaleDateString()} - ${durationHours.toFixed(2)}h\n`;
            summary += `   Author: ${session.author}\n`;
            summary += `   Commits: ${session.commitCount || session.commits.length}\n`;
            summary += `   Description: ${session.description}\n\n`;
        });
        
        // Add daily breakdown
        const dailyTotals = {};
        analysisData.sessions.forEach(session => {
            const date = new Date(session.start).toLocaleDateString();
            const durationHours = session.duration / 60; // Convert minutes to hours
            dailyTotals[date] = (dailyTotals[date] || 0) + durationHours;
        });
        
        summary += `DAILY TOTALS:\n`;
        summary += `=============\n`;
        Object.entries(dailyTotals)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .forEach(([date, hours]) => {
                summary += `${date}: ${hours.toFixed(2)}h\n`;
            });
        
        fs.writeFileSync(summaryFile, summary);
        console.log(`📋 Summary report saved to: ${summaryFile}`);
        
        return summaryFile;
    }
}

// CLI Interface
if (require.main === module) {
    const args = process.argv.slice(2);
    
    if (args.includes('--help') || args.length === 0) {
        console.log(`
📊 Git to CSV Time Exporter
============================

Export Git commit analysis data to CSV format for import into time tracking tools.

Usage:
  node git-csv-exporter.js <repository> <output.csv> [options]

Options:
  --since <date>        Only include commits since date (e.g., "2025-11-01")
  --until <date>        Only include commits until date
  --author <name>       Filter commits by author name or email
  --project <name>      Set project name for all entries
  --summary             Also generate a text summary report
  --verbose             Show detailed output during analysis

Examples:
  node git-csv-exporter.js . timesheet.csv
  node git-csv-exporter.js /path/to/repo work-log.csv --project "Client Project"
  node git-csv-exporter.js . weekly-report.csv --since "2025-11-11" --summary
`);
        process.exit(0);
    }

    const repositoryPath = args[0] || '.';
    const outputFile = args[1] || 'git-timesheet.csv';
    const options = {};

    // Parse options
    for (let i = 2; i < args.length; i++) {
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
                    options.projectName = value;
                    i++;
                    break;
                case 'summary':
                    options.generateSummary = true;
                    break;
                case 'verbose':
                    options.verbose = true;
                    break;
            }
        }
    }

    // Run the export
    const exporter = new GitToCSVExporter();
    
    (async () => {
        try {
            const outputPath = await exporter.analyzeAndExport(repositoryPath, outputFile, options);
            
            if (options.generateSummary) {
                // Re-read the analysis data for summary
                const tempFile = path.join(__dirname, 'temp-analysis.json');
                if (fs.existsSync(tempFile)) {
                    const analysisData = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
                    exporter.generateSummary(analysisData, path.dirname(outputPath));
                    fs.unlinkSync(tempFile);
                }
            }
            
            console.log(`\n🎉 Ready for import into your time tracking tool!`);
            
        } catch (error) {
            console.error('❌ Export failed:', error.message);
            process.exit(1);
        }
    })();
}

module.exports = GitToCSVExporter;