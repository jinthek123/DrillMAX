# RhythmForm → DrillMAX 로 이름을 변경합니다. (1.1.0 부터 적용)

**한 곡을 깎을 때, 지금의 폼을 한눈에 보기 위한 로컬 기록 도구**  
for DJMAX RESPECT V

**현재 1.0.n 단위로 자잘한 업데이트를 하고 있습니다. 정상적인 사용은 Release 에 배포된 exe 파일을 활용해주세요. 그 외 최신 개발 현황은 main에 업로드된 미완성본을 확인해주세요.**

V-ARCHIVE 클라이언트에 표시되는 **로그 텍스트**를 읽어, 공식 갱신에서 버려지는 `[미갱신]` 플레이까지 포함해 로컬에 남깁니다.  
정확도 추이를 그래프로 확인하며 0.01%를 깎는 과정과 결과를 시각적으로 파악할 수 있습니다.

> **Unofficial fan-made tool.** DJMAX RESPECT V 및 관련 상표·저작물의 권리는 (주)네오위즈에 있습니다.  
> 본 프로그램은 네오위즈와 무관한 비공식 팬메이드 도구입니다.

[다운로드 (Releases)](https://github.com/jinthek123/rhythmForm/releases) · [버그·문의 (Issues)](https://github.com/jinthek123/rhythmForm/issues)

<img width="850" height="563" alt="image" src="https://github.com/user-attachments/assets/6910c7cf-f367-4e45-8d7f-4fbda03a3222" />

---

## 왜 만들었나요

한 곡을 반복해서 깎다 보면 폼이 떨어지는 구간이 생기고, **최고 기록이 아닌 시도**도 쌓입니다.  
그런데 V-ARCHIVE에는 갱신되지 않은(미갱신) 점수나, 최고가 아닌 중간 성과를 한곳에 모아 보기 어렵습니다.

RhythmForm은 그 간극을 메우기 위해 만들었습니다. LIVE로 로그를 따라가며 기록을 남기고, Accuracy / Highest Record 그래프로 **지금의 폼**을 객관적으로 보게 합니다.

※ 사용 시 **V-ARCHIVE 클라이언트**를 켜 두는 것을 권장합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **LIVE** | V-ARCHIVE 클라이언트 로그를 읽어 `[미갱신]`·`[성공]` 플레이를 자동 기록 |
| **Open API** | 마이페이지 Open API 조회 토큰으로 기존 archive PB(최고 기록) 동기화 |
| **그래프** | Accuracy 추이 + Highest Record 기준선 |
| **MC / PP / BEST** | Max Combo, Perfect Play(100%), 최고 기록 뱃지 |
| **로그 붙여넣기** | 앱을 늦게 켠 경우 클라이언트 로그를 수동으로 가져와 복구 |
| **백업** | JSON 백업(폴더 지정)으로 장기 추이 보관 |

- 100%는 자동으로 **PP(Perfect Play)** 로 표시됩니다.
- 캡쳐 결과의 `(MaxCombo)` 텍스트를 인식하면 그래프 점이 초록색으로 표시됩니다.

---

## 사용 방법

### 1. Open API 토큰 등록

기존 성과(archive PB)를 불러오기 위해 V-ARCHIVE **마이페이지**에서 **Open API 조회 토큰**을 발급·복사한 뒤, 앱 첫 실행(또는 API 키 설정) 화면에 붙여넣습니다.

### 2. LIVE 연결

V-ARCHIVE 클라이언트를 실행하면 RhythmForm 좌측 상단에 **LIVE ON**이 표시됩니다.  
연결이 정상이면 캡쳐·업로드 직후 로그에 남는 플레이가 자동으로 기록됩니다.

### 3. 차트 추가 (선택)

**차트 추가**에서 기록할 곡을 검색·추가할 수 있습니다(자동완성 지원).  
LIVE가 켜져 있으면 새 곡이 로그에 잡힐 때 차트가 자동으로 생기므로, 평소에는 생략해도 됩니다.

### 4. 기록 확인

선택한 차트에서 그래프와 기록 목록을 확인합니다.

- **LIVE** — 클라이언트를 통해 들어온 기록  
- **수동** — 플레이 추가로 직접 등록한 기록  
- **MC / PP / BEST** — Max Combo, Perfect Play, 최고 기록

### 5. 로그 가져오기

RhythmForm을 켜지 못한 채 플레이했다면, **로그 가져오기**에 V-ARCHIVE 클라이언트 로그를 붙여넣어 보완할 수 있습니다.

### 6. 백업

**백업**을 누르면 확인 창이 열립니다. 백업 폴더를 지정한 뒤 JSON으로 저장합니다.  
같은 곡을 며칠에 걸쳐 깎을 때 추이를 남기는 용도로 쓰면 됩니다. **복원**으로 JSON을 다시 불러올 수 있습니다.

---

## 다운로드

| 구분 | 링크 |
|------|------|
| 설치본 | [Releases · v1.0.0](https://github.com/jinthek123/rhythmForm/releases/tag/v1.0.0) |
| 요구 환경 | Windows 10/11, [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (대부분 기본 포함) |

설치본: `RhythmForm_1.0.0_x64-setup.exe`

---

## 버그·문의

문제 재현 방법, 화면 캡처, RhythmForm / V-ARCHIVE 버전을 남겨 주시면 확인에 도움이 됩니다.

→ [GitHub Issues](https://github.com/jinthek123/rhythmForm/issues)

---

## 개발자용

```bash
npm install
npm run dev:app    # Vite + Tauri
npm run pack       # 설치본 빌드
```

요구 사항: Node.js 20+, [Rust](https://rustup.rs/) (stable), MSVC Build Tools, WebView2

산출물 예: `src-tauri/target/release/bundle/nsis/`

변경사항이 생기는 즉시 github에 갱신하고 있습니다. 최종 배포본은 release, 그 외 실험용 등의 목적으로 사용할 경우 git을 통해 코드 전체를 다운받으시면 됩니다.

---

## 라이선스

본 저장소 코드는 [GNU GPL v3](./LICENSE)를 따릅니다.  
DJMAX RESPECT V / V-ARCHIVE 관련 명칭·에셋의 권리는 각 권리자에게 있습니다.
