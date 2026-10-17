# VolumeEye

[VolumeEye](https://volumeeye.ddunddunlabs.com) · [GitHub Pages](https://sysscalper.github.io/volumeeye/)

주식·국내코인·바이낸스의 일별 현물 거래대금을 비교하는 정적 웹사이트입니다. 로그인이나 웹 서버, 클라우드 DB 없이 로컬 수집기에서 집계한 숫자를 공개합니다.

## 로컬 실행

Node.js 22 이상에서 별도 패키지 설치 없이 실행합니다.

```sh
npm run dev
```

`http://localhost:5173`에서 확인합니다. `npm run check`는 JavaScript 구문 및 데이터 계약을 검사하고, `npm run build`는 `dist/`에 정적 파일을 생성합니다.

## 운영 흐름

1. 로컬 WinForms 수집기에서 최근 시세 수집 또는 누락 백필을 완료합니다.
2. **자금흐름 분석 → 웹 데이터 갱신**을 누릅니다.
3. 차트와 공유하는 일별 집계·원화 환산 코드로 모든 시장의 확정 데이터를 내보냅니다.
4. 웹 저장소의 `public/data/market-daily.json`만 커밋하고 `main`에 push합니다.
5. `.github/workflows/pages.yml`이 데이터를 검증하고 빌드하여 GitHub Pages에 배포합니다.
6. WinForms에 업로드와 배포의 성공·실패를 구분해 표시합니다.

데이터가 같고 갱신 시각만 바뀐 경우 새 커밋을 만들지 않습니다. 다른 웹 코드의 미커밋 변경이나 미게시 커밋이 있으면 자동 게시를 중단합니다. 원격의 새 웹 코드는 변경이 없는 로컬 저장소에서 fast-forward로 받아옵니다. 업로드 실패로 남은 JSON 커밋은 재시도할 수 있습니다.

WinForms의 **웹 설정**에서 이 웹 저장소의 로컬 폴더를 지정합니다. 기본 경로는 `C:\Source\VolmueEye`입니다. Windows에서 Git이 설치되어 있고 `sysscalper/volumeeye` 저장소에 push할 수 있도록 인증되어 있어야 합니다. 인증 정보는 Windows Git 자격 증명 관리자가 관리하며 웹 저장소나 JSON에 저장하지 않습니다. 앱의 경로·마지막 게시 결과는 `%LOCALAPPDATA%\VolumeEye\web-publishing.json`에 저장됩니다.

## 공개 데이터 계약

파일은 날짜순 전체 이력이며, 과거 정정도 전체 교체로 반영합니다. 현재 공개 파일은 실제 로컬 분석 기록에서 생성했습니다. 시장별 수집 종료일은 다를 수 있으므로 카드에 각각의 기준일을 표시합니다.

```json
{
  "schemaVersion": 1,
  "isSample": false,
  "updatedAt": "2026-10-17T18:00:00+09:00",
  "metadata": {
    "unit": "KRW",
    "marketType": "spot",
    "sources": "원본 데이터 출처",
    "dateBoundary": "시장별 하루의 집계 시간대",
    "conversion": "원화 환산 기준",
    "coverage": "수집 범위 및 누락 설명"
  },
  "rows": [
    {
      "date": "2026-10-16",
      "kospi": 14000000000000,
      "kosdaq": 7600000000000,
      "upbit": 1900000000000,
      "bithumb": 1400000000000,
      "binance": 11100000000000
    }
  ]
}
```

위 숫자는 형식 예시입니다. 값은 원 단위의 0 이상 안전한 정수 또는 `null`입니다. 모든 시장 키가 필요합니다. 휴장·미수집은 `null`, 실제 거래대금 0은 `0`입니다. 날짜는 유효한 `yyyy-MM-dd`, 중복 없이 오름차순입니다. `updatedAt`은 시간대를 포함합니다.

- `FINAL` 상태만 공개하며 진행 중인 주식 KST 거래일과 코인 UTC 일봉을 제외합니다.
- 주식 합계 = 코스피 + 코스닥. 국내코인 합계 = 업비트 + 빗썸. 하나라도 null이면 합계도 null입니다.
- 바이낸스는 별도 현물 시장입니다. 저장된 KRW 환산값을 우선하며, USDT 원본만 있는 경우 기존 수집기의 고정 환율 **1 USDT = 1,200원**을 사용합니다. 실시간 환율이 아닙니다.
- 코인 데이터는 수집된 현물 종목의 합계로, 수집 범위와 공백에 따라 거래소 전체 거래대금과 다를 수 있습니다.
- 거래대금은 자금의 순유입액을 뜻하지 않습니다.

검증 코드는 브라우저와 배포 작업이 `public/data-contract.js`를 공유합니다. 샘플을 다시 만들려면 `node scripts/generate-sample.mjs`를 실행할 수 있지만, **실제 공개 데이터를 샘플로 덮어쓰므로 시연용 복사본에서만 실행하세요.**

## 배포 설정

GitHub 저장소 Settings → Pages의 Source를 **GitHub Actions**로 설정합니다. `main` 변경 또는 workflow 수동 실행으로 배포합니다. `dist/`는 빌드 산출물이며 Git에 커밋하지 않습니다. 빌드나 검증 실패 시 이전 정상 배포가 유지됩니다.

커스텀 도메인은 Pages 설정에 등록한 후 Cloudflare DNS에 다음 레코드를 추가합니다.

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | volumeeye | sysscalper.github.io | DNS only |

DNS 확인 후 Pages의 **Enforce HTTPS**를 켭니다. `ddunddunlabs.com`의 다른 레코드를 바꿀 필요는 없습니다. 커스텀 도메인 활성화 후 기본 Pages 주소는 해당 도메인으로 연결됩니다.

## 기능

- 합계·개별 시장 독립 선택과 그룹 접기
- 상단에는 코스피·코스닥·업비트·빗썸·바이낸스 지표를 고정 표시
- 기간 프리셋, 시작·종료 날짜, 마우스 휠 확대와 드래그 이동
- 더블 클릭으로 6개월 복원, 가로·세로 십자선과 날짜별 툴팁
- 점 그래프(기본)·선 그래프 전환, 거래대금은 항상 조 원 기준
- 화면 높이에 맞춰 차트가 남은 공간을 채움 (최소 300px, 최대 2160px)
- 모바일 기간·날짜 입력
