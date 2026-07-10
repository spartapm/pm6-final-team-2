# ALLBLU Supabase 설정

## 1. SQL 적용
Supabase Dashboard → SQL Editor에서 [`supabase/schema.sql`](../supabase/schema.sql) 전체를 실행합니다.

## 2. Auth 설정 (MVP)
Authentication → Providers → Email  
- **Confirm email: OFF** (켜져 있으면 가입 직후 로그인 불가)

## 3. 클라이언트 키
URL / anon key는 [`src/lib/supabase.ts`](../src/lib/supabase.ts)에 하드코딩되어 있습니다.  
환경변수(`.env.local`)는 사용하지 않습니다.

## 4. 작품 데이터
작품은 DB에 없습니다. 소스는 Google Sheet입니다.

- Sheet: https://docs.google.com/spreadsheets/d/1ZrLSqkNDWugAl2iLuAnQzihYjSg2wXOEzuxDWkyy4yQ
- 공유: **링크가 있는 모든 사용자 → 보기** 필요
- 동기화: `npm run generate:works` → `src/lib/works.data.json` 생성
  - 작품 + 일정/연재요일/이용등급/시청URL/STAFF/장르/태그/제작사 조인
  - 로컬 CSV 캐시: `data/*.csv`
- 유저 테이블의 `work_id`는 Sheet `content_id` (`A0001`, `W0001` …)를 사용합니다.

## 5. 확인
1. `npm run dev` (port 3502)
2. 회원가입 (닉네임 + 이메일 + 비밀번호)
3. 작품 상태 지정 → 평가 작성 → 올블픽 작성
