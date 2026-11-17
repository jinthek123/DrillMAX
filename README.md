# 🎯 DrillMAX

<p align="center">
  <strong>한 곡을 깎는 과정, 그 순간의 폼을 기록하다.</strong>
  <br />
  <sub>A local performance tracking tool for DJMAX RESPECT V.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows-0078D6?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/Version-1.2.0-5865F2?style=flat-square" alt="Version" />
  <img src="https://img.shields.io/badge/License-GPL--3.0-blue?style=flat-square" alt="GPL-3.0" />
  <img src="https://img.shields.io/badge/Game-DJMAX%20RESPECT%20V-orange?style=flat-square" alt="DJMAX RESPECT V" />
</p>

<p align="center">
  <a href="https://github.com/jinthek123/DrillMAX/releases">📥 Download</a>
  ·
  <a href="https://github.com/jinthek123/DrillMAX/issues">🐛 Report an Issue</a>
  ·
  <a href="./CHANGELOG.md">📋 Changelog</a>
</p>

---

## Overview

**DrillMAX**는 DJMAX RESPECT V 플레이 기록을 로컬에 수집하고 분석하는 개인용 기록 도구입니다.

V-ARCHIVE 클라이언트에 표시되는 로그를 읽어 공식 최고기록 갱신 여부와 관계없이 모든 플레이를 저장합니다.

최고기록만으로는 알기 어려운 현재의 컨디션, 정확도 변화, 반복 플레이의 성과를 그래프로 확인할 수 있습니다.

> **최고 기록이 아닌, 그 기록에 도달하는 과정까지.**

### Screenshots

<p align="center">
  <img src="https://github.com/user-attachments/assets/9e0e4a5e-b198-40d5-95a6-0aaeff6610d3" width="100%" alt="DrillMAX Overview" />
  <br />
  <sub>Overview · 전체 성과</sub>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/e5eecdb8-ed24-4d9d-86fc-0e61cdad594f" width="100%" alt="DrillMAX Chart Detail" />
  <br />
  <sub>Chart Detail · 단일 곡 기록</sub>
</p>

<p align="center">
  <img src="https://github.com/user-attachments/assets/a96cce5e-2d0d-479f-9bee-a8548217eab3" width="100%" alt="DrillMAX Hang2bot Integration" />
  <br />
  <sub>Hang2bot Integration · 추천곡 및 쉬는곡</sub>
</p>

---

## ✨ Key Features

| Feature | Description |
|:--|:--|
| **LIVE Tracking** | V-ARCHIVE 로그를 실시간으로 수신하고 플레이 기록 저장 |
| **Unupdated Records** | 공식 최고기록이 갱신되지 않은 `[미갱신]` 플레이까지 수집 |
| **Accuracy Graph** | 정확도 변화와 일일 최고기록을 그래프로 시각화 |
| **Performance Overview** | 전체 플레이 횟수, PP, MC 및 정확도 달성 현황 확인 |
| **Chart Analysis** | 개별 채보의 HR, Current, 플레이 이력 분석 |
| **Hang2bot Integration** | 패턴 상수를 기반으로 추천곡과 쉬는곡 제공 |
| **Local Data Storage** | 개인 기록을 PC에 JSON 형식으로 저장 |
| **Log Import** | 과거 V-ARCHIVE 로그를 가져와 기록 보완 |

## 🚀 Download

<p align="center">
  <a href="https://github.com/jinthek123/DrillMAX/releases/tag/v1.2.0">
    <img src="https://img.shields.io/badge/Download-DrillMAX%201.2.0-5865F2?style=for-the-badge&logo=windows" alt="Download DrillMAX" />
  </a>
</p>

| Item | Requirement |
|:--|:--|
| OS | Windows 10 / 11 |
| Runtime | Microsoft WebView2 |
| Installer | `DrillMAX_1.2.0_x64-setup.exe` |

> WebView2는 대부분의 Windows 환경에 기본 포함되어 있습니다.

[전체 Releases 보기](https://github.com/jinthek123/DrillMAX/releases)

---

## 📖 Getting Started

처음 실행하면 V-ARCHIVE Open API 조회 토큰을 입력하는 창이 나타납니다.

- API 토큰이 없어도 LIVE 로그 수집과 기록은 가능합니다.
- API 토큰을 등록하면 기존 V-ARCHIVE 최고기록을 불러올 수 있습니다.
- 기존 최고기록은 각 채보의 HR(Highest Record)로 사용됩니다.

**권장 환경:** LIVE 로그 수집을 위해 V-ARCHIVE 클라이언트를 실행해 주세요.

### 1. Sidebar

앱 왼쪽 사이드바에서 주요 기능을 제어합니다.

| 기능 | 설명 |
|:--|:--|
| **LIVE** | V-ARCHIVE 로그 수신 활성화 / 비활성화 |
| **기록 시작** | 플레이 기록 수집 시작 / 중지 |
| **라이트** | 다크 / 라이트 테마 전환 |
| **차트 추가** | 추적할 곡과 채보 등록 |
| **API 키 설정** | V-ARCHIVE Open API 토큰 등록 |
| **Update 확인** | 공개 저장소의 최신 설치본 확인 |

#### LIVE Tracking

LIVE 버튼을 누르면 V-ARCHIVE 로그 수신을 시작하거나 중지합니다.

`LIVE ON`은 로그 수신이 활성화되어 있고 브리지와 V-ARCHIVE 클라이언트가 모두 연결된 상태를 의미합니다.

상태 표시:
- 꺼짐
- 브리지 대기
- 클라이언트 미감지
- 수신중

ON 상태에서는 캡처 및 업로드 직후 로그에 기록되는 `[미갱신]`, `[성공]` 플레이를 수집합니다.

#### Recording

노란색 세모 버튼으로 기록 수집을 시작합니다.

- 수집 중에는 세모 대신 깜빡이는 점이 표시됩니다.
- 다시 누르면 수집이 중지됩니다.
- 기록이 중지된 동안의 플레이는 나중에 자동으로 복구되지 않습니다.
- 앱을 재실행하면 기록 상태는 OFF로 초기화됩니다.

#### Theme

라이트 버튼을 눌러 밝은 테마로 전환할 수 있습니다.

선택한 테마는 다음 실행에도 유지됩니다. 별도 설정이 없다면 다크 테마로 시작합니다.

#### Add Chart

곡 이름, 버튼, 패턴을 선택하여 추적할 채보를 등록합니다.

곡 이름은 검색할 수 있으며, LIVE가 활성화되어 있다면 로그에서 새로운 곡을 감지할 때 자동으로 차트가 추가됩니다.

#### API Key

V-ARCHIVE 마이페이지에서 발급받은 Open API 조회 토큰을 등록합니다.

토큰을 저장하면 해당 계정의 기존 최고기록을 가져와 각 채보의 HR로 설정합니다.

> API 토큰은 해당 PC에 로컬로 저장됩니다.

#### Update

공개 GitHub 저장소에서 최신 배포 버전을 확인합니다.

새 버전이 존재하면 설치 파일을 다운로드할 수 있습니다. 별도로 배포한 실험용 빌드는 확인 대상에 포함되지 않습니다.

---

### 2. Performance Overview

등록한 모든 채보의 플레이 성과를 한 화면에서 확인합니다.

#### Performance Statistics

상단 KPI는 왼쪽부터 다음 항목을 나타냅니다.

| KPI | Description |
|:--|:--|
| Charts | 등록된 채보 수 |
| Plays | 전체 플레이 수 |
| PP | 정확도 100% 플레이 수 |
| MC | Max Combo이면서 정확도 100%가 아닌 플레이 수 |
| 99.9%+ | 정확도 99.9% 이상 |
| 99.8%+ | 정확도 99.8% 이상 |

※ 99.9% 이상 기록은 99.8% 이상 집계에도 포함됩니다.

#### Daily Accuracy Graph

각 채보 카드에는 최근 30일간의 일일 최고기록이 그래프로 표시됩니다.

기록이 없는 날짜에도 그래프가 끊기지 않도록 표시합니다.

#### Filters & Sorting

**버튼 필터**
- 전체
- 4B / 5B / 6B / 8B

**곡 제목 검색**

입력한 문자열이 포함된 곡만 표시합니다.

**정렬 기준**
- 내 순서
- 최근 플레이
- 가장 오래된 플레이
- 플레이 많은 순
- 미갱신 많은 순
- 이름순

카드 왼쪽 손잡이를 드래그하면 직접 순서를 변경할 수 있습니다. 변경된 순서는 저장되며 사이드바의 곡 목록에도 반영됩니다.

#### Import Log

V-ARCHIVE 로그 텍스트를 붙여 넣어 과거 플레이를 가져올 수 있습니다.

앱을 실행하지 못한 상태에서 플레이한 기록을 보완할 때 유용합니다.

`[미갱신]`, `[성공]` 로그를 모두 저장합니다.

#### Data Folder

성적 데이터가 저장되는 `drillMax.json`의 위치를 변경합니다.

별도로 지정하지 않으면 저장소의 `data/drillMax.json`을 기본 경로로 사용합니다.

---

### 3. Single Chart Analysis

개별 채보를 선택해 플레이 이력과 정확도 변화를 자세히 분석합니다.

#### Record Indicators

| Indicator | Description |
|:--|:--|
| **HR** | `[미갱신]`을 제외한 최고 정확도. V-ARCHIVE 최고기록이 더 높으면 해당 값을 사용 |
| **Current** | 가장 최근 플레이의 정확도 |
| **BEST** | 현재 HR과 동일한 정확도를 가진 기록 |
| **PP** | 정확도 100% |
| **MC** | Max Combo |

#### Graph & Play History

- 노란색 수평선은 HR을 나타냅니다.
- 노란색 별은 해당 플레이가 당시 최고기록이었던 순간을 표시합니다.
- 이후 더 높은 기록이 생겨도 과거 최고기록을 세운 순간의 별은 유지됩니다.
- 별은 LIVE 또는 로그로 수집된 플레이에만 표시됩니다.

**기록 보존 정책**
- 개별 채보의 플레이 기록: 최근 15판
- 일일 최고기록: 최근 30일

---

### 4. 행이봇 × DrillMAX

[행이봇 (Hang2bot)](https://hang2bot.vercel.app/)의 패턴 상수 데이터를 활용해 현재 선택한 채보를 기준으로 추천곡과 쉬는곡을 제공합니다.

#### Recommendation System

가운데 채보를 기준으로 좌우로 곡을 넘기며 추천 목록을 확인할 수 있습니다.

카드 또는 화면을 좌우로 밀어 곡을 변경할 수 있습니다.

상수 표기:
- `(±0)` : 기준 채보와 동일한 상수
- `(+0.2)` : 기준보다 0.2 높은 상수
- `(-0.2)` : 기준보다 0.2 낮은 상수

상수가 등록되지 않은 채보는 추천 대상에서 제외되고 별도 안내가 표시됩니다.

**추천곡 선정 기준**
- 기준 채보와 가까운 상수 층을 고려합니다.
- 상수 3 태그의 유사도를 함께 평가합니다.
- 상수 3을 하나 공유하는 경우, 약 0.2층 떨어진 곡도 같은 층의 곡보다 높은 우선순위를 가질 수 있습니다.

**쉬는곡 선정 기준**
- 기준 채보보다 낮은 상수 층에서 선정합니다.
- 연타 상수가 1 이상인 곡은 제외합니다.
- 따닥 상수가 2 이상인 곡은 제외합니다.

각 목록은 최대 5곡으로 구성됩니다. 패턴 태그는 카드 오른쪽에 표시됩니다.

#### Reroll

추천곡과 쉬는곡 목록을 각각 독립적으로 다시 추첨할 수 있습니다.

곡을 변경하면 최초 추천 목록으로 초기화됩니다.

#### Hang2bot Sync

최신 행이봇 상수를 하루 한 번 확인하고 업데이트합니다.

- 이미 최신 데이터라면 다시 다운로드하지 않습니다.
- 업데이트 실패 시 기존 데이터를 유지합니다.
- 실패한 날에는 다시 실행할 수 없습니다.
- 갱신 여부는 PC의 로컬 날짜를 기준으로 판단합니다.

---

## 💾 Local Data Structure

DrillMAX는 모든 플레이 기록을 `drillMax.json`에 저장합니다.

이 파일은 V-ARCHIVE의 곡 목록과 유사한 구조에 DrillMAX 전용 플레이 데이터를 추가한 형식입니다.

### Storage Location

기본 경로:

```text
data/drillMax.json
```

앱에서 데이터 폴더를 변경했다면 지정한 위치를 사용합니다.

해당 파일은 `.gitignore`에 등록되어 있어 기본적으로 Git 저장소에 포함되지 않습니다.

### File Structure

#### Root Fields

| Field | Description |
|:--|:--|
| `version` | 저장 형식 버전. 현재 `1` |
| `updatedAt` | 마지막 저장 시각 (UTC) |
| `nickname` | V-ARCHIVE 닉네임 |
| `suppressedKeys` | 삭제한 플레이의 중복 수집 방지 지문 |
| `songs` | 곡 데이터 배열 |

`suppressedKeys`는 다음 형식의 문자열을 사용합니다.

```text
버튼|난이도|곡 이름|점수|시:분:초
```

삭제한 플레이가 LIVE 로그를 통해 다시 추가되는 것을 방지하기 위한 식별자이며, 실제 성적 목록은 아닙니다.

#### Song Fields

`songs` 배열의 각 요소는 하나의 곡을 나타냅니다.

| Field | Description |
|:--|:--|
| `title` | V-ARCHIVE 곡 번호. 모르는 경우 `null` |
| `name` | 곡 이름 |
| `composer` | 작곡가 |
| `dlcCode` | DLC 코드 |
| `patterns` | 버튼 및 난이도별 채보 데이터 |

#### Pattern Fields

`patterns`는 버튼과 난이도별로 구분됩니다.

```text
patterns
 ├─ 4B
 │   ├─ NM
 │   ├─ HD
 │   ├─ MX
 │   └─ SC
 ├─ 5B
 ├─ 6B
 └─ 8B
```

| Field | Description |
|:--|:--|
| `level` | 채보 레벨 |
| `floor` | 내부 정수형 플로어 |
| `floorName` | 화면에 표시할 플로어 문자열 |
| `score` | 저장된 플레이 중 최고 정확도 |
| `archiveBest` | V-ARCHIVE 최고기록 (HR) |
| `maxCombo` | 대표 기록이 Max Combo인지 여부 |
| `plays` | 개별 플레이 기록. 최근 15판 |
| `dailyBests` | 날짜별 최고기록. 최근 30일 |
| `order` | 사용자가 지정한 정렬 순서. 작을수록 위쪽 |

#### Play Fields

| Field | Description |
|:--|:--|
| `at` | 플레이 시각 |
| `score` | 플레이 정확도 |
| `status` | `미갱신` 또는 `성공` |
| `source` | `live`, `log`, `manual` |
| `maxCombo` | Max Combo 여부. 해당하는 경우에만 존재 |

`0.00%` 플레이는 저장하지 않습니다.

### Example JSON

아래는 데이터 구조를 설명하기 위한 축약 예시이며 실제 플레이 기록은 아닙니다.

```json
{
  "version": 1,
  "updatedAt": "2026-11-12T10:41:00.000Z",
  "nickname": "player",
  "suppressedKeys": [
    "4B|SC|Example|99.5|12:00:00"
  ],
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
              {
                "date": "2026-11-12",
                "score": 99.1,
                "status": "미갱신",
                "source": "live"
              }
            ]
          }
        }
      }
    }
  ]
}
```

> **Note:** `drillMax.json`은 V-ARCHIVE에 직접 가져와 기록을 복원하는 형식이 아닙니다. 곡 이름, 버튼, 난이도, 정확도는 같은 의미로 사용하지만 플레이 시각과 일일 최고기록은 DrillMAX에서만 관리합니다.

⚠️ **Privacy Notice**

기록 파일에는 V-ARCHIVE 닉네임, 곡별 점수, 삭제한 플레이의 지문 등이 포함됩니다.

파일을 다른 사람과 공유하거나 Git 저장소에 포함하기 전에 개인정보와 플레이 기록을 확인해 주세요.

---

## 🛠️ Development

### Requirements

| Dependency | Version |
|:--|:--|
| Node.js | 20+ |
| Rust | Stable |
| MSVC Build Tools | Required |
| WebView2 | Required |

- [Node.js](https://nodejs.org/)
- [Rust](https://rustup.rs/)
- [WebView2](https://developer.microsoft.com/microsoft-edge/webview2/)

### Installation

```bash
npm install
```

### Development Commands

```bash
# 화면과 브리지 실행 (V-ARCHIVE 통신 지원)
npm run dev:app

# 화면만 실행 (브리지 미포함, LIVE 미지원)
npm run dev

# Windows 설치본 빌드
npm run pack
```

빌드 결과물:

```text
src-tauri/target/release/bundle/nsis/
```

최신 배포본은 [GitHub Releases](https://github.com/jinthek123/DrillMAX/releases)에서 확인할 수 있습니다.

변경 사항은 [CHANGELOG](./CHANGELOG.md)와 Git 커밋 기록을 참고해 주세요.

---

## 🐛 Bug Reports & Support

문제가 발생하거나 개선 의견이 있다면 GitHub Issues에 등록해 주세요.

가능하다면 다음 정보를 함께 남겨 주세요.

- 문제 재현 방법
- 화면 캡처
- DrillMAX 버전
- V-ARCHIVE 버전

👉 [Open an Issue](https://github.com/jinthek123/DrillMAX/issues)

---

## 📜 License & Credits

### License

본 저장소의 코드는 [GNU General Public License v3.0](./LICENSE)을 따릅니다.

DJMAX RESPECT V 및 V-ARCHIVE 관련 명칭과 에셋의 권리는 각 권리자에게 있습니다.

패턴 상수 데이터는 [행이봇 (Hang2bot)](https://hang2bot.vercel.app/)의 데이터를 사용합니다.

### Disclaimer

> **Unofficial Fan-made Tool**
>
> DrillMAX는 네오위즈와 무관하게 제작된 비공식 팬메이드 도구입니다.
>
> DJMAX RESPECT V 및 관련 상표·저작물의 권리는 (주)네오위즈에 있습니다.

### Special Thanks

- [V-ARCHIVE](https://v-archive.net/)
- [행이봇 (Hang2bot)](https://hang2bot.vercel.app/)

---

<p align="center">
  <strong>DrillMAX</strong>
  <br />
  <sub>Every play counts. Every 0.01% matters.</sub>
  <br /><br />
  <a href="https://github.com/jinthek123/DrillMAX/releases">Download</a>
  ·
  <a href="https://github.com/jinthek123/DrillMAX/issues">Feedback</a>
  ·
  <a href="./CHANGELOG.md">Changelog</a>
</p>
