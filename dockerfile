# 1. Node.js 이미지를 기반으로 설정
FROM node:20-alpine

# 2. 작업 디렉토리 설정
WORKDIR /app

RUN apk add --no-cache openssl

# 3. 패키지 파일 복사 및 설치
COPY package*.json ./
# bcrypt 등 네이티브 모듈 컴파일을 위해 필요한 도구 설치 (필요시)
# RUN apk add --no-cache python3 make g++
RUN npm install

# 4. 소스 코드 복사
COPY . .

# 5. Prisma 클라이언트 생성 (DB 연결용)
RUN npx prisma generate

# 6. TypeScript 빌드 (ts -> js)
RUN npm run build

# 7. 포트 개방
EXPOSE 4000

# 8. 실행 명령어
CMD ["npm", "run", "start"]