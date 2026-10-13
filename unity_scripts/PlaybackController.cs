using UnityEngine;
using UnityEngine.UI;
using TMPro;

/// <summary>
/// Controls playback of sensor and electrical data readers.
/// Provides Play, Pause, Reset, and speed control functionality.
/// Connects UI buttons and sliders to data readers.
/// </summary>
public class PlaybackController : MonoBehaviour
{
    [Header("Data Readers")]
    [Tooltip("Reference to SensorDataReader component")]
    public SensorDataReader sensorReader;
    
    [Tooltip("Reference to ElectricalDataReader component")]
    public ElectricalDataReader electricalReader;
    
    [Header("Playback Buttons")]
    public Button playButton;
    public Button pauseButton;
    public Button resetButton;
    
    [Header("Speed Control")]
    [Tooltip("Slider for playback speed (0.1x to 5.0x)")]
    public Slider speedSlider;
    
    [Tooltip("Text to display current speed multiplier")]
    public TextMeshProUGUI speedText;
    
    [Header("Progress Display")]
    [Tooltip("Slider showing playback progress")]
    public Slider progressSlider;
    
    [Tooltip("Text to display progress percentage")]
    public TextMeshProUGUI progressText;
    
    [Header("Loop Toggle")]
    [Tooltip("Toggle to enable/disable looping")]
    public Toggle loopToggle;
    
    [Header("Settings")]
    [Tooltip("Minimum speed multiplier")]
    public float minSpeed = 0.1f;
    
    [Tooltip("Maximum speed multiplier")]
    public float maxSpeed = 5.0f;
    
    [Tooltip("Default speed multiplier")]
    public float defaultSpeed = 1.0f;
    
    [Tooltip("Auto-start on scene load")]
    public bool autoStart = false;
    
    // Internal state
    private bool isInitialized = false;
    
    #region Unity Lifecycle
    
    void Start()
    {
        Initialize();
        
        if (autoStart)
        {
            Play();
        }
    }
    
    void Update()
    {
        if (!isInitialized)
            return;
        
        UpdateProgressDisplay();
    }
    
    void OnDestroy()
    {
        Cleanup();
    }
    
    #endregion
    
    #region Initialization
    
    /// <summary>
    /// Initialize all UI components and wire up events
    /// </summary>
    private void Initialize()
    {
        // Find readers if not assigned
        if (sensorReader == null)
            sensorReader = FindFirstObjectByType<SensorDataReader>();
        
        if (electricalReader == null)
            electricalReader = FindFirstObjectByType<ElectricalDataReader>();
        
        // Wire up buttons
        if (playButton != null)
        {
            playButton.onClick.AddListener(OnPlayClicked);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Play button not assigned");
        }
        
        if (pauseButton != null)
        {
            pauseButton.onClick.AddListener(OnPauseClicked);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Pause button not assigned");
        }
        
        if (resetButton != null)
        {
            resetButton.onClick.AddListener(OnResetClicked);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Reset button not assigned");
        }
        
        // Wire up speed slider
        if (speedSlider != null)
        {
            speedSlider.minValue = minSpeed;
            speedSlider.maxValue = maxSpeed;
            speedSlider.value = defaultSpeed;
            speedSlider.onValueChanged.AddListener(OnSpeedChanged);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Speed slider not assigned");
        }
        
        // Wire up progress slider
        if (progressSlider != null)
        {
            progressSlider.minValue = 0f;
            progressSlider.maxValue = 1f;
            progressSlider.value = 0f;
            progressSlider.onValueChanged.AddListener(OnProgressChanged);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Progress slider not assigned");
        }
        
        // Wire up loop toggle
        if (loopToggle != null)
        {
            loopToggle.onValueChanged.AddListener(OnLoopToggled);
        }
        else
        {
            Debug.LogWarning("[PlaybackController] Loop toggle not assigned");
        }
        
        // Initialize speed display
        UpdateSpeedDisplay(defaultSpeed);
        
        // Initialize loop state
        if (loopToggle != null && sensorReader != null)
        {
            loopToggle.isOn = sensorReader.loopPlayback;
        }
        
        isInitialized = true;
        
        Debug.Log("[PlaybackController] Initialized successfully");
    }
    
    /// <summary>
    /// Clean up event listeners
    /// </summary>
    private void Cleanup()
    {
        if (playButton != null)
            playButton.onClick.RemoveListener(OnPlayClicked);
        
        if (pauseButton != null)
            pauseButton.onClick.RemoveListener(OnPauseClicked);
        
        if (resetButton != null)
            resetButton.onClick.RemoveListener(OnResetClicked);
        
        if (speedSlider != null)
            speedSlider.onValueChanged.RemoveListener(OnSpeedChanged);
        
        if (progressSlider != null)
            progressSlider.onValueChanged.RemoveListener(OnProgressChanged);
        
        if (loopToggle != null)
            loopToggle.onValueChanged.RemoveListener(OnLoopToggled);
    }
    
    #endregion
    
    #region Playback Control
    
    /// <summary>
    /// Start playback of both readers
    /// </summary>
    public void Play()
    {
        if (sensorReader != null)
            sensorReader.Play();
        
        if (electricalReader != null)
            electricalReader.Play();
        
        UpdateButtonStates();
        
        if (isInitialized)
            Debug.Log("[PlaybackController] Playback started");
    }
    
    /// <summary>
    /// Pause playback of both readers
    /// </summary>
    public void Pause()
    {
        if (sensorReader != null)
            sensorReader.Pause();
        
        if (electricalReader != null)
            electricalReader.Pause();
        
        UpdateButtonStates();
        
        if (isInitialized)
            Debug.Log("[PlaybackController] Playback paused");
    }
    
    /// <summary>
    /// Reset both readers to start
    /// </summary>
    public void Reset()
    {
        if (sensorReader != null)
            sensorReader.Reset();
        
        if (electricalReader != null)
            electricalReader.Reset();
        
        UpdateProgressDisplay();
        UpdateButtonStates();
        
        if (isInitialized)
            Debug.Log("[PlaybackController] Playback reset");
    }
    
    /// <summary>
    /// Toggle play/pause state
    /// </summary>
    public void TogglePlayPause()
    {
        if (sensorReader != null && sensorReader.IsPlaying)
        {
            Pause();
        }
        else
        {
            Play();
        }
    }
    
    /// <summary>
    /// Set playback speed for both readers
    /// </summary>
    public void SetSpeed(float speedMultiplier)
    {
        speedMultiplier = Mathf.Clamp(speedMultiplier, minSpeed, maxSpeed);
        
        if (sensorReader != null)
            sensorReader.SetPlaybackSpeed(speedMultiplier);
        
        if (electricalReader != null)
            electricalReader.SetPlaybackSpeed(speedMultiplier);
        
        // Update slider if assigned
        if (speedSlider != null)
        {
            speedSlider.value = speedMultiplier;
        }
        
        UpdateSpeedDisplay(speedMultiplier);
        
        if (isInitialized)
            Debug.Log($"[PlaybackController] Speed set to {speedMultiplier:F2}x");
    }
    
    /// <summary>
    /// Jump to specific progress (0.0 to 1.0)
    /// </summary>
    public void JumpToProgress(float progress)
    {
        progress = Mathf.Clamp01(progress);
        
        if (sensorReader != null && sensorReader.IsLoaded)
        {
            int targetRow = Mathf.RoundToInt(progress * sensorReader.TotalRows);
            sensorReader.JumpToRow(targetRow);
        }
        
        if (electricalReader != null && electricalReader.IsLoaded)
        {
            int targetRow = Mathf.RoundToInt(progress * electricalReader.TotalRows);
            electricalReader.JumpToRow(targetRow);
        }
        
        UpdateProgressDisplay();
    }
    
    /// <summary>
    /// Toggle loop playback
    /// </summary>
    public void SetLoop(bool enableLoop)
    {
        if (sensorReader != null)
            sensorReader.loopPlayback = enableLoop;
        
        if (electricalReader != null)
            electricalReader.loopPlayback = enableLoop;
        
        if (isInitialized)
            Debug.Log($"[PlaybackController] Loop {(enableLoop ? "enabled" : "disabled")}");
    }
    
    #endregion
    
    #region UI Event Handlers
    
    private void OnPlayClicked()
    {
        Play();
    }
    
    private void OnPauseClicked()
    {
        Pause();
    }
    
    private void OnResetClicked()
    {
        Reset();
    }
    
    private void OnSpeedChanged(float value)
    {
        SetSpeed(value);
    }
    
    private void OnProgressChanged(float value)
    {
        JumpToProgress(value);
    }
    
    private void OnLoopToggled(bool value)
    {
        SetLoop(value);
    }
    
    #endregion
    
    #region UI Updates
    
    /// <summary>
    /// Update progress slider and text display
    /// </summary>
    private void UpdateProgressDisplay()
    {
        // Use sensor reader progress as primary indicator
        float progress = 0f;
        
        if (sensorReader != null && sensorReader.IsLoaded)
        {
            progress = sensorReader.Progress;
        }
        else if (electricalReader != null && electricalReader.IsLoaded)
        {
            progress = electricalReader.Progress;
        }
        
        if (progressSlider != null)
        {
            // Only update if not being dragged (to avoid conflict)
            if (!progressSlider.isInteractable || !progressSlider.IsInteractable())
            {
                progressSlider.value = progress;
            }
        }
        
        if (progressText != null)
        {
            progressText.text = $"{progress * 100f:F0}%";
        }
    }
    
    /// <summary>
    /// Update speed text display
    /// </summary>
    private void UpdateSpeedDisplay(float speed)
    {
        if (speedText != null)
        {
            speedText.text = $"{speed:F1}x";
        }
    }
    
    /// <summary>
    /// Update button states (enable/disable based on playback state)
    /// </summary>
    private void UpdateButtonStates()
    {
        bool isPlaying = false;
        
        if (sensorReader != null)
            isPlaying = sensorReader.IsPlaying;
        else if (electricalReader != null)
            isPlaying = electricalReader.IsPlaying;
        
        if (playButton != null)
            playButton.interactable = !isPlaying;
        
        if (pauseButton != null)
            pauseButton.interactable = isPlaying;
        
        if (resetButton != null)
            resetButton.interactable = true;
    }
    
    #endregion
    
    #region Public Properties
    
    /// <summary>
    /// Get current playback state
    /// </summary>
    public bool IsPlaying
    {
        get
        {
            if (sensorReader != null)
                return sensorReader.IsPlaying;
            if (electricalReader != null)
                return electricalReader.IsPlaying;
            return false;
        }
    }
    
    /// <summary>
    /// Get current speed multiplier
    /// </summary>
    public float CurrentSpeed
    {
        get
        {
            if (speedSlider != null)
                return speedSlider.value;
            return defaultSpeed;
        }
    }
    
    /// <summary>
    /// Get current progress (0.0 to 1.0)
    /// </summary>
    public float CurrentProgress
    {
        get
        {
            if (sensorReader != null && sensorReader.IsLoaded)
                return sensorReader.Progress;
            if (electricalReader != null && electricalReader.IsLoaded)
                return electricalReader.Progress;
            return 0f;
        }
    }
    
    #endregion
}
