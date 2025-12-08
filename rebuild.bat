@echo off
REM Clean and rebuild script for React Native with Supabase (Windows)

echo Cleaning Metro bundler cache...
if exist node_modules\.cache rmdir /s /q node_modules\.cache

echo Cleaning Android build...
cd android
call gradlew.bat clean
cd ..

echo Starting Metro bundler with reset cache...
npx react-native start --reset-cache

