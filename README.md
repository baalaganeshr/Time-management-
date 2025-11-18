# Freelancer Work Log System

A comprehensive time tracking solution that combines automated Git commit analysis with manual time tracking using Kimai.

## 🎯 Overview

This system helps freelancers and developers track their work time accurately by:
- **Automated Git Analysis**: Estimates work time from Git commit patterns
- **Manual Time Tracking**: Kimai web interface for precise time entry
- **Comprehensive Reporting**: CSV exports, summaries, and interactive dashboards
- **Client-Ready Reports**: Professional time reports for billing and project management

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Git Commits   │ ──▶│ Analysis Engine │ ──▶│    Reports      │
│                 │    │                 │    │                 │
│ • Timestamps    │    │ • Session Detect│    │ • CSV Export    │
│ • Author Info   │    │ • Time Estimate │    │ • Dashboard     │
│ • Commit Msgs   │    │ • Gap Analysis  │    │ • Summary       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
┌─────────────────┐    ┌─────────────────┐
│  Kimai Web UI   │ ◀─▶│ Time Database   │
│                 │    │                 │
│ • Manual Entry  │    │ • Projects      │
│ • Project Mgmt  │    │ • Activities    │
│ • Time Tracking │    │ • Timesheets    │
└─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
freelancer-work-log/
├── docker-compose.yml          # Kimai + MySQL setup
├── scripts/
│   ├── git-analyzer.js         # Core Git analysis tool
│   ├── git-csv-exporter.js     # CSV export functionality
│   ├── kimai-integration.js    # Kimai API integration (future)
│   ├── freelancer-worklog.js   # Complete workflow automation
│   └── api-explorer.js         # API testing utility
├── reports/                    # Generated reports directory
│   ├── *_analysis.json         # Raw analysis data
│   ├── *_timesheet.csv         # CSV for import into tools
│   ├── *_summary.txt           # Human-readable summary
│   └── *_dashboard.html        # Interactive visualization
└── kimai2/                     # Kimai data directory
    └── var/                    # Database and uploads
```

## 🚀 Quick Start

### 1. Start Kimai Time Tracking

```powershell
cd freelancer-work-log
docker-compose up -d
```

Access Kimai at: http://localhost:8001
- Username: `admin`
- Password: `admin123`

### 2. Analyze a Git Repository

```powershell
cd scripts
node freelancer-worklog.js /path/to/your/repo --project "Client Name"
```

### 3. View Results

The system generates:
- **CSV file**: Import into Excel, Google Sheets, or other time tracking tools
- **Dashboard**: Open the `.html` file in your browser for interactive charts
- **Summary**: Text report for quick overview

## 🔧 Detailed Tool Usage

### Git Analyzer

Analyzes Git commits to estimate work time:

```powershell
node git-analyzer.js --help
```

**Key Features:**
- **Session Detection**: Groups commits into work sessions based on time gaps
- **Time Estimation**: 30min default for single commits, calculated for sessions
- **Flexible Filtering**: By date range, author, repository
- **Smart Gap Detection**: 2-hour default gap between sessions

**Examples:**
```powershell
# Analyze current repository
node git-analyzer.js --verbose

# Analyze specific date range
node git-analyzer.js --since "2025-11-01" --until "2025-11-30"

# Filter by author
node git-analyzer.js --author "john@example.com"

# Custom session gap (3 hours)
node git-analyzer.js --gap 3
```

### CSV Exporter

Converts Git analysis to CSV format for importing into time tracking tools:

```powershell
node git-csv-exporter.js --help
```

**Output Format:**
- Date, Start Time, End Time
- Duration (hours), Description
- Project, Author, Commits, Files Changed

**Examples:**
```powershell
# Basic export
node git-csv-exporter.js . timesheet.csv

# With project name and summary
node git-csv-exporter.js . work-log.csv --project "Client Project" --summary

# Date range export
node git-csv-exporter.js . weekly.csv --since "2025-11-11" --until "2025-11-17"
```

### Complete Workflow

Runs full analysis pipeline:

```powershell
node freelancer-worklog.js --help
```

**Generates:**
1. JSON analysis data
2. CSV timesheet
3. Text summary report
4. Interactive HTML dashboard

**Examples:**
```powershell
# Analyze current repository
node freelancer-worklog.js .

# Full project analysis
node freelancer-worklog.js /path/to/repo --project "Client Project"

# Weekly report
node freelancer-worklog.js . --since "2025-11-11" --project "Weekly Work"
```

## 📊 Understanding the Analysis

### Time Estimation Algorithm

1. **Single Commits**: 30 minutes default
2. **Commit Sessions**: 
   - Groups commits within 2-hour gaps
   - Estimates time based on commit intervals
   - Adds buffer time for initial setup
3. **Session Boundaries**:
   - Gaps > 2 hours = new session
   - Different days = new session
   - Different authors = separate tracking

### Session Detection

```
Commit A (10:00) ──2min──▶ Commit B (10:02) ──30min──▶ Commit C (10:32)
│                                                                    │
└─────────────────── Session 1: ~45 minutes ──────────────────────┘

                     3 hours gap

Commit D (13:45) ──────────────▶ Commit E (14:15)
│                                            │
└──────── Session 2: ~45 minutes ──────────┘
```

## 📈 Dashboard Features

The interactive dashboard includes:
- **Key Metrics**: Total hours, average session length, commits per hour
- **Daily Chart**: Bar chart showing daily work distribution
- **Weekly Trend**: Line chart for weekly work patterns
- **Session List**: Detailed breakdown of each work session

## 🔗 Integration Options

### Manual Import
1. Export to CSV using `git-csv-exporter.js`
2. Import CSV into your preferred time tracking tool
3. Use Kimai web interface for additional manual entries

### Automated Import (Future)
- Direct API integration with Kimai
- Automatic timesheet creation from Git data
- Synchronization between Git analysis and manual entries

## ⚙️ Configuration Options

### Environment Variables
```bash
KIMAI_URL=http://localhost:8001
KIMAI_USERNAME=admin
KIMAI_PASSWORD=admin123
```

### Command Line Options
- `--since`: Start date for analysis
- `--until`: End date for analysis  
- `--author`: Filter by commit author
- `--project`: Set project name for reports
- `--gap`: Hours between commits to separate sessions
- `--session-time`: Default minutes for single commits

## 📝 Example Workflow

1. **Daily**: Quick analysis of yesterday's work
   ```powershell
   node freelancer-worklog.js . --since "yesterday"
   ```

2. **Weekly**: Generate client report for the week
   ```powershell
   node freelancer-worklog.js . --since "2025-11-11" --project "Client ABC"
   ```

3. **Monthly**: Complete project analysis
   ```powershell
   node freelancer-worklog.js . --since "2025-11-01" --project "Project XYZ"
   ```

## 🛠️ Troubleshooting

### Common Issues

**Git Repository Not Found**
```
Error: Not a git repository
```
- Ensure you're in a Git repository directory
- Use `git init` if needed

**No Commits Found**
```
Found 0 commits
```
- Check date range with `--since` and `--until`
- Verify author filter with `--author`

**Docker Issues**
```
docker-compose up -d
```
- Ensure Docker is running
- Check port 8001 is available

### Performance Notes
- Large repositories (>10k commits) may take several minutes
- Use date ranges to limit analysis scope
- Consider author filtering for team repositories

## 🎨 Customization

### Modify Time Estimates
Edit `git-analyzer.js`:
```javascript
const sessionTime = 30; // Default minutes for single commits
const maxGap = 2;       // Hours between commits to separate sessions
```

### Custom Project Categories
Edit `freelancer-worklog.js`:
```javascript
const projectMapping = {
    'repo-name': 'Custom Project Name',
    'client-project': 'Client ABC - Development'
};
```

### Dashboard Styling
Modify the HTML template in `freelancer-worklog.js` to customize colors, layout, and charts.

## 📊 Sample Output

### CSV Format
```csv
Date,Start Time,End Time,Duration (hours),Description,Project,Author,Commits,Files Changed
18/11/2025,11:27:31 am,11:57:31 am,0.50,"Initial commit","Time Management Development","R.Baala Ganesh",1,1
```

### Summary Report
```
FREELANCER WORK LOG SUMMARY
=============================

Repository: /path/to/project
Total Hours: 0.5h
Total Sessions: 1
Total Commits: 1

DAILY BREAKDOWN:
18/11/2025: 0.50h (1 sessions)
```

## 🚀 Future Enhancements

- **Direct Kimai API Integration**: Automatic timesheet creation
- **Multiple Repository Analysis**: Track work across projects
- **Advanced Time Algorithms**: Machine learning-based estimates
- **Team Analytics**: Multi-developer insights
- **Invoice Generation**: Client-ready billing reports
- **Integration with Other Tools**: Jira, Trello, GitHub Issues

---

## 📞 Support

This system is designed to be simple, reliable, and extensible. The modular architecture allows for easy customization and integration with existing workflows.

For more advanced usage or custom integrations, each script includes detailed help documentation accessible via the `--help` flag.