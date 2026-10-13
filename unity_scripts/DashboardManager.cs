using UnityEngine;
using TMPro;

/// <summary>
/// Updates TextMeshPro UI elements with sensor and electrical data.
/// Connects to SensorDataReader and ElectricalDataReader to display real-time values.
/// </summary>
public class DashboardManager : MonoBehaviour
{
    [Header("Data Readers")]
    [Tooltip("Reference to SensorDataReader component")]
    public SensorDataReader sensorReader;
    
    [Tooltip("Reference to ElectricalDataReader component")]
    public ElectricalDataReader electricalReader;
    
    [Header("Sensor UI - Vibration")]
    public TextMeshProUGUI vibrationLabel;
    public TextMeshProUGUI vibrationValue;
    public TextMeshProUGUI vibrationUnit;
    
    [Header("Sensor UI - Health Score")]
    public TextMeshProUGUI healthScoreLabel;
    public TextMeshProUGUI healthScoreValue;
    public TextMeshProUGUI healthScoreUnit;
    
    [Header("Sensor UI - Machine Status")]
    public TextMeshProUGUI statusLabel;
    public TextMeshProUGUI statusValue;
    
    [Header("Sensor UI - Anomaly Detection")]
    public TextMeshProUGUI anomalyLabel;
    public TextMeshProUGUI anomalyValue;
    public TextMeshProUGUI anomalyScoreLabel;
    public TextMeshProUGUI anomalyScoreValue;
    
    [Header("Sensor UI - Maintenance")]
    public TextMeshProUGUI maintenanceLabel;
    public TextMeshProUGUI maintenanceValue;
    public TextMeshProUGUI maintenancePriorityLabel;
    public TextMeshProUGUI maintenancePriorityValue;
    
    [Header("Electrical UI - Voltage")]
    public TextMeshProUGUI voltageLabel;
    public TextMeshProUGUI voltageValue;
    public TextMeshProUGUI voltageUnit;
    
    [Header("Electrical UI - Current")]
    public TextMeshProUGUI currentLabel;
    public TextMeshProUGUI currentValue;
    public TextMeshProUGUI currentUnit;
    
    [Header("Electrical UI - Power")]
    public TextMeshProUGUI powerLabel;
    public TextMeshProUGUI powerValue;
    public TextMeshProUGUI powerUnit;
    
    [Header("Electrical UI - Power Factor")]
    public TextMeshProUGUI powerFactorLabel;
    public TextMeshProUGUI powerFactorValue;
    
    [Header("Electrical UI - Printing Stage")]
    public TextMeshProUGUI stageLabel;
    public TextMeshProUGUI stageValue;
    
    [Header("Electrical UI - Time")]
    public TextMeshProUGUI timeLabel;
    public TextMeshProUGUI timeValue;
    public TextMeshProUGUI timeUnit;
    
    [Header("Timestamp UI")]
    public TextMeshProUGUI sensorTimestampLabel;
    public TextMeshProUGUI sensorTimestampValue;
    public TextMeshProUGUI electricalTimestampLabel;
    public TextMeshProUGUI electricalTimestampValue;
    
    [Header("Status Indicators")]
    [Tooltip("Object to enable/disable when anomaly is detected")]
    public GameObject anomalyIndicator;
    
    [Tooltip("Object to enable/disable when maintenance is required")]
    public GameObject maintenanceIndicator;
    
    [Header("Color Settings")]
    public Color normalHealthColor = new Color(0f, 0.8f, 0f); // Green
    public Color warningHealthColor = new Color(1f, 0.8f, 0f); // Yellow
    public Color abnormalHealthColor = new Color(1f, 0.2f, 0.2f); // Red
    
    [Header("Update Settings")]
    [Tooltip("Update UI every N frames (0 = every frame)")]
    public int updateFrequency = 1;
    
    private int frameCounter = 0;
    
    #region Unity Lifecycle
    
    void Start()
    {
        // Validate references
        if (sensorReader == null)
        {
            Debug.LogWarning("[DashboardManager] SensorDataReader not assigned. Sensor UI will not update.");
        }
        
        if (electricalReader == null)
        {
            Debug.LogWarning("[DashboardManager] ElectricalDataReader not assigned. Electrical UI will not update.");
        }
        
        // Initialize labels
        InitializeLabels();
        
        // Initial update
        UpdateDashboard();
    }
    
    void Update()
    {
        frameCounter++;
        
        if (updateFrequency <= 0 || frameCounter % updateFrequency == 0)
        {
            UpdateDashboard();
        }
    }
    
    #endregion
    
    #region Initialization
    
    /// <summary>
    /// Set static label text if assigned
    /// </summary>
    private void InitializeLabels()
    {
        if (vibrationLabel != null) vibrationLabel.text = "Vibration RMS";
        if (vibrationUnit != null) vibrationUnit.text = "m/s²";
        
        if (healthScoreLabel != null) healthScoreLabel.text = "Health Score";
        if (healthScoreUnit != null) healthScoreUnit.text = "%";
        
        if (statusLabel != null) statusLabel.text = "Machine Status";
        
        if (anomalyLabel != null) anomalyLabel.text = "Anomaly";
        if (anomalyScoreLabel != null) anomalyScoreLabel.text = "Anomaly Score";
        
        if (maintenanceLabel != null) maintenanceLabel.text = "Maintenance";
        if (maintenancePriorityLabel != null) maintenancePriorityLabel.text = "Priority";
        
        if (voltageLabel != null) voltageLabel.text = "Voltage";
        if (voltageUnit != null) voltageUnit.text = "V";
        
        if (currentLabel != null) currentLabel.text = "Current";
        if (currentUnit != null) currentUnit.text = "A";
        
        if (powerLabel != null) powerLabel.text = "Power";
        if (powerUnit != null) powerUnit.text = "W";
        
        if (powerFactorLabel != null) powerFactorLabel.text = "Power Factor";
        
        if (stageLabel != null) stageLabel.text = "Printing Stage";
        
        if (timeLabel != null) timeLabel.text = "Elapsed Time";
        if (timeUnit != null) timeUnit.text = "s";
        
        if (sensorTimestampLabel != null) sensorTimestampLabel.text = "Sensor Timestamp";
        if (electricalTimestampLabel != null) electricalTimestampLabel.text = "Electrical Timestamp";
    }
    
    #endregion
    
    #region Dashboard Update
    
    /// <summary>
    /// Update all UI elements with current data
    /// </summary>
    public void UpdateDashboard()
    {
        // Update sensor data
        if (sensorReader != null && sensorReader.IsLoaded)
        {
            UpdateSensorUI(sensorReader.CurrentData);
        }
        else
        {
            SetSensorUIDefaults();
        }
        
        // Update electrical data
        if (electricalReader != null && electricalReader.IsLoaded)
        {
            UpdateElectricalUI(electricalReader.CurrentData);
        }
        else
        {
            SetElectricalUIDefaults();
        }
    }
    
    /// <summary>
    /// Update sensor-related UI elements
    /// </summary>
    private void UpdateSensorUI(SensorDataReader.SensorDataRow data)
    {
        if (data == null)
        {
            SetSensorUIDefaults();
            return;
        }
        
        // Vibration
        if (vibrationValue != null)
            vibrationValue.text = data.vibrationRms.ToString("F2");
        
        // Health Score
        if (healthScoreValue != null)
        {
            healthScoreValue.text = data.healthScore.ToString("F1");
            healthScoreValue.color = GetHealthColor(data.healthScore);
        }
        
        // Machine Status
        if (statusValue != null)
        {
            statusValue.text = data.machineStatus;
            statusValue.color = GetStatusColor(data.machineStatus);
        }
        
        // Anomaly Detection
        if (anomalyValue != null)
        {
            anomalyValue.text = data.anomalyDetected == 1 ? "DETECTED" : "Normal";
            anomalyValue.color = data.anomalyDetected == 1 ? abnormalHealthColor : normalHealthColor;
        }
        
        if (anomalyScoreValue != null)
            anomalyScoreValue.text = data.anomalyScore.ToString("F3");
        
        // Maintenance
        if (maintenanceValue != null)
            maintenanceValue.text = data.maintenanceRecommendation;
        
        if (maintenancePriorityValue != null)
        {
            maintenancePriorityValue.text = data.maintenancePriority;
            maintenancePriorityValue.color = GetPriorityColor(data.maintenancePriority);
        }
        
        // Timestamp
        if (sensorTimestampValue != null)
            sensorTimestampValue.text = data.timestamp;
        
        // Status indicators
        if (anomalyIndicator != null)
            anomalyIndicator.SetActive(data.anomalyDetected == 1);
        
        if (maintenanceIndicator != null)
            maintenanceIndicator.SetActive(data.maintenanceRecommendation != "NO_ACTION");
    }
    
    /// <summary>
    /// Update electrical-related UI elements
    /// </summary>
    private void UpdateElectricalUI(ElectricalDataReader.ElectricalDataRow data)
    {
        if (data == null)
        {
            SetElectricalUIDefaults();
            return;
        }
        
        // Voltage
        if (voltageValue != null)
            voltageValue.text = data.voltage.ToString("F2");
        
        // Current
        if (currentValue != null)
            currentValue.text = data.current.ToString("F3");
        
        // Power
        if (powerValue != null)
            powerValue.text = data.activePower.ToString("F2");
        
        // Power Factor
        if (powerFactorValue != null)
            powerFactorValue.text = data.powerFactor.ToString("F3");
        
        // Printing Stage
        if (stageValue != null)
            stageValue.text = data.printingStage.ToString();
        
        // Time
        if (timeValue != null)
            timeValue.text = data.timeSec.ToString("F2");
        
        // Timestamp
        if (electricalTimestampValue != null)
            electricalTimestampValue.text = data.timestamp;
    }
    
    /// <summary>
    /// Set sensor UI to default/empty values
    /// </summary>
    private void SetSensorUIDefaults()
    {
        if (vibrationValue != null) vibrationValue.text = "--";
        if (healthScoreValue != null)
        {
            healthScoreValue.text = "--";
            healthScoreValue.color = Color.white;
        }
        if (statusValue != null)
        {
            statusValue.text = "N/A";
            statusValue.color = Color.white;
        }
        if (anomalyValue != null)
        {
            anomalyValue.text = "N/A";
            anomalyValue.color = Color.white;
        }
        if (anomalyScoreValue != null) anomalyScoreValue.text = "--";
        if (maintenanceValue != null) maintenanceValue.text = "N/A";
        if (maintenancePriorityValue != null)
        {
            maintenancePriorityValue.text = "N/A";
            maintenancePriorityValue.color = Color.white;
        }
        if (sensorTimestampValue != null) sensorTimestampValue.text = "N/A";
        
        if (anomalyIndicator != null) anomalyIndicator.SetActive(false);
        if (maintenanceIndicator != null) maintenanceIndicator.SetActive(false);
    }
    
    /// <summary>
    /// Set electrical UI to default/empty values
    /// </summary>
    private void SetElectricalUIDefaults()
    {
        if (voltageValue != null) voltageValue.text = "--";
        if (currentValue != null) currentValue.text = "--";
        if (powerValue != null) powerValue.text = "--";
        if (powerFactorValue != null) powerFactorValue.text = "--";
        if (stageValue != null) stageValue.text = "--";
        if (timeValue != null) timeValue.text = "--";
        if (electricalTimestampValue != null) electricalTimestampValue.text = "N/A";
    }
    
    #endregion
    
    #region Color Helpers
    
    /// <summary>
    /// Get color based on health score
    /// </summary>
    private Color GetHealthColor(float healthScore)
    {
        if (healthScore >= 80f)
            return normalHealthColor;
        else if (healthScore >= 50f)
            return warningHealthColor;
        else
            return abnormalHealthColor;
    }
    
    /// <summary>
    /// Get color based on machine status
    /// </summary>
    private Color GetStatusColor(string status)
    {
        switch (status)
        {
            case "NORMAL":
                return normalHealthColor;
            case "WARNING":
                return warningHealthColor;
            case "ABNORMAL":
                return abnormalHealthColor;
            default:
                return Color.white;
        }
    }
    
    /// <summary>
    /// Get color based on maintenance priority
    /// </summary>
    private Color GetPriorityColor(string priority)
    {
        switch (priority)
        {
            case "LOW":
                return normalHealthColor;
            case "MEDIUM":
                return warningHealthColor;
            case "HIGH":
                return abnormalHealthColor;
            default:
                return Color.white;
        }
    }
    
    #endregion
    
    #region Public Methods
    
    /// <summary>
    /// Force immediate dashboard update
    /// </summary>
    public void ForceUpdate()
    {
        UpdateDashboard();
    }
    
    /// <summary>
    /// Refresh data reader references (useful if readers are created dynamically)
    /// </summary>
    public void RefreshReaders()
    {
        if (sensorReader == null)
            sensorReader = FindFirstObjectByType<SensorDataReader>();
        
        if (electricalReader == null)
            electricalReader = FindFirstObjectByType<ElectricalDataReader>();
    }
    
    #endregion
}
