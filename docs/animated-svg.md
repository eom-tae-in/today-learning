# TIL 애니메이션 SVG 작성

SVG 파일 하나를 Obsidian에서는 이미지로, 사이트에서는 본문 SVG로 표시합니다.
사이트는 Shadow DOM으로 스타일과 ID를 격리하고 재생·확대 기능을 제공합니다.

## 저장과 참조

파일: `public/attachments/YYYY-MM-DD/설명.svg`

`TIL/YYYY/MM/YYYY-MM-DD.md` 본문에서 이미지 한 개를 독립 문단으로 참조합니다.

```markdown
![빌드 과정 설명](../../../public/attachments/YYYY-MM-DD/build-flow.svg)
```

파일명은 영문 소문자와 하이픈을 권장합니다. SVG를 코드 블록에 넣거나
웹 주소에 `/public/`를 넣지 않습니다. 사이트 원본 링크는 자동으로
`/today-learning/attachments/...`가 됩니다. `![[...]]`는 지원하지 않습니다.
누락 파일, 잘못된 XML, 지원하지 않는 요소는 글과 첨부 경로를 포함해 빌드를 실패시킵니다.

## SVG 계약

- `xmlns="http://www.w3.org/2000/svg"`, 유효한 `viewBox`, `title`, `desc`를 포함합니다.
- 외부 리소스, JavaScript, 이벤트 속성, HTML/foreignObject, DTD를 사용하지 않습니다.
- CSS keyframes와 `animate`, `animateTransform`, `animateMotion`, `set`을 지원합니다.
- SMIL의 `begin`/`end`는 숫자 시간 또는 `indefinite`만 사용합니다. 클릭·다른 요소 ID로 시작하는 애니메이션은 사용하지 않습니다.
- CSS는 SVG 표현과 애니메이션 속성만 사용합니다. `!important`, `@import`, `@font-face`, `:host`는 지원하지 않습니다.
- 그라데이션·마스크·경로 참조는 같은 파일의 `#id`만 사용합니다. ID는 파일 안에서 고유해야 합니다.
- 중첩 `svg` 대신 `g`로 그룹화합니다. 하나의 SVG 시계로 재생을 제어합니다.
- 기본 글꼴과 자체 배경색을 사용해 Obsidian과 사이트의 테마에 관계없이 읽히게 만듭니다.
- 휴대폰에서 읽을 수 있는 크기로 만들고 복잡한 도식은 나눕니다. 세로 흐름을 권장합니다.
- 단계마다 읽을 시간을 두고, 이동·현재 단계 강조·결과 등장을 연결합니다. 마지막 결과를 잠시 유지합니다.
- 멈춘 첫 화면에서도 단계와 핵심 설명이 보이게 합니다. 모션 감소 환경에서는 자동 재생하지 않고 재생 버튼을 제공합니다.

사이트는 화면 밖·접힌 영역·숨겨진 탭에서 일시정지합니다. 직접 일시정지한
상태는 스크롤로 해제되지 않습니다. 확대 시 같은 SVG를 이동하고 CSS/SMIL
시각을 복원합니다. JavaScript를 사용할 수 없으면 원본 이미지로 표시합니다.

## 예제

- 파일: `public/attachments/examples/build-flow.svg`
- Markdown: `docs/examples/animated-svg.md`
- 실행 화면: `/today-learning/examples/animated-svg/`

## 검증 실행

```bash
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4322
```

미리보기 서버를 실행한 상태에서 별도 터미널로 브라우저 회귀 검사를 실행합니다.

```bash
# 설치된 Google Chrome 사용
SVG_QA_BROWSER=chrome npm run test:svg

# Playwright Chromium을 설치한 환경
npm run test:svg
```

기본 검사 주소는 `http://127.0.0.1:4322/today-learning/`입니다.
다른 주소는 `SVG_QA_URL`로 지정합니다. 검사는 실제 빌드 페이지를 열어
완료된 CSS 애니메이션과 반복 애니메이션이 섞인 경우의 확대·복귀·재시작,
같은 요소의 중복 애니메이션 이름, 모바일·데스크톱의 밝은·어두운 테마,
SVG 재생·일시정지, 모바일 확대 크기, 모션 감소 설정과 첨부 URL을 확인합니다.

## 저장소 밖 maker 프롬프트에 추가할 규칙

저장소에는 TIL 원문 생성용 maker가 없습니다. 아래 규칙을 실제 maker에 추가합니다.
`prompts/github/summarize.md`는 posts.json 요약용이므로 이 규칙을 넣지 않습니다.

> 시간 순서, 데이터 이동, 상태 전환을 설명할 때 이해에 도움이 되는 경우에만
> 독립 SVG를 함께 생성한다. 위 SVG 계약을 준수하며 외부 리소스와 JavaScript를
> 사용하지 않는다. 파일은 public/attachments/YYYY-MM-DD/에 실제로 저장하고,
> 본문에는 ../../../public/attachments/YYYY-MM-DD/파일명.svg를 표준 Markdown
> 이미지 문법으로 독립 문단에 참조한다. 애니메이션만으로 정보를 전달하지 말고
> 본문과 SVG의 단계 이름으로도 과정을 설명한다. 파일을 만들지 못했다면
> 존재하는 파일처럼 참조하지 않는다. 작성 후 로컬 예제와 빌드에서 확인한다.
