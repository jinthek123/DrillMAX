# RhythmForm

V-ARCHIVE `[미갱신]` 플레이까지 로컬에 기록하는 Windows 앱입니다.  
for DJMAX RESPECT V

> Unofficial fan-made tool. DJMAX RESPECT V and related trademarks are the property of NEOWIZ.  
> 비공식 팬메이드 도구입니다. 본 사이트에 사용된 게임 콘텐츠의 저작권은 (주)네오위즈에 있습니다.

Electron 버전은 [`rhythmForm-electroVer`](https://github.com/jinthek123/rhythmForm-electroVer)에 있습니다.

## 요구 사항

- Node.js 20+
- [Rust](https://rustup.rs/) (stable) + MSVC Build Tools
- WebView2 (Windows 10/11 기본 포함인 경우가 많음)

## 개발

```bash
npm install
npm run dev:app
```

## 빌드

```bash
npm run pack
```

- 설치본: `src-tauri/target/release/bundle/nsis/`
- exe: `src-tauri/target/release/rhythmform.exe`

앱 실행 후 V-ARCHIVE **Open API 조회 토큰**을 넣으면 archive PB를 불러옵니다.
