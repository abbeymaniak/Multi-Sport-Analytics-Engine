#!/bin/zsh
# Manual runner for the Weekly Prediction Ingestion Pipeline

# Target paths
PYTHON_ENV="/Users/primastech/Workspace/prediction/draws/.venv/bin/python"
PIPELINE_SCRIPT="/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/weekly_pipeline.py"
LOGS_DIR="/Users/primastech/Workspace/prediction/Multi-Sports-Analytics-Engine/logs"
LOG_FILE="$LOGS_DIR/weekly_run_$(date +'%Y-%m-%d_%H-%M-%S').log"

# Ensure logs directory exists
mkdir -p "$LOGS_DIR"

echo "==========================================" | tee -a "$LOG_FILE"
echo "🕒 Starting Weekly Pipeline Manual Run" | tee -a "$LOG_FILE"
echo "🕒 Local Time: $(date)" | tee -a "$LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"

# Execute pipeline script and redirect all output to log file as well as displaying it
"$PYTHON_ENV" "$PIPELINE_SCRIPT" 2>&1 | tee -a "$LOG_FILE"

STATUS=$?
echo "==========================================" | tee -a "$LOG_FILE"
if [ $STATUS -eq 0 ]; then
    echo "✅ Weekly Pipeline completed successfully." | tee -a "$LOG_FILE"
else
    echo "❌ Weekly Pipeline failed with status code $STATUS." | tee -a "$LOG_FILE"
fi
echo "🕒 Completed Time: $(date)" | tee -a "$LOG_FILE"
echo "📝 Log file saved to: $LOG_FILE"
echo "==========================================" | tee -a "$LOG_FILE"

exit $STATUS
