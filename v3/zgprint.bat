@echo off
rem 제로가드닝 동봉카드 - 사무실 인쇄용 크롬 (더블클릭만 하면 된다)
rem 인쇄창 없이 바로 뽑히게 --kiosk-printing 을 켜고,
rem 평소 쓰시는 크롬이 켜져 있어도 되게 전용 프로필로 띄운다.

set "C=C:\Program Files\Google\Chrome\Application\chrome.exe"
if not exist "%C%" set "C=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"
if not exist "%C%" set "C=%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"
if not exist "%C%" (
  echo.
  echo  Chrome 을 찾지 못했습니다.
  echo  Node 에게 이 화면을 알려 주세요.
  echo.
  pause
  exit /b
)

start "" "%C%" --kiosk-printing --user-data-dir=C:\zgprint "https://zerogardening.github.io/zerogardening/v3/%%EC%%A3%%BC%%EB%%AC%%B8.html"
