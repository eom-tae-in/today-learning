# Today Learning

매일 배운 내용을 TIL로 기록하고, 쉬운 요약과 원문으로 다시 읽는 개인 학습 블로그입니다.

[Today Learning 페이지](https://eom-tae-in.github.io/today-learning/)

## 기록과 화면

- `TIL/YYYY/MM/YYYY-MM-DD.md`: 사람이 작성한 원문
- `posts.json`: 제목, 목록용 설명, 태그, 상세 요약과 원문 경로
- 홈: 학습 로그(잔디)와 최근 기록 6개, 전체 기록 보기
- 기록 목록(`/records/`): 검색어·연도·태그 조건(자주 쓴 태그 8개, 태그 전체 보기)과 월별 목록, 이전 기록 더 보기
- 상세 페이지: **한눈에 보기** 카드와 **TIL 원문**이 이어지는 한 페이지, 목차·글자 크기·소주제 접기와 코드·표 읽기 조작
- 테마: **Light · Dark · Green**, 선택한 테마를 기억하며 첫 방문에는 운영체제 설정 적용
- 요약: 비전공자도 이해할 수 있는 전체 설명과 2~5개의 내용 흐름 문단
- 잔디: 해당 날짜의 TIL 있음 / 없음. 기록된 날짜를 누르면 원문 페이지로 이동

## 개발

```bash
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Astro가 정적 페이지를 생성합니다. GitHub Pages의 기본 경로는 `/today-learning/`입니다.
TIL은 GitHub Flavored Markdown으로 작성하며 표, 이미지, 코드 하이라이트와 Mermaid를 지원합니다.
코드 블록의 `title="파일명"`과 `{줄 범위}` 강조, `↓`로 시작하는 줄이 있는 `text` 흐름도, `> [!NOTE]`·`> [!TIP]`·`> [!WARNING]` 알림은 전용 화면 요소로 표시됩니다.

## 요약 갱신

자동 생성은 TIL 내용만 입력으로 사용하며 `posts.json`을 갱신합니다.
`OPENAI_API_KEY`는 로컬 환경 또는 GitHub Actions Secret으로 설정합니다.

```bash
# 특정 날짜
SUMMARY_DATE=2026-10-06 node scripts/github/main.js

# 전체 TIL의 요약 재생성
node scripts/github/main.js --all
```

일반 실행은 직전 커밋의 TIL 변경을 처리합니다.
CI에서는 push 전후 커밋 범위의 변경을 처리하므로 여러 커밋을 한 번에 push해도 포함됩니다.
TIL 삭제는 해당 날짜의 인덱스를 제거하고, 이름 변경은 이전·새 날짜를 처리합니다.

## 배포

main의 TIL, 사이트 코드, 요약 프롬프트 또는 설정 변경에 GitHub Actions가 실행됩니다.
요약 갱신 → 테스트 → 정적 빌드가 모두 성공하면 `posts.json` 변경을 main에 커밋한 뒤 GitHub Pages에 배포합니다.
실행은 취소되지 않고 순서대로 처리되며, TIL은 있지만 `posts.json`에 없는 날짜는 다음 실행에서 자동으로 요약됩니다.
워크플로 수동 실행에서는 갱신할 날짜를 지정할 수 있습니다.
