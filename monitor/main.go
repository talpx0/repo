package main

import (
    // Importing necessary packages
    "crypto/md5"        // for generating MD5 checksums
    "encoding/hex"      // for encoding MD5 checksums to hexadecimal strings
    "encoding/json"     // for JSON parsing
    "fmt"               // for formatted I/O operations
    "os"                // for file and OS-related utilities
    "path/filepath"     // for manipulating file paths
    "sync"              // for synchronization primitives like mutexes
    "time"              // for time-related utilities

    "github.com/fsnotify/fsnotify" // for file system notifications
)

func main() {
    fmt.Println("Program is starting")

    // Reading and parsing the configuration file
    configFile, err := os.ReadFile("config.json") // Read the configuration file
    if err != nil {
        panic(fmt.Sprintf("Failed to read config file: %v", err)) // Handle errors in reading file
    }

    // Define a struct to hold the configuration values
    var config struct {
        YamlFilePath      string `json:"yamlFilePath"`      // Path to the YAML file
        BaseBackupDirPath string `json:"baseBackupDirPath"` // Base directory for backups
    }

    // Parse the JSON configuration file into the struct
    if err := json.Unmarshal(configFile, &config); err != nil {
        panic(fmt.Sprintf("Failed to parse config file: %v", err)) // Handle JSON parsing errors
    }

    // Extract configuration values
    yamlFile := config.YamlFilePath      // Path to the YAML file from config
    baseBackupDir := config.BaseBackupDirPath // Backup directory path from config
    debounceDuration := 3 * time.Minute // Duration to debounce file changes
    inactivityDuration := 10 * time.Minute // Duration for inactivity timeout

    /* Inactivity Timer Setup */

    var inactivityTimer *time.Timer // Declare a timer for inactivity
    resetInactivityTimer := func() {
        if inactivityTimer != nil {
            inactivityTimer.Stop() // Stop the existing timer if it exists
        }
        inactivityTimer = time.AfterFunc(inactivityDuration, func() {
            fmt.Println("Exiting due to inactivity.")
            os.Exit(0) // Exit the program after inactivity duration
        })
    }

    resetInactivityTimer() // Reset the inactivity timer at the start

    /* File Watcher Setup */

    watcher, err := fsnotify.NewWatcher() // Create a new file watcher
    if err != nil {
        panic(fmt.Sprintf("Failed to create file watcher: %v", err)) // Handle errors in watcher creation
    }
    defer watcher.Close() // Ensure the watcher is closed when the function exits

    var lastChecksum string     // Store the last known file checksum
    var mu sync.Mutex           // Mutex for synchronizing access to shared resources
    var debounceTimer *time.Timer // Timer for debouncing file change events

    /* Backup File Function */

    backupFile := func() {
        // Function to perform file backup
        fmt.Println("Running backupFile function")
        mu.Lock() // Lock the mutex to synchronize access
        defer mu.Unlock() // Unlock the mutex when the function exits

        data, err := os.ReadFile(yamlFile) // Read the file content
        if err != nil {
            fmt.Printf("Error reading file: %v\n", err) // Handle file reading errors
            return
        }

        checksum := md5.Sum(data) // Calculate the MD5 checksum of the file data
        currentChecksum := hex.EncodeToString(checksum[:]) // Convert checksum to a hex string
        if currentChecksum != lastChecksum {
            lastChecksum = currentChecksum // Update the last checksum

            currentYear := time.Now().Format("2006") // Get the current year
            backupDir := filepath.Join(baseBackupDir, currentYear) + "/" // Create a backup directory path

            err := os.MkdirAll(backupDir, os.ModePerm) // Create the backup directory
            if err != nil {
                fmt.Printf("Error creating backup directory: %v\n", err) // Handle directory creation errors
                return
            }

            backupFilePath := backupDir + time.Now().Format("20060102_150405") + ".yml" // Generate backup file path
            if err := os.WriteFile(backupFilePath, data, 0644); err != nil {
                fmt.Printf("Error writing backup file: %v\n", err) // Handle file writing errors
                return
            }
            fmt.Println("Backup created:", backupFilePath) // Log the backup creation
        }
    }

    /* File Watcher Event Handling */

    go func() {
        // Start a goroutine for handling file watcher events
        for {
            select {
            case event, ok := <-watcher.Events:
                // Handle file events
                if !ok {
                    return // Exit if the channel is closed
                }
                if event.Op&fsnotify.Write == fsnotify.Write {
                    // Check if the event is a file write
                    fmt.Println("File modification detected")
                    mu.Lock() // Lock the mutex
                    if debounceTimer != nil {
                        debounceTimer.Stop() // Stop the existing debounce timer
                    }
                    debounceTimer = time.AfterFunc(debounceDuration, func() {
                        backupFile() // Call the backup function after the debounce duration
                        resetInactivityTimer() // Reset inactivity timer on file modification
                    })
                    mu.Unlock() // Unlock the mutex
                }
            case err, ok := <-watcher.Errors:
                // Handle watcher errors
                if !ok {
                    return // Exit if the error channel is closed
                }
                fmt.Printf("Watcher error: %v\n", err) // Log watcher errors
            }
        }
    }()

    // Start watching the specified file for changes
    if err := watcher.Add(yamlFile); err != nil {
        panic(fmt.Sprintf("Failed to add file to watcher: %v", err)) // Handle errors in adding file to watcher
    }

    // Keep the main function alive indefinitely
    select {}
}
