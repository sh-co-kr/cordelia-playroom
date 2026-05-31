# Hotel Cordelia Playroom

Hotel Cordelia 플레이룸 사용자 화면과 관리자 대시보드입니다. 사용자 화면에서 4자리 숫자를 입력하면 체크인 화면으로 이동합니다.

## 로컬 실행

```bash
npm run dev
```

- 사용자 화면: `http://localhost:4173`
- 관리자 화면: `http://localhost:4173/admin.html`

관리자 화면도 4자리 숫자를 입력하면 대시보드로 이동합니다. 정적 페이지이므로 실제 운영 인증은 Cloudflare Access 또는 별도 백엔드 인증을 붙이는 구성이 필요합니다.

## Cloudflare Pages 배포

- GitHub repository: `sh-co-kr/cordelia-playroom`
- Production branch: `main`
- Framework preset: `None`
- Build command: `npm run build`
- Build output directory: `dist`
- Environment variables: 없음

Cloudflare Dashboard에서 `Workers & Pages` -> `Create` -> `Pages` -> `Connect to Git` 순서로 이동한 뒤 위 설정을 입력합니다.

정적 HTML/CSS/JS만 사용하므로 별도 런타임 의존성이 없습니다.

## 운영 전 확인 사항

현재 객실 상태와 이용 내역은 브라우저의 `localStorage`에 저장됩니다. 즉, 같은 브라우저에서는 사용자 화면과 관리자 화면이 상태를 공유하지만, 서로 다른 기기나 브라우저 사이에서는 데이터가 공유되지 않습니다.

실제 호텔 운영용으로 여러 기기에서 동시에 사용하려면 Cloudflare Workers + D1 또는 KV 같은 서버 저장소를 연결해야 합니다. 관리자 화면은 정적 PIN만으로 보호되지 않으므로 Cloudflare Access로 `/admin.html` 접근을 제한하는 구성이 필요합니다.
