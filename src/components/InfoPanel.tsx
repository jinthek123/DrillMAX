import addChart from '../assets/info/add-chart.png'
import apiKey from '../assets/info/api-key.png'
import buttonFilters from '../assets/info/button-filters.png'
import dataFolder from '../assets/info/data-folder.png'
import hangSync from '../assets/info/hang-sync.png'
import importLog from '../assets/info/import-log.png'
import liveOn from '../assets/info/live-on.png'
import overviewKpis from '../assets/info/overview-kpis.png'
import recordPlay from '../assets/info/record-play.png'
import reroll from '../assets/info/reroll.png'
import songSearch from '../assets/info/song-search.png'
import sortSelect from '../assets/info/sort-select.png'
import tabChart from '../assets/info/tab-chart.png'
import tabHang from '../assets/info/tab-hang.png'
import tabOverview from '../assets/info/tab-overview.png'
import themeLight from '../assets/info/theme-light.png'
import updateCheck from '../assets/info/update-check.png'
import type { ReactNode } from 'react'
import { Hang2botName } from './Hang2botName'

function Shot({
  image,
  title,
  children,
}: {
  image: string
  title: string
  children: string
}) {
  return (
    <article className="info-shot">
      <div className="info-figure">
        <img src={image} alt="" />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  )
}

function Group({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="info-group">
      <h2>{title}</h2>
      <div className="info-shots">{children}</div>
    </section>
  )
}

export function InfoPanel() {
  return (
    <main className="main info-main">
      <header className="main-head">
        <div>
          <p className="eyebrow">INFO</p>
          <h1>사용 방법</h1>
        </div>
      </header>
      <div className="info-groups">
        <Group title="사이드바">
          <Shot image={liveOn} title="LIVE">
            누르면 V-ARCHIVE 로그 수신을 켜거나 끕니다. 브리지와 클라이언트가 연결되면 LIVE ON이 됩니다. 아래 글자는 꺼짐, 브리지 대기, 클라이언트 미감지, 수신중 중 하나입니다.
          </Shot>
          <Shot image={recordPlay} title="기록 시작">
            누르면 플레이 기록을 시작합니다. 켜지면 노란 세모 대신 깜빡이는 점이 됩니다. 끈 동안의 플레이는 나중에 채워 넣지 않습니다.
          </Shot>
          <Shot image={themeLight} title="라이트/다크">
            밝은 화면으로 바꿉니다. 밝은 화면에서는 글자가 다크로 바뀌고, 누르면 다시 어두운 화면이 됩니다.
          </Shot>
          <Shot image={addChart} title="차트 추가">
            곡 이름, 버튼, 패턴을 골라 왼쪽 목록에 넣습니다.
          </Shot>
          <Shot image={apiKey} title="API 키 설정">
            V-ARCHIVE Open API 토큰을 저장하고, 그 계정의 기존 최고기록을 불러옵니다.
          </Shot>
          <Shot image={updateCheck} title="Update 확인">
            공개 저장소의 최신 설치본을 확인합니다. 더 새 버전이 있으면 설치 파일을 받습니다.
          </Shot>
        </Group>
        <Group title="전체 성과">
          <Shot image={tabOverview} title="전체 성과">
            넣어 둔 곡을 한 화면에서 비교하는 탭입니다.
          </Shot>
          <Shot image={overviewKpis} title="위 숫자">
            차트 수, 플레이 수, 100%인 PP, 100%가 아닌 Max Combo인 MC, 99.9% 이상, 99.8% 이상입니다. 99.9% 기록은 99.8에도 들어갑니다.
          </Shot>
          <Shot image={buttonFilters} title="버튼 필터">
            전체 또는 4B, 5B, 6B, 8B만 카드에 보여 줍니다.
          </Shot>
          <Shot image={songSearch} title="곡 제목 검색">
            적은 글자가 들어간 곡만 남깁니다.
          </Shot>
          <Shot image={sortSelect} title="정렬">
            사용자 지정 순서, 대시보드 순서, 최근 플레이, 가장 오래된 플레이, 플레이 많은 순, 미갱신 많은 순, 기록 갱신 폭 높은 순, 기록 갱신 폭 낮은 순, 이름 중에서 고릅니다. 갱신 폭은 마지막으로 기록을 넘긴 점수 차이입니다. 카드나 왼쪽 목록의 손잡이를 끌면 사용자 지정 순서로 저장됩니다. 목록 끝에서 계속 끌면 그 방향으로 더 스크롤됩니다.
          </Shot>
          <Shot image={importLog} title="로그 가져오기">
            V-ARCHIVE 로그를 붙여 넣어 기록을 추가합니다.
          </Shot>
          <Shot image={dataFolder} title="데이터 폴더">
            성적이 저장되는 drillMax.json 폴더를 바꿉니다.
          </Shot>
        </Group>
        <Group title="단일 곡 기록">
          <Shot image={tabChart} title="단일 곡 기록">
            전체 성과 카드에서 고른 곡의 기록과 그래프를 보는 탭입니다. 왼쪽 목록은 지금 탭을 유지한 채 그 곡으로 옮깁니다. 위 HR은 최고 정확도이고, Current는 가장 최근 플레이입니다.
          </Shot>
        </Group>
        <Group
          title={
            <>
              <Hang2botName /> x DrillMAX
            </>
          }
        >
          <Shot image={tabHang} title="행이봇 x DrillMAX">
            곡을 좌우로 넘기며 가운데 곡을 기준으로 추천곡과 쉬는곡을 보는 탭입니다. 왼쪽 목록에서 고르면 그 곡이 가운데로 옵니다. 계단 옆 숫자는 상수이고, 괄호는 가운데 곡과의 차이입니다.
          </Shot>
          <Shot image={reroll} title="다시 뽑기">
            추천곡과 쉬는곡 제목 오른쪽에 있습니다. 그 목록만 다시 뽑습니다. 곡을 바꾸면 처음 목록으로 돌아갑니다.
          </Shot>
          <Shot image={hangSync} title="최신 행이봇 상수 불러오기">
            하루에 한 번 최신 상수를 확인합니다. 이미 최신이면 다시 받지 않고, 실패하면 그날은 다시 누를 수 없으며 기존 상수를 유지합니다.
          </Shot>
        </Group>
      </div>
      <footer className="info-legal">
        <p>DJMAX RESPECT V 및 관련 상표·저작물의 권리는 (주)네오위즈에 있습니다.</p>
        <p>V-ARCHIVE, 행이봇 관련 명칭과 에셋의 권리는 각 권리자의 권한 설정을 따릅니다.</p>
      </footer>
    </main>
  )
}
