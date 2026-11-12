# DrillMAX

**한 곡을 깎을 때, 지금의 폼을 한눈에 보기 위한 로컬 기록 도구**  
for DJMAX RESPECT V

이전 이름은 RhythmForm입니다. 버전별 변경은 [CHANGELOG](./CHANGELOG.md)에 있습니다.

V-ARCHIVE 클라이언트에 표시되는 **로그 텍스트**를 읽어, 공식 갱신에서 버려지는 `[미갱신]` 플레이까지 포함해 로컬에 남깁니다.  
정확도 추이를 그래프로 확인하며 0.01%를 깎는 과정과 결과를 시각적으로 파악할 수 있습니다.

> **Unofficial fan-made tool.** DJMAX RESPECT V 및 관련 상표·저작물의 권리는 (주)네오위즈에 있습니다.  
> 본 프로그램은 네오위즈와 무관한 비공식 팬메이드 도구입니다.

[다운로드 (Releases)](https://github.com/jinthek123/DrillMAX/releases) · [버그·문의 (Issues)](https://github.com/jinthek123/DrillMAX/issues)

<img width="1601" height="1065" alt="전체 성과" src="https://github.com/user-attachments/assets/0ef13276-f241-4010-b69a-0ac28df072da" />
<img width="1601" height="1065" alt="단일 곡 기록" src="https://github.com/user-attachments/assets/a2ec9fdc-3a52-49fd-b6a1-36f6b596642d" />

---

## 왜 만들었나요

한 곡을 반복해서 깎다 보면 폼이 떨어지는 구간이 생기고, **최고 기록이 아닌 시도**도 쌓입니다.  
그런데 V-ARCHIVE에는 갱신되지 않은(미갱신) 점수나, 최고가 아닌 중간 성과를 한곳에 모아 보기 어렵습니다.

DrillMAX는 그 간극을 메우기 위해 만들었습니다. LIVE로 로그를 따라가며 기록을 남기고, Accuracy / Highest Record 그래프로 **지금의 폼**을 객관적으로 보게 합니다.

※ 사용 시 **V-ARCHIVE 클라이언트**를 켜 두는 것을 권장합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **LIVE** | V-ARCHIVE 클라이언트 로그를 읽어 `[미갱신]`·`[성공]` 플레이를 자동 기록 |
| **Open API** | 마이페이지 Open API 조회 토큰으로 기존 archive PB(최고 기록) 동기화 |
| **그래프** | 전체 성과의 일일 최고, 단일 곡의 Accuracy 추이와 Highest Record 기준선 |
| **곡 순서** | 전체 성과에서 손잡이로 순서를 바꾸고, 그 순서를 저장 |
| **MC / PP / BEST** | Max Combo, Perfect Play(100%), 최고 기록 뱃지 |
| **로그 붙여넣기** | 앱을 늦게 켠 경우 클라이언트 로그를 수동으로 가져와 복구 |
| **저장** | 성적을 `data/drillMax.json`에 자동 저장. 다른 폴더도 지정 가능 |

- 100%는 자동으로 **PP(Perfect Play)** 로 표시됩니다.
- 캡쳐 결과의 `(MaxCombo)` 텍스트를 인식하면 그래프 점이 초록색으로 표시됩니다.

---

## 사용 방법

### 1. Open API 토큰 등록

기존 성과(archive PB)를 불러오기 위해 V-ARCHIVE **마이페이지**에서 **Open API 조회 토큰**을 발급·복사한 뒤, 앱 첫 실행(또는 API 키 설정) 화면에 붙여넣습니다.

### 2. LIVE 연결

V-ARCHIVE 클라이언트가 연결되면 왼쪽 위에 **LIVE ON**이 표시됩니다.  
클라이언트가 보이지 않거나 브리지가 없으면 **LIVE OFF**입니다.  
연결되면 캡쳐·업로드 직후 로그에 남는 플레이가 자동으로 기록됩니다.

### 3. 차트 추가 (선택)

**차트 추가**에서 기록할 곡을 검색·추가할 수 있습니다(자동완성 지원).  
LIVE가 켜져 있으면 새 곡이 로그에 잡힐 때 차트가 자동으로 생기므로, 평소에는 생략해도 됩니다.

### 4. 기록 확인

선택한 차트에서 그래프와 기록 목록을 확인합니다.

- **LIVE** — 클라이언트를 통해 들어온 기록  
- **수동** — 플레이 추가로 직접 등록한 기록  
- **MC / PP / BEST** — Max Combo, Perfect Play, 최고 기록

### 5. 로그 가져오기

DrillMAX를 켜지 못한 채 플레이했다면, **로그 가져오기**에 V-ARCHIVE 클라이언트 로그를 붙여넣어 보완할 수 있습니다.

### 6. 백업

성적은 `data/drillMax.json`에 자동으로 저장됩니다. 다른 위치가 필요하면 **데이터 폴더**에서 폴더를 지정합니다.

---

## 다운로드

| 구분 | 링크 |
|------|------|
| 설치본 | [Releases · v1.1.1](https://github.com/jinthek123/DrillMAX/releases/tag/v1.1.1) |
| 요구 환경 | Windows 10/11, [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/) (대부분 기본 포함) |

설치본은 `DrillMAX_1.1.1_x64-setup.exe`입니다. 변경 내용은 [CHANGELOG](./CHANGELOG.md)에 있습니다.

---

## 버그·문의

문제 재현 방법, 화면 캡처, DrillMAX / V-ARCHIVE 버전을 남겨 주시면 확인에 도움이 됩니다.

→ [GitHub Issues](https://github.com/jinthek123/DrillMAX/issues)

---

## 기록 파일 `drillMax.json`

앱이 성적을 저장하는 파일입니다. V-ARCHIVE 곡 목록과 같은 칸 배치에, 이 앱의 플레이를 붙여 둡니다. 저장소에 포함되면 받는 사람이 그대로 열어 볼 수 있는 개인 기록입니다. 닉네임, 곡별 점수, 지운 판의 지문이 들어 있으니 공개 전에 내용을 한 번 확인하는 편이 좋습니다.

기본 위치는 이 저장소의 `data/drillMax.json`입니다. 앱에서 다른 데이터 폴더를 지정하면 그 폴더를 사용합니다. 이 파일은 `.gitignore`로 저장소에서 빠져 있습니다.

맨 위는 파일 정보입니다.

| 필드 | 의미 |
|------|------|
| `version` | 저장 형식 번호. 현재는 `1` |
| `updatedAt` | 마지막으로 저장한 시각. UTC |
| `nickname` | V-ARCHIVE 닉네임. 최고기록 조회에 사용 |
| `suppressedKeys` | 앱에서 지운 판의 지문. `버튼\|난이도\|곡 이름\|점수\|시:분:초`. 라이브 로그가 같은 판을 다시 넣지 않게 하는 표시이며, 성적 목록은 아님 |
| `songs` | 곡 배열 |

`songs` 한 요소가 곡 하나입니다.

| 필드 | 의미 |
|------|------|
| `title` | V-ARCHIVE 곡 번호. 모르면 `null` |
| `name` | 곡 이름 |
| `composer` | 작곡가 |
| `dlcCode` | DLC 코드 |
| `patterns` | 버튼(`4B` `5B` `6B` `8B`) 안에 난이도(`NM` `HD` `MX` `SC`) |

채보 하나(`patterns`의 난이도 객체)는 이렇게 읽습니다.

| 필드 | 의미 |
|------|------|
| `level`, `floor`, `floorName` | 채보 레벨과 플로어. 예: `13`, `13.3` |
| `score` | 이 파일에 남아 있는 플레이 중 가장 높은 정확도 |
| `archiveBest` | V-ARCHIVE 최고기록. 화면의 HR |
| `maxCombo` | 그 채보의 대표 기록이 맥스 콤보면 `true` |
| `plays` | 한 판씩의 기록. 곡마다 최근 15판 |
| `dailyBests` | 날짜별 최고 하나. 전체 성과의 최근 30일 그래프 |
| `order` | 직접 정렬한 순서. 작을수록 위. 없으면 이름 순 |

`plays`의 한 줄은 `at`(시각), `score`(정확도), `status`(`미갱신` 또는 `성공`), `source`(`live`, `log`, `manual`)를 가집니다. 맥스 콤보면 `maxCombo`가 붙습니다. `0.00%`는 저장하지 않습니다.

모양만 줄인 예입니다. 실제 기록은 아닙니다.

```json
{
  "version": 1,
  "updatedAt": "2026-11-12T10:41:00.000Z",
  "nickname": "player",
  "suppressedKeys": ["4B|SC|Example|99.5|12:00:00"],
  "songs": [
    {
      "title": 1,
      "name": "Example",
      "composer": "Composer",
      "dlcCode": "T1",
      "patterns": {
        "4B": {
          "SC": {
            "order": 0,
            "level": 10,
            "floor": 105,
            "floorName": "10.5",
            "score": 99.1,
            "archiveBest": 99.5,
            "plays": [
              {
                "at": "2026-11-12T03:00:00.000Z",
                "score": 99.1,
                "status": "미갱신",
                "source": "live"
              }
            ],
            "dailyBests": [
              { "date": "2026-11-12", "score": 99.1, "status": "미갱신", "source": "live" }
            ]
          }
        }
      }
    }
  ]
}
```

이 파일은 V-ARCHIVE에 넣어 기록을 복원하는 형식이 아닙니다. 곡 이름, 버튼, 난이도, 정확도는 같은 뜻으로 쓰이고, 플레이 시각과 일일 최고는 DrillMAX만 저장합니다.

---

## 개발자용

```bash
npm install
npm run dev:app    # 화면과 브리지. V-ARCHIVE 통신은 이 명령
npm run dev        # 화면만. 브리지가 없어 LIVE는 연결되지 않음
npm run pack       # 설치본 빌드
```

요구 사항: Node.js 20+, [Rust](https://rustup.rs/) (stable), MSVC Build Tools, WebView2

산출물 예: `src-tauri/target/release/bundle/nsis/`

배포본은 [Releases](https://github.com/jinthek123/DrillMAX/releases)에 있습니다. 그 사이 변경은 [CHANGELOG](./CHANGELOG.md)와 git 기록에 있습니다.

---

## 라이선스

본 저장소 코드는 [GNU GPL v3](./LICENSE)를 따릅니다.  
DJMAX RESPECT V / V-ARCHIVE 관련 명칭·에셋의 권리는 각 권리자에게 있습니다.
