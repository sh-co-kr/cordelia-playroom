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

- Build command: `npm run build`
- Build output directory: `dist`
- Framework preset: `None`

정적 HTML/CSS/JS만 사용하므로 별도 런타임 의존성이 없습니다.
