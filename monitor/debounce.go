package main

import (
    "crypto/md5"
    "encoding/hex"
    "fmt"
    "os"
    "path/filepath"
    "time"
    "github.com/fsnotify/fsnotify"
)

func debounce() {
    yamlFile := "../yml/test.yml"
    baseBackupDir := "../log/route"
    debounceDuration := 60 * time.Second

    watcher, err := fsnotify.NewWatcher()
    if err != nil {
        panic(err)
    }
    defer watcher.Close()

    done := make(chan bool)
    var lastReadTime time.Time
    var lastChecksum string

    go func() {
        for {
            select {
            case event, ok := <-watcher.Events:
                if !ok {
                    return
                }
                if time.Since(lastReadTime) > debounceDuration && event.Op&fsnotify.Write == fsnotify.Write {
                    data, err := os.ReadFile(yamlFile)
                    if err != nil {
                        fmt.Println("Error reading file:", err)
                        continue
                    }

                    checksum := md5.Sum(data)
                    currentChecksum := hex.EncodeToString(checksum[:])
                    if currentChecksum != lastChecksum {
                        lastChecksum = currentChecksum
                        lastReadTime = time.Now()

                        // Update the backup directory to include the current year
                        currentYear := time.Now().Format("2006")
                        backupDir := filepath.Join(baseBackupDir, currentYear) + "/"

                        // Create the backup directory if it doesn't exist
                        os.MkdirAll(backupDir, os.ModePerm)

                        backupFile := backupDir + time.Now().Format("20060102_150405") + ".yml"
                        os.WriteFile(backupFile, data, 0644)
                        fmt.Println("Backup created:", backupFile)
                    }
                }
            case err, ok := <-watcher.Errors:
                if !ok {
                    return
                }
                fmt.Println("Error:", err)
            }
        }
    }()

    err = watcher.Add(yamlFile)
    if err != nil {
        panic(err)
    }
    <-done
}