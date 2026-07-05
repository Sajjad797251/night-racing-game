@echo off
setlocal

set DIRNAME=%~dp0
if "%DIRNAME%"=="" set DIRNAME=.
cd /d "%DIRNAME%"

set APP_BASE_NAME=%~n0
set APP_HOME=%DIRNAME%

if exist "%APP_HOME%\gradle\wrapper\gradle-wrapper.jar" (
    set CLASSPATH=%APP_HOME%\gradle\wrapper\gradle-wrapper.jar
) else (
    echo Gradle wrapper JAR not found. Please install Gradle or run the Android Studio Gradle sync once.
    exit /b 1
)

set JAVA_EXE=%JAVA_HOME%\bin\java.exe
if not exist "%JAVA_EXE%" set JAVA_EXE=java.exe

"%JAVA_EXE%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
