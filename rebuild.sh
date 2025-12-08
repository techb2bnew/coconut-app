#!/bin/bash
# Clean and rebuild script for React Native with Supabase

echo "Cleaning Metro bundler cache..."
rm -rf node_modules/.cache

echo "Cleaning Android build..."
cd android
./gradlew clean
cd ..

echo "Starting Metro bundler with reset cache..."
npx react-native start --reset-cache

